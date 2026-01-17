# Complete Implementation Example

## Table of Contents

1. [Full Arc-Length Animation System](#full-arc-length-animation-system)
2. [Track Management](#track-management)
3. [React Hooks Implementation](#react-hooks-implementation)
4. [MapLibre Integration](#maplibre-integration)
5. [Station Progress Tracking](#station-progress-tracking)

---

## Full Arc-Length Animation System

### Types

```typescript
// types/animation.ts
import type { Feature, LineString } from 'geojson';
import type maplibregl from 'maplibre-gl';

export interface Track {
  id: string;
  routeId: string;
  direction: 'N' | 'S';
  line: Feature<LineString>;
  totalKm: number;
}

export interface TrainAnimState {
  tripId: string;
  trackId: string;
  routeId: string;
  direction: 'N' | 'S';

  // Arc-length positions (0-1)
  sPrev: number;
  sNext: number;

  // Timestamps
  tPrev: number;
  tNext: number;

  // State
  isDwelling: boolean;

  // MapLibre elements
  marker: maplibregl.Marker;
  popup: maplibregl.Popup;
}

export interface TrainPosition {
  tripId: string;
  routeId: string;
  lat: number;
  lon: number;
  nextStopId: string;
  nextStopName: string;
  eta: string;
  direction: 'N' | 'S';
}
```

### Core Spatial Functions

```typescript
// lib/track-math.ts
import { lineString, point, length, along, nearestPointOnLine } from '@turf/turf';
import type { Feature, LineString } from 'geojson';
import type { Track } from '@/types/animation';

/**
 * Build a Track from coordinates
 */
export function buildTrack(
  id: string,
  routeId: string,
  direction: 'N' | 'S',
  coords: [number, number][]
): Track {
  const line = lineString(coords);
  const totalKm = length(line, { units: 'kilometers' });
  return { id, routeId, direction, line, totalKm };
}

/**
 * Convert lat/lng to normalized position (0-1) along track
 */
export function positionToS(track: Track, lng: number, lat: number): number {
  const pt = point([lng, lat]);
  const snapped = nearestPointOnLine(track.line, pt, { units: 'kilometers' });
  const distAlongKm = snapped.properties!.location as number;
  const s = distAlongKm / track.totalKm;
  return Math.min(1, Math.max(0, s));
}

/**
 * Convert normalized position (0-1) back to coordinates
 */
export function sToCoord(track: Track, s: number): [number, number] {
  const distKm = s * track.totalKm;
  const pt = along(track.line, distKm, { units: 'kilometers' });
  return pt.geometry.coordinates as [number, number];
}

/**
 * Linear interpolation
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Check if train is dwelling (nearly stationary)
 */
export function isDwelling(sPrev: number, sNext: number, threshold = 0.0001): boolean {
  return Math.abs(sNext - sPrev) < threshold;
}

/**
 * Calculate distance along track in kilometers
 */
export function distanceOnTrack(
  track: Track,
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number
): number {
  const s1 = positionToS(track, lng1, lat1);
  const s2 = positionToS(track, lng2, lat2);
  return Math.abs(s2 - s1) * track.totalKm;
}
```

---

## Track Management

### Track Store

```typescript
// stores/trackStore.ts
import { buildTrack } from '@/lib/track-math';
import type { Track } from '@/types/animation';

class TrackStore {
  private tracks = new Map<string, Track>();

  /**
   * Load tracks from GeoJSON
   */
  async loadFromGeoJSON(url: string): Promise<void> {
    const response = await fetch(url);
    const geojson = await response.json();

    geojson.features.forEach((feature: any) => {
      const routeId = feature.properties?.route_id;
      if (!routeId) return;

      const coords = feature.geometry.coordinates;

      // Create northbound track
      const nbId = `${routeId}_N`;
      this.tracks.set(nbId, buildTrack(nbId, routeId, 'N', coords));

      // Create southbound track (reversed coordinates)
      const sbId = `${routeId}_S`;
      this.tracks.set(sbId, buildTrack(sbId, routeId, 'S', [...coords].reverse()));
    });
  }

  /**
   * Get track for a route and direction
   */
  getTrack(routeId: string, direction: 'N' | 'S'): Track | undefined {
    return this.tracks.get(`${routeId}_${direction}`);
  }

  /**
   * Get all tracks
   */
  getAllTracks(): Track[] {
    return Array.from(this.tracks.values());
  }
}

export const trackStore = new TrackStore();
```

---

## React Hooks Implementation

### useTrackAnimation Hook

```typescript
// hooks/useTrackAnimation.ts
import { useRef, useCallback, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { positionToS, sToCoord, lerp, isDwelling } from '@/lib/track-math';
import { trackStore } from '@/stores/trackStore';
import type { Track, TrainAnimState, TrainPosition } from '@/types/animation';

interface UseTrackAnimationOptions {
  refreshInterval: number;  // Expected time between API updates (ms)
}

interface UseTrackAnimationReturn {
  trainAnimsRef: React.MutableRefObject<Map<string, TrainAnimState>>;
  updateTrainPosition: (train: TrainPosition) => void;
  scheduleAnimation: () => void;
}

export function useTrackAnimation(
  map: maplibregl.Map | null,
  mapLoaded: boolean,
  options: UseTrackAnimationOptions
): UseTrackAnimationReturn {
  const trainAnimsRef = useRef<Map<string, TrainAnimState>>(new Map());
  const animationFrameRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);

  // Check if any trains need animation
  const hasMovingTrains = useCallback((): boolean => {
    const now = performance.now();
    for (const anim of trainAnimsRef.current.values()) {
      if (anim.isDwelling) continue;
      const progress = (now - anim.tPrev) / (anim.tNext - anim.tPrev);
      if (progress < 1) return true;
    }
    return false;
  }, []);

  // Animation frame function
  const animateTrains = useCallback(() => {
    const now = performance.now();
    let anyMoving = false;

    trainAnimsRef.current.forEach((anim) => {
      if (anim.isDwelling) return;

      const track = trackStore.getTrack(anim.routeId, anim.direction);
      if (!track) return;

      // Calculate progress (0-1)
      const elapsed = now - anim.tPrev;
      const duration = anim.tNext - anim.tPrev;
      const progress = Math.min(1, Math.max(0, elapsed / duration));

      if (progress < 1) anyMoving = true;

      // Interpolate position
      const sCurrent = lerp(anim.sPrev, anim.sNext, progress);
      const [lng, lat] = sToCoord(track, sCurrent);

      // Update marker
      anim.marker.setLngLat([lng, lat]);
    });

    if (anyMoving) {
      animationFrameRef.current = requestAnimationFrame(animateTrains);
    } else {
      isAnimatingRef.current = false;
    }
  }, []);

  // Schedule animation loop
  const scheduleAnimation = useCallback(() => {
    if (!mapLoaded || !map) return;
    if (isAnimatingRef.current) return;
    if (!hasMovingTrains()) return;

    isAnimatingRef.current = true;
    animationFrameRef.current = requestAnimationFrame(animateTrains);
  }, [mapLoaded, map, hasMovingTrains, animateTrains]);

  // Update train position from API
  const updateTrainPosition = useCallback((train: TrainPosition) => {
    if (!map || !mapLoaded) return;

    const track = trackStore.getTrack(train.routeId, train.direction);
    if (!track) return;

    const now = performance.now();
    const sNew = positionToS(track, train.lon, train.lat);

    const existingAnim = trainAnimsRef.current.get(train.tripId);

    if (existingAnim) {
      // Calculate current interpolated position
      const elapsed = now - existingAnim.tPrev;
      const progress = Math.min(elapsed / options.refreshInterval, 1);
      const sCurrent = lerp(existingAnim.sPrev, existingAnim.sNext, progress);

      // Update animation state
      existingAnim.sPrev = sCurrent;
      existingAnim.sNext = sNew;
      existingAnim.tPrev = now;
      existingAnim.tNext = now + options.refreshInterval;
      existingAnim.isDwelling = isDwelling(sCurrent, sNew);
    } else {
      // Create new marker
      const el = document.createElement('div');
      el.className = 'train-marker';
      el.textContent = train.routeId;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([train.lon, train.lat])
        .addTo(map);

      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
      });

      // Create animation state
      trainAnimsRef.current.set(train.tripId, {
        tripId: train.tripId,
        trackId: `${train.routeId}_${train.direction}`,
        routeId: train.routeId,
        direction: train.direction,
        sPrev: sNew,
        sNext: sNew,
        tPrev: now,
        tNext: now + options.refreshInterval,
        isDwelling: true,  // New trains start as dwelling
        marker,
        popup,
      });
    }

    scheduleAnimation();
  }, [map, mapLoaded, options.refreshInterval, scheduleAnimation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Clean up markers
      trainAnimsRef.current.forEach((anim) => {
        anim.marker.remove();
        anim.popup.remove();
      });
    };
  }, []);

  return {
    trainAnimsRef,
    updateTrainPosition,
    scheduleAnimation,
  };
}
```

---

## MapLibre Integration

### Complete Map Component

```typescript
// components/SubwayMap.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTrackAnimation } from '@/hooks/useTrackAnimation';
import { trackStore } from '@/stores/trackStore';
import type { TrainPosition } from '@/types/animation';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const REFRESH_INTERVAL = 15000;

interface SubwayMapProps {
  trains: TrainPosition[];
}

export function SubwayMap({ trains }: SubwayMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const { trainAnimsRef, updateTrainPosition, scheduleAnimation } = useTrackAnimation(
    map.current,
    mapLoaded,
    { refreshInterval: REFRESH_INTERVAL }
  );

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [-73.985, 40.748],
      zoom: 12,
    });

    map.current.on('load', async () => {
      // Load tracks
      await trackStore.loadFromGeoJSON('/map/subway-lines.geojson');

      // Add subway lines layer
      map.current?.addSource('subway-lines', {
        type: 'geojson',
        data: '/map/subway-lines.geojson',
      });

      map.current?.addLayer({
        id: 'subway-lines',
        type: 'line',
        source: 'subway-lines',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 3,
          'line-opacity': 0.8,
        },
      });

      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update train positions when data changes
  useEffect(() => {
    if (!mapLoaded) return;

    // Remove trains no longer in feed
    const currentTripIds = new Set(trains.map((t) => t.tripId));
    trainAnimsRef.current.forEach((anim, tripId) => {
      if (!currentTripIds.has(tripId)) {
        anim.marker.remove();
        anim.popup.remove();
        trainAnimsRef.current.delete(tripId);
      }
    });

    // Update all train positions
    trains.forEach((train) => {
      updateTrainPosition(train);
    });
  }, [mapLoaded, trains, updateTrainPosition, trainAnimsRef]);

  return (
    <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
  );
}
```

---

## Station Progress Tracking

### Station on Track

```typescript
// lib/station-progress.ts
import { positionToS } from '@/lib/track-math';
import { trackStore } from '@/stores/trackStore';
import type { Track } from '@/types/animation';

interface Station {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

interface StationProgress {
  stationId: string;
  s: number;  // Normalized position on track
}

/**
 * Map all stations to their position on a track
 */
export function mapStationsToTrack(
  stations: Station[],
  routeId: string,
  direction: 'N' | 'S'
): Map<string, number> {
  const track = trackStore.getTrack(routeId, direction);
  if (!track) return new Map();

  const progress = new Map<string, number>();

  stations.forEach((station) => {
    const s = positionToS(track, station.lon, station.lat);
    progress.set(station.id, s);
  });

  return progress;
}

/**
 * Calculate progress between two stations
 */
export function progressBetweenStations(
  currentS: number,
  stationA_S: number,
  stationB_S: number
): number {
  if (stationB_S === stationA_S) return 0;
  const progress = (currentS - stationA_S) / (stationB_S - stationA_S);
  return Math.min(1, Math.max(0, progress));
}

/**
 * Find which station segment the train is in
 */
export function findCurrentSegment(
  currentS: number,
  stationProgress: Map<string, number>
): { prevStation: string; nextStation: string; progress: number } | null {
  const sorted = Array.from(stationProgress.entries())
    .sort((a, b) => a[1] - b[1]);

  for (let i = 0; i < sorted.length - 1; i++) {
    const [prevId, prevS] = sorted[i];
    const [nextId, nextS] = sorted[i + 1];

    if (currentS >= prevS && currentS <= nextS) {
      return {
        prevStation: prevId,
        nextStation: nextId,
        progress: progressBetweenStations(currentS, prevS, nextS),
      };
    }
  }

  return null;
}
```

### Using Station Progress

```typescript
// Example: Display progress in UI
function TrainProgress({ tripId }: { tripId: string }) {
  const anim = trainAnimsRef.current.get(tripId);
  if (!anim) return null;

  const stationProgress = mapStationsToTrack(stations, anim.routeId, anim.direction);
  const segment = findCurrentSegment(anim.sNext, stationProgress);

  if (!segment) return null;

  return (
    <div>
      <div>From: {getStationName(segment.prevStation)}</div>
      <div>To: {getStationName(segment.nextStation)}</div>
      <div>Progress: {Math.round(segment.progress * 100)}%</div>
      <progress value={segment.progress} max={1} />
    </div>
  );
}
```

---

## Summary

This complete implementation provides:

1. **Arc-length parametrization** - Converts lat/lng to 0-1 position along track
2. **Smooth animation** - Linear interpolation between API updates
3. **Dwelling detection** - Pauses animation when trains are stopped
4. **Direction handling** - Separate tracks for northbound/southbound
5. **React integration** - Hooks for use in React components
6. **Station progress** - Track progress between stations

The key insight is treating each track as a 1D number line (s ∈ [0, 1]) where every position (trains, stations) is just a scalar value. This eliminates coordinate math during animation and enables smooth interpolation along the actual track geometry.

---

**Related:** [maplibre-api.md](maplibre-api.md) | [turf-spatial.md](turf-spatial.md) | [animation-patterns.md](animation-patterns.md)
