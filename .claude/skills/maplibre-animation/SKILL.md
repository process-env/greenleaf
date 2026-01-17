---
name: maplibre-animation
description: MapLibre GL JS patterns for real-time vehicle tracking with smooth arc-length interpolation along polyline tracks. Covers Turf.js integration for nearestPointOnLine, along, and length functions. Train/vehicle animation using normalized track positions (0-1), requestAnimationFrame loops, marker management, GeoJSON sources, and the mental model of treating geometry as a 1D progress variable. Use when animating markers along paths, eliminating teleport jumps, or building transit tracking maps.
version: "2.0.0"
lastUpdated: "2026-01-11"
frameworkVersions:
  maplibre-gl: "5.x"
---

# MapLibre Animation & Real-Time Tracking

> **Updated 2026-01-11:** MapLibre GL v5.x compatible. Added CJK font rendering improvements and video export plugin mention. This skill is the recommended alternative for TomTom Web SDK (deprecated Feb 2026).

## Purpose

Complete guide for building smooth real-time vehicle tracking on MapLibre GL JS maps. Eliminates marker "teleporting" by using arc-length parametrization along track polylines. Integrates Turf.js for spatial calculations.

## When to Use This Skill

Automatically activates when working on:
- Animating markers along paths/routes
- Real-time train/vehicle tracking
- Smooth interpolation between position updates
- MapLibre marker or GeoJSON point animation
- Arc-length calculations on polylines
- Turf.js integration with maps

---

## Mental Model: The 1D Track Progress Variable

**The Problem:** API updates come every 15-30 seconds. Moving a marker directly to new lat/lng causes jarring "teleport" jumps.

**The Solution:** Treat each track as a 1D number line from 0 to 1.

```
Track Polyline: [[lon,lat], [lon,lat], ...] → parametrized as s ∈ [0, 1]

s = 0  →  Start of track (e.g., first station)
s = 1  →  End of track (e.g., terminal station)

Every station and train is just a value of s on this line.
```

**The Algorithm:**
1. API update arrives with lat/lng
2. Map lat/lng → `s_new` (normalized position 0-1)
3. Animate from `s_old` → `s_new` using linear interpolation
4. Convert animated `s` back to lat/lng on the curve
5. Update marker position

**Result:** Smooth constant-speed motion along the actual track path.

---

## Quick Start

### Installation

```bash
npm install maplibre-gl @turf/turf
# or individual packages:
npm install @turf/length @turf/along @turf/nearest-point-on-line @turf/helpers
```

### Core Types

```typescript
import type { Feature, LineString, Point } from 'geojson';

interface Track {
  id: string;
  line: Feature<LineString>;
  totalKm: number;
}

interface TrainAnimState {
  trackId: string;
  sPrev: number;      // Previous normalized position (0-1)
  sNext: number;      // Target normalized position (0-1)
  tPrev: number;      // Timestamp of previous update (ms)
  tNext: number;      // Expected timestamp of next update (ms)
  marker: maplibregl.Marker;
}
```

### Build a Track (Once Per Route)

```typescript
import { lineString, length } from '@turf/turf';

function buildTrack(id: string, coords: [number, number][]): Track {
  const line = lineString(coords);
  const totalKm = length(line, { units: 'kilometers' });
  return { id, line, totalKm };
}

// Example: Build from GeoJSON feature
const track = buildTrack('1_northbound', feature.geometry.coordinates);
```

---

## Turf.js Functions Reference

### `length()` - Total Track Distance

```typescript
import { length, lineString } from '@turf/turf';

const line = lineString([
  [-74.006, 40.714],  // Start
  [-74.002, 40.720],
  [-73.998, 40.725],  // End
]);

const totalKm = length(line, { units: 'kilometers' });
// Returns: total arc length in km
```

### `nearestPointOnLine()` - Map Point to Track

