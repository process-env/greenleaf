# Animation Patterns for Real-Time Tracking

## Table of Contents

1. [requestAnimationFrame Basics](#requestanimationframe-basics)
2. [Animation State Management](#animation-state-management)
3. [The Animation Loop](#the-animation-loop)
4. [Dwelling Detection](#dwelling-detection)
5. [Pause Optimization](#pause-optimization)
6. [Handling API Updates](#handling-api-updates)
7. [Easing Functions](#easing-functions)
8. [React Hook Pattern](#react-hook-pattern)
9. [Performance Considerations](#performance-considerations)

---

## requestAnimationFrame Basics

### Why requestAnimationFrame?

```typescript
// BAD - setInterval doesn't sync with display refresh
setInterval(() => updatePositions(), 16);  // Don't do this!

// GOOD - syncs with browser's refresh rate (usually 60fps)
function animate() {
  updatePositions();
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
```

### Basic Pattern

```typescript
let animationFrameId: number | null = null;

function startAnimation() {
  function frame() {
    updatePositions();
    animationFrameId = requestAnimationFrame(frame);
  }
  animationFrameId = requestAnimationFrame(frame);
}

function stopAnimation() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}
```

### Using Timestamp

```typescript
function animate(timestamp: number) {
  const deltaMs = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  updatePositions(deltaMs);
  requestAnimationFrame(animate);
}

// Start with initial timestamp
requestAnimationFrame(animate);
```

---

## Animation State Management

### Train Animation State

```typescript
interface TrainAnimState {
  // Track reference
  trackId: string;

  // Position interpolation
  sPrev: number;      // Previous normalized position (0-1)
  sNext: number;      // Target normalized position (0-1)

  // Time interpolation
  tPrev: number;      // Timestamp of previous update (ms)
  tNext: number;      // Expected timestamp of next update (ms)

  // Visual elements
  marker: maplibregl.Marker;
  popup?: maplibregl.Popup;

  // State flags
  isDwelling: boolean;

  // Metadata
  routeId: string;
  direction: 'N' | 'S';
}
```

### State Map

```typescript
// Store all train states
const trainStates = new Map<string, TrainAnimState>();

// Access by trip ID
const state = trainStates.get(tripId);
```

---

## The Animation Loop

### Core Animation Function

```typescript
function animateTrains(
  trainStates: Map<string, TrainAnimState>,
  tracks: Map<string, Track>
) {
  const now = performance.now();

  trainStates.forEach((train, tripId) => {
    // Skip dwelling trains
    if (train.isDwelling) return;

    const track = tracks.get(train.trackId);
    if (!track) return;

    // Calculate interpolation progress (0 to 1)
    const duration = train.tNext - train.tPrev;
    const elapsed = now - train.tPrev;
    const alpha = Math.min(1, Math.max(0, elapsed / duration));

    // Interpolate position along track
    const sCurrent = lerp(train.sPrev, train.sNext, alpha);

    // Convert to coordinates
    const [lng, lat] = sToCoord(track, sCurrent);

    // Update marker
    train.marker.setLngLat([lng, lat]);
  });
}

// Linear interpolation
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
```

### Self-Stopping Loop

```typescript
let isAnimating = false;

function animate() {
  if (!hasMovingTrains()) {
    isAnimating = false;
    return;  // Stop loop
  }

  animateTrains(trainStates, tracks);
  requestAnimationFrame(animate);
}

function scheduleAnimation() {
  if (isAnimating) return;
  if (!hasMovingTrains()) return;

  isAnimating = true;
  requestAnimationFrame(animate);
}
```

---

## Dwelling Detection

### Simple Distance Threshold

```typescript
const DWELLING_THRESHOLD = 0.0001;  // Normalized distance (~10m on subway scale)

function isDwelling(sPrev: number, sNext: number): boolean {
  return Math.abs(sNext - sPrev) < DWELLING_THRESHOLD;
}
```

### With Physical Distance

```typescript
function isDwellingKm(track: Track, sPrev: number, sNext: number, thresholdKm = 0.01): boolean {
  const distKm = Math.abs(sNext - sPrev) * track.totalKm;
  return distKm < thresholdKm;
}
```

### Using in Updates

```typescript
function onPositionUpdate(train: TrainAnimState, track: Track, newLng: number, newLat: number) {
  const now = performance.now();
  const sNew = positionToS(track, newLng, newLat);

  // Check if dwelling before updating state
  const isDwelling = Math.abs(sNew - train.sNext) < DWELLING_THRESHOLD;

  // Shift positions
  train.sPrev = train.sNext;
  train.tPrev = now;
  train.sNext = sNew;
  train.tNext = now + REFRESH_INTERVAL;
  train.isDwelling = isDwelling;
}
```

---

## Pause Optimization

### Check for Moving Trains

```typescript
function hasMovingTrains(): boolean {
  const now = performance.now();

  for (const train of trainStates.values()) {
    // Skip dwelling trains
    if (train.isDwelling) continue;

    // Check if still animating
    const progress = (now - train.tPrev) / (train.tNext - train.tPrev);
    if (progress < 1) return true;
  }

  return false;
}
```

### Restart on New Data

```typescript
function onDataReceived(newPositions: TrainPosition[]) {
  // Update all train states
  newPositions.forEach(pos => {
    updateTrainState(pos);
  });

  // Restart animation if we have moving trains
  scheduleAnimation();
}
```

---

## Handling API Updates

### Smooth Transition Pattern

```typescript
function onPositionUpdate(
  train: TrainAnimState,
  track: Track,
  newLng: number,
  newLat: number
) {
  const now = performance.now();
  const sNew = positionToS(track, newLng, newLat);

  // Get current interpolated position as new start
  // This prevents "jump" to old target
  const elapsed = now - train.tPrev;
  const progress = Math.min(elapsed / (train.tNext - train.tPrev), 1);
  const sCurrent = lerp(train.sPrev, train.sNext, progress);

  // Use current position as new start
  train.sPrev = sCurrent;
  train.tPrev = now;
  train.sNext = sNew;
  train.tNext = now + REFRESH_INTERVAL;
  train.isDwelling = isDwelling(sCurrent, sNew);
}
```

### Handle Late Updates

```typescript
function onPositionUpdate(train: TrainAnimState, track: Track, lng: number, lat: number) {
  const now = performance.now();
  const sNew = positionToS(track, lng, lat);

  // If we're past expected update time, don't interpolate from past
  if (now > train.tNext) {
    // Jump to current position
    train.sPrev = sNew;
    train.tPrev = now;
    train.sNext = sNew;
    train.tNext = now + REFRESH_INTERVAL;
    train.isDwelling = true;
  } else {
    // Normal smooth transition
    const progress = (now - train.tPrev) / (train.tNext - train.tPrev);
    const sCurrent = lerp(train.sPrev, train.sNext, progress);

    train.sPrev = sCurrent;
    train.tPrev = now;
    train.sNext = sNew;
    train.tNext = now + REFRESH_INTERVAL;
    train.isDwelling = isDwelling(sCurrent, sNew);
  }
}
```

---

## Easing Functions

### Linear (Default)

```typescript
function linear(t: number): number {
  return t;
}
```

### Ease Out (Decelerate)

```typescript
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 2);
}
```

### Ease In Out (Smooth)

```typescript
function easeInOut(t: number): number {
  return t < 0.5
    ? 2 * t * t
    : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
```

### Using Easing

```typescript
function animateTrain(train: TrainAnimState, track: Track) {
  const now = performance.now();
  const rawProgress = (now - train.tPrev) / (train.tNext - train.tPrev);
  const alpha = easeInOut(Math.min(1, Math.max(0, rawProgress)));

  const sCurrent = lerp(train.sPrev, train.sNext, alpha);
  const [lng, lat] = sToCoord(track, sCurrent);
  train.marker.setLngLat([lng, lat]);
}
```

---

## React Hook Pattern

### useMapAnimation Hook

```typescript
import { useRef, useCallback, useEffect } from 'react';

interface UseMapAnimationOptions {
  refreshInterval: number;
}

interface UseMapAnimationReturn {
  trainAnimsRef: React.MutableRefObject<Map<string, TrainAnimState>>;
  lerp: (start: number, end: number, t: number) => number;
  scheduleAnimation: () => void;
}

export function useMapAnimation(
  mapLoaded: boolean,
  options: UseMapAnimationOptions
): UseMapAnimationReturn {
  const trainAnimsRef = useRef<Map<string, TrainAnimState>>(new Map());
  const animationFrameRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);

  const lerp = useCallback((start: number, end: number, t: number) => {
    return start + (end - start) * t;
  }, []);

  const hasMovingTrains = useCallback(() => {
    const now = performance.now();
    for (const anim of trainAnimsRef.current.values()) {
      if (anim.isDwelling) continue;
      const progress = (now - anim.tPrev) / (anim.tNext - anim.tPrev);
      if (progress < 1) return true;
    }
    return false;
  }, []);

  const animateTrains = useCallback(() => {
    const now = performance.now();
    let anyMoving = false;

    trainAnimsRef.current.forEach((anim) => {
      if (anim.isDwelling) return;

      const elapsed = now - anim.tPrev;
      const progress = Math.min(elapsed / options.refreshInterval, 1);

      if (progress < 1) anyMoving = true;

      const currentLng = lerp(anim.fromLng, anim.toLng, progress);
      const currentLat = lerp(anim.fromLat, anim.toLat, progress);
      anim.marker.setLngLat([currentLng, currentLat]);
    });

    if (anyMoving) {
      animationFrameRef.current = requestAnimationFrame(animateTrains);
    } else {
      isAnimatingRef.current = false;
    }
  }, [lerp, options.refreshInterval]);

  const scheduleAnimation = useCallback(() => {
    if (!mapLoaded) return;
    if (isAnimatingRef.current) return;
    if (!hasMovingTrains()) return;

    isAnimatingRef.current = true;
    animationFrameRef.current = requestAnimationFrame(animateTrains);
  }, [mapLoaded, hasMovingTrains, animateTrains]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return { trainAnimsRef, lerp, scheduleAnimation };
}
```

---

## Performance Considerations

### Batch Marker Updates

```typescript
// BAD - Individual updates trigger multiple repaints
trainStates.forEach(train => {
  train.marker.setLngLat([lng, lat]);  // Each triggers repaint
});

// GOOD - Use GeoJSON source for many points
const features = Array.from(trainStates.values()).map(train => ({
  type: 'Feature' as const,
  geometry: { type: 'Point' as const, coordinates: [lng, lat] },
  properties: { id: train.tripId }
}));

source.setData({ type: 'FeatureCollection', features });  // Single update
```

### Throttle Animation

```typescript
let lastFrameTime = 0;
const MIN_FRAME_INTERVAL = 16;  // ~60fps max

function animate(timestamp: number) {
  if (timestamp - lastFrameTime < MIN_FRAME_INTERVAL) {
    requestAnimationFrame(animate);
    return;
  }
  lastFrameTime = timestamp;

  animateTrains();
  requestAnimationFrame(animate);
}
```

### Use transform instead of setLngLat

For DOM markers, CSS transforms are more performant:

```typescript
// Get marker element
const el = marker.getElement();

// Update via transform (GPU-accelerated)
el.style.transform = `translate(${x}px, ${y}px)`;
```

### Skip Off-Screen Trains

```typescript
function isInView(map: maplibregl.Map, lng: number, lat: number): boolean {
  const bounds = map.getBounds();
  return bounds.contains([lng, lat]);
}

function animateTrains() {
  trainStates.forEach(train => {
    const [lng, lat] = calculatePosition(train);

    // Skip if off-screen
    if (!isInView(map, lng, lat)) return;

    train.marker.setLngLat([lng, lat]);
  });
}
```

---

**Related:** [maplibre-api.md](maplibre-api.md) | [turf-spatial.md](turf-spatial.md) | [complete-example.md](complete-example.md)