```typescript
import { nearestPointOnLine, point } from '@turf/turf';

const pt = point([-74.001, 40.718]);  // Train's reported position
const snapped = nearestPointOnLine(track.line, pt, { units: 'kilometers' });

// Returns Feature<Point> with properties:
// - location: distance along line from start (km)
// - dist: perpendicular distance from line (km)
// - index: segment index where point was found
```

### `along()` - Convert Distance to Coordinates

```typescript
import { along } from '@turf/turf';

const distKm = 2.5;  // Distance along line
const pt = along(track.line, distKm, { units: 'kilometers' });

// Returns Feature<Point> at that distance along the line
const [lng, lat] = pt.geometry.coordinates;
```

---

## Core Implementation

### Position to Normalized S (0-1)

```typescript
function positionToS(track: Track, lng: number, lat: number): number {
  const pt = point([lng, lat]);
  const snapped = nearestPointOnLine(track.line, pt, { units: 'kilometers' });
  const distAlongKm = snapped.properties!.location as number;
  const s = distAlongKm / track.totalKm;
  return Math.min(1, Math.max(0, s));  // Clamp to [0, 1]
}
```

### Normalized S (0-1) to Coordinates

```typescript
function sToCoord(track: Track, s: number): [number, number] {
  const distKm = s * track.totalKm;
  const pt = along(track.line, distKm, { units: 'kilometers' });
  return pt.geometry.coordinates as [number, number];
}
```

### Linear Interpolation (Lerp)

```typescript
function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}
```

---

## Animation Loop Pattern

### Update on API Response

```typescript
function onPositionUpdate(train: TrainAnimState, track: Track, lng: number, lat: number) {
  const now = performance.now();
  const sNew = positionToS(track, lng, lat);

  // Shift: current becomes previous, new becomes target
  train.sPrev = train.sNext ?? sNew;
  train.tPrev = train.tNext ?? now;
  train.sNext = sNew;
  train.tNext = now + REFRESH_INTERVAL;  // e.g., 15000ms
}
```

### Animation Frame Loop

```typescript
function animateTrains(trains: Map<string, TrainAnimState>, tracks: Map<string, Track>) {
  const now = performance.now();

  trains.forEach((train) => {
    const track = tracks.get(train.trackId);
    if (!track) return;

    const { sPrev, sNext, tPrev, tNext } = train;

    // Calculate progress (0-1) over the update interval
    const alpha = Math.max(0, Math.min(1, (now - tPrev) / (tNext - tPrev)));

    // Interpolate along the track
    const sCurrent = lerp(sPrev, sNext, alpha);

    // Convert back to coordinates
    const [lng, lat] = sToCoord(track, sCurrent);

    // Update marker
    train.marker.setLngLat([lng, lat]);
  });

  requestAnimationFrame(() => animateTrains(trains, tracks));
}
```

---

## MapLibre Integration

### Marker Approach (Few Trains)

```typescript
import maplibregl from 'maplibre-gl';

function createTrainMarker(map: maplibregl.Map, routeId: string): maplibregl.Marker {
  const el = document.createElement('div');
  el.className = 'train-marker';
  el.textContent = routeId;

  return new maplibregl.Marker({ element: el }).addTo(map);
}

// Update in animation loop:
marker.setLngLat([lng, lat]);
```

### GeoJSON Source Approach (Many Trains)

```typescript
// Add source once
map.addSource('trains', {
  type: 'geojson',
  data: { type: 'FeatureCollection', features: [] }
});

map.addLayer({
  id: 'trains-layer',
  type: 'circle',
  source: 'trains',
  paint: {
    'circle-radius': 8,
    'circle-color': ['get', 'color'],
  }
});

// Update in animation loop:
function updateTrainSource(trains: Map<string, TrainAnimState>, tracks: Map<string, Track>) {
  const features = Array.from(trains.entries()).map(([id, train]) => {
    const track = tracks.get(train.trackId)!;
    const alpha = /* calculate progress */;
    const s = lerp(train.sPrev, train.sNext, alpha);
    const [lng, lat] = sToCoord(track, s);

    return {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [lng, lat] },
      properties: { id, routeId: train.routeId, color: train.color }
    };
  });

  (map.getSource('trains') as maplibregl.GeoJSONSource).setData({
    type: 'FeatureCollection',
    features
  });
}
```

---

## Performance Optimization

### Pause When All Trains Stopped

```typescript
function hasMovingTrains(trains: Map<string, TrainAnimState>): boolean {
  const now = performance.now();
  for (const train of trains.values()) {
    if (train.isDwelling) continue;
    const progress = (now - train.tPrev) / (train.tNext - train.tPrev);
    if (progress < 1) return true;
  }
  return false;
}

function animateLoop() {
  if (hasMovingTrains(trains)) {
    updatePositions();
    requestAnimationFrame(animateLoop);
  }
  // Loop stops when all trains have reached their targets
}
```

### Detect Dwelling (Stopped at Station)

```typescript
const DWELLING_THRESHOLD = 0.0001;  // ~10 meters in normalized coords

function isDwelling(sPrev: number, sNext: number): boolean {
  return Math.abs(sNext - sPrev) < DWELLING_THRESHOLD;
}
```

### Track Precomputation

```typescript
// Precompute once on app load
const tracksMap = new Map<string, Track>();

async function loadTracks() {
  const response = await fetch('/map/subway-lines.geojson');
  const geojson = await response.json();

  geojson.features.forEach((feature: Feature<LineString>) => {
    const routeId = feature.properties?.route_id;
    // Create separate tracks for each direction if needed
    const track = buildTrack(routeId, feature.geometry.coordinates);
    tracksMap.set(routeId, track);
  });
}
```

---

## Station Progress Calculations

### Map Stations to Track

```typescript
function stationToS(track: Track, stationLng: number, stationLat: number): number {
  return positionToS(track, stationLng, stationLat);
}

// Precompute all station positions
const stationProgress = new Map<string, number>();
stations.forEach(station => {
  const s = stationToS(track, station.lon, station.lat);
  stationProgress.set(station.id, s);
});
```

### Progress Between Stations

```typescript
function progressBetweenStations(s: number, sStationA: number, sStationB: number): number {
  return (s - sStationA) / (sStationB - sStationA);
}

// Example: Train is 75% between 14th St and 23rd St
const progress = progressBetweenStations(0.45, 0.40, 0.47);  // 0.71
```

---

## Direction Handling

### Bidirectional Tracks

```typescript
interface DirectionalTrack {
  northbound: Track;  // Coordinates in direction of travel
  southbound: Track;  // Coordinates reversed
}

function buildDirectionalTrack(coords: [number, number][]): DirectionalTrack {
  return {
    northbound: buildTrack('nb', coords),
    southbound: buildTrack('sb', [...coords].reverse()),
  };
}
```

### Select Track by Direction

```typescript
function getTrack(directionalTracks: Map<string, DirectionalTrack>, routeId: string, direction: 'N' | 'S'): Track {
  const tracks = directionalTracks.get(routeId);
  return direction === 'N' ? tracks.northbound : tracks.southbound;
}
```

---

## Gotchas & Real-World Warnings

### Coordinate Order Will Bite You

**GeoJSON uses `[longitude, latitude]`, not `[lat, lng]`:**

```typescript
// DANGER: Common mistake (Google Maps order)
const point = [40.7128, -74.0060];  // NYC as [lat, lng] - WRONG!

// CORRECT: GeoJSON order
const point = [-74.0060, 40.7128];  // NYC as [lng, lat]

// SYMPTOM: Your trains appear in the ocean or wrong continent
```

### Track Building Is Expensive

**Don't call `length()` on every animation frame:**

```typescript
// DANGER: Recalculating track length 60 times per second
function animationLoop() {
    const totalKm = length(trackLine);  // CPU-intensive!
    const position = along(trackLine, s * totalKm);
    requestAnimationFrame(animationLoop);
}

// CORRECT: Precompute once
const track = buildTrack(routeId, coords);  // totalKm cached
function animationLoop() {
    const [lng, lat] = sToCoord(track, s);  // Uses cached totalKm
}
```

### nearestPointOnLine Edge Cases

**Points far from the track give unexpected results:**

| Situation | Problem |
|-----------|---------|
| GPS drift | Point snaps to wrong segment |
| Wrong track | Train appears to jump backward |
| Track gaps | Point snaps to start/end |
| Circular routes | Ambiguous which segment |

```typescript
// SAFER: Validate snap distance
const snapped = nearestPointOnLine(track.line, pt);
if (snapped.properties.dist > 0.1) {  // > 100m from track
    console.warn('Train far from track - possible GPS error or wrong route');
    // Use previous position or skip update
}
```

### Animation Loop Memory Leaks

**Forgetting to cancel `requestAnimationFrame`:**

```typescript
// DANGER: Component unmounts but animation continues
useEffect(() => {
    function animate() {
        updatePositions();
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
    // No cleanup!
}, []);

// CORRECT: Store and cancel the frame ID
useEffect(() => {
    let frameId: number;
    function animate() {
        updatePositions();
        frameId = requestAnimationFrame(animate);
    }
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
}, []);
```

### GeoJSON Source Updates Trigger Redraws

**Updating source too frequently kills performance:**

```typescript
// DANGER: 60 setData calls per second = GPU thrashing
function animationLoop() {
    trains.forEach(updateTrainPosition);
    source.setData({ type: 'FeatureCollection', features });  // Every frame!
    requestAnimationFrame(animationLoop);
}

// BETTER: Batch updates, throttle to 30fps
let lastUpdate = 0;
function animationLoop() {
    const now = performance.now();
    if (now - lastUpdate > 33) {  // 30fps max
        source.setData(buildFeatures());
        lastUpdate = now;
    }
    requestAnimationFrame(animationLoop);
}
```

### What These Patterns Don't Tell You

1. **Map tile loading** - Animation stutters while tiles load; preload tiles along track
2. **Mobile battery drain** - Continuous animation kills battery; pause when backgrounded
3. **Large feature collections** - 1000+ trains in one GeoJSON source is slow; use clustering
4. **Marker DOM limits** - 100+ DOM markers slow the page; use GeoJSON layer instead
5. **WebGL context loss** - MapLibre can lose WebGL context; handle `webglcontextlost` event
6. **Time zone issues** - API timestamps may be in different timezone than user

---

## Navigation Guide

| Need to... | Read this |
|------------|-----------|
| Understand the mental model | This file (top section) |
| MapLibre Map/Marker API | [maplibre-api.md](resources/maplibre-api.md) |
| Turf.js spatial functions | [turf-spatial.md](resources/turf-spatial.md) |
| Animation loop patterns | [animation-patterns.md](resources/animation-patterns.md) |
| Full implementation example | [complete-example.md](resources/complete-example.md) |

---

## Resource Files

### [maplibre-api.md](resources/maplibre-api.md)
Map class, Marker, Popup, GeoJSON sources, layers, events

### [turf-spatial.md](resources/turf-spatial.md)
length, along, nearestPointOnLine, lineString, point helpers

### [animation-patterns.md](resources/animation-patterns.md)
requestAnimationFrame loops, dwelling detection, pause optimization

### [complete-example.md](resources/complete-example.md)
Full TypeScript implementation with React hooks

---

## External Resources

- [MapLibre GL JS Docs](https://maplibre.org/maplibre-gl-js/docs/)
- [MapLibre Animate Marker Example](https://maplibre.org/maplibre-gl-js/docs/examples/animate-a-marker/)
- [Turf.js Documentation](https://turfjs.org/)
- [nearestPointOnLine](https://turfjs.org/docs/api/nearestPointOnLine)
- [along](https://turfjs.org/docs/api/along)
- [length](https://turfjs.org/docs/api/length)

---

**Skill Status**: COMPLETE
**Line Count**: < 500
**Progressive Disclosure**: 4 resource files
