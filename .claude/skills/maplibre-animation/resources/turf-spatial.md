# Turf.js Spatial Functions Reference

## Table of Contents

1. [Installation & Bundle Size](#installation--bundle-size)
2. [Core Helpers](#core-helpers)
3. [Measurement Functions](#measurement-functions)
4. [Line Operations](#line-operations)
5. [Arc-Length Parametrization](#arc-length-parametrization)
6. [Additional Useful Functions](#additional-useful-functions)
7. [Units & Conversions](#units--conversions)
8. [Performance Tips](#performance-tips)
9. [Available Packages](#available-packages)

---

## Installation & Bundle Size

### Full Library (Convenient)

```bash
npm install @turf/turf
```

```typescript
import * as turf from '@turf/turf';
const line = turf.lineString([[0, 0], [1, 1]]);
```

### Individual Packages (Tree-Shakeable)

```bash
npm install @turf/helpers @turf/length @turf/along @turf/nearest-point-on-line
```

```typescript
import { lineString, point } from '@turf/helpers';
import { length } from '@turf/length';
import { along } from '@turf/along';
import { nearestPointOnLine } from '@turf/nearest-point-on-line';
```

**Recommendation:** For production apps, import individual packages to minimize bundle size.

### CDN (Browser)

```html
<!-- Specific version (recommended) -->
<script src="https://cdn.jsdelivr.net/npm/@turf/turf@7.0.0/turf.min.js"></script>

<!-- Major version -->
<script src="https://cdn.jsdelivr.net/npm/@turf/turf@7/turf.min.js"></script>
```

> **Warning:** Don't use `latest` tag in production.

### TypeScript Support

Types are included in each package. GeoJSON types come from `@types/geojson`:

```bash
npm install @types/geojson
```

---

## Core Helpers

### Coordinate Order (CRITICAL)

**Turf uses `[longitude, latitude]`** per GeoJSON standard (RFC 7946).

```typescript
// CORRECT ✅
const pt = point([-74.006, 40.714]);  // [lng, lat]

// WRONG ❌ - Will produce incorrect results!
const pt = point([40.714, -74.006]);  // [lat, lng]
```

### point()

```typescript
import { point } from '@turf/helpers';

const pt = point([-74.006, 40.714]);
const ptWithProps = point([-74.006, 40.714], { name: 'Penn Station' });

// With ID and bbox
const ptFull = point([-74.006, 40.714], { name: 'Penn' }, { id: 'penn-1' });
```

### lineString()

```typescript
import { lineString } from '@turf/helpers';

const line = lineString([
  [-74.006, 40.714],
  [-74.002, 40.720],
  [-73.998, 40.725],
]);

// With properties
const lineWithProps = lineString(
  [[-74.006, 40.714], [-74.002, 40.720]],
  { name: 'Route A', color: '#0039A6' }
);

// With bbox
const lineWithBbox = lineString(coords, props, {
  bbox: [-74.006, 40.714, -73.998, 40.725],  // [west, south, east, north]
  id: 'route-a'
});
```

### featureCollection()

```typescript
import { featureCollection, point } from '@turf/helpers';

const fc = featureCollection([
  point([-74.006, 40.714], { name: 'A' }),
  point([-73.998, 40.725], { name: 'B' }),
]);
```

### multiLineString()

```typescript
import { multiLineString } from '@turf/helpers';

const mls = multiLineString([
  [[-74.006, 40.714], [-74.002, 40.720]],  // First line
  [[-73.998, 40.725], [-73.995, 40.730]],  // Second line
]);
```

---

## Measurement Functions

### length() - Total Line Distance

```typescript
import { length, lineString } from '@turf/turf';

const line = lineString([
  [-74.006, 40.714],
  [-74.002, 40.720],
  [-73.998, 40.725],
]);

// Default: kilometers
const km = length(line);

// Specify units
const meters = length(line, { units: 'meters' });
const miles = length(line, { units: 'miles' });
```

### distance() - Point to Point

```typescript
import { distance, point } from '@turf/turf';

const from = point([-75.343, 39.984]);
const to = point([-75.534, 39.123]);

const km = distance(from, to);
const miles = distance(from, to, { units: 'miles' });
```

Uses **Haversine formula** for global curvature.

### bearing() - Direction Between Points

```typescript
import { bearing, point } from '@turf/turf';

const start = point([-75.343, 39.984]);
const end = point([-75.534, 39.123]);

const initialBearing = bearing(start, end);  // -180 to 180 degrees
const finalBearing = bearing(start, end, { final: true });
```

### destination() - Point at Distance & Bearing

```typescript
import { destination, point } from '@turf/turf';

const origin = point([-75.343, 39.984]);
const dist = 50;
const bearing = 90;  // East

const dest = destination(origin, dist, bearing, { units: 'kilometers' });
const [lng, lat] = dest.geometry.coordinates;
```

---

## Line Operations

### along() - Point at Distance Along Line

```typescript
import { along, lineString, length } from '@turf/turf';

const line = lineString([
  [-74.006, 40.714],
  [-74.002, 40.720],
  [-73.998, 40.725],
]);

// Point 1.5 km from start
const pt = along(line, 1.5, { units: 'kilometers' });
const [lng, lat] = pt.geometry.coordinates;

// Point at 50% of line
const totalKm = length(line);
const midpoint = along(line, totalKm * 0.5);
```

### nearestPointOnLine() - Snap Point to Line

```typescript
import { nearestPointOnLine, lineString, point } from '@turf/turf';

const line = lineString([
  [-74.006, 40.714],
  [-74.002, 40.720],
  [-73.998, 40.725],
]);
const pt = point([-74.004, 40.718]);

const snapped = nearestPointOnLine(line, pt, { units: 'kilometers' });

// The snapped coordinates
const [lng, lat] = snapped.geometry.coordinates;

// Properties (KEY for arc-length!)
snapped.properties.location;  // Distance from line START (km)
snapped.properties.dist;      // Perpendicular distance to line (km)
snapped.properties.index;     // Segment index where found
```

### lineSlice() - Cut Line Between Points

```typescript
import { lineSlice, lineString, point } from '@turf/turf';

const line = lineString([
  [-74.006, 40.714],
  [-74.002, 40.720],
  [-73.998, 40.725],
]);

const start = point([-74.005, 40.715]);
const end = point([-73.999, 40.724]);

const sliced = lineSlice(start, end, line);
```

### lineSliceAlong() - Cut Line by Distance

```typescript
import { lineSliceAlong, lineString } from '@turf/turf';

const line = lineString([
  [-74.006, 40.714],
  [-74.002, 40.720],
  [-73.998, 40.725],
]);

// Get segment from 0.5km to 1.5km
const sliced = lineSliceAlong(line, 0.5, 1.5, { units: 'kilometers' });
```

---

## Arc-Length Parametrization

### Complete Implementation

```typescript
import { length, along, nearestPointOnLine, lineString, point } from '@turf/turf';
import type { Feature, LineString } from 'geojson';

interface Track {
  id: string;
  line: Feature<LineString>;
  totalKm: number;
}

// 1. Build track once
function buildTrack(id: string, coords: [number, number][]): Track {
  const line = lineString(coords);
  const totalKm = length(line, { units: 'kilometers' });
  return { id, line, totalKm };
}

// 2. Map lat/lng to normalized position (0-1)
function positionToS(track: Track, lng: number, lat: number): number {
  const pt = point([lng, lat]);
  const snapped = nearestPointOnLine(track.line, pt, { units: 'kilometers' });
  const distAlongKm = snapped.properties!.location as number;
  return Math.min(1, Math.max(0, distAlongKm / track.totalKm));
}

// 3. Map normalized position back to coordinates
function sToCoord(track: Track, s: number): [number, number] {
  const distKm = s * track.totalKm;
  const pt = along(track.line, distKm, { units: 'kilometers' });
  return pt.geometry.coordinates as [number, number];
}

// 4. Linear interpolation
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// 5. Interpolate position
function interpolatePosition(
  track: Track,
  sPrev: number,
  sNext: number,
  progress: number
): [number, number] {
  const sCurrent = lerp(sPrev, sNext, progress);
  return sToCoord(track, sCurrent);
}
```

---

## Additional Useful Functions

### pointOnFeature() - Guaranteed Point on Geometry

```typescript
import { pointOnFeature, polygon } from '@turf/turf';

const poly = polygon([[...]]);
const pt = pointOnFeature(poly);  // Guaranteed to be inside polygon
```

### centroid() - Geometric Center

```typescript
import { centroid, polygon } from '@turf/turf';

const center = centroid(polygon);
```

### booleanPointInPolygon() - Point Inside Polygon

```typescript
import { booleanPointInPolygon, point, polygon } from '@turf/turf';

const pt = point([-74.006, 40.714]);
const poly = polygon([[...]]);

if (booleanPointInPolygon(pt, poly)) {
  console.log('Point is inside!');
}
```

### simplify() - Reduce Coordinates

```typescript
import { simplify, lineString } from '@turf/turf';

const simplified = simplify(line, {
  tolerance: 0.01,
  highQuality: true
});
```

---

## Units & Conversions

### Supported Units

```typescript
type Units =
  | 'meters' | 'metres'
  | 'millimeters' | 'millimetres'
  | 'centimeters' | 'centimetres'
  | 'kilometers' | 'kilometres'
  | 'miles'
  | 'nauticalmiles'
  | 'inches'
  | 'yards'
  | 'feet'
  | 'radians'
  | 'degrees';
```

### convertLength()

```typescript
import { convertLength } from '@turf/helpers';

const miles = convertLength(10, 'kilometers', 'miles');  // ~6.21
```

### bearingToAzimuth()

```typescript
import { bearingToAzimuth } from '@turf/helpers';

const azimuth = bearingToAzimuth(-45);  // 315 (0-360 range)
```

---

## Performance Tips

### Cache Computed Values

```typescript
// BAD - Recomputes on every call
function animate() {
  const totalKm = length(track.line);  // Don't do this!
  // ...
}

// GOOD - Compute once
const track = buildTrack('route-a', coords);  // totalKm cached
```

### Precompute Station Positions

```typescript
// Do once at startup
const stationProgress = new Map<string, number>();
stations.forEach(station => {
  stationProgress.set(station.id, positionToS(track, station.lng, station.lat));
});
```

### Use Appropriate Precision

For subway-scale distances (~10km), meter precision is sufficient:

```typescript
const s = Math.round(positionToS(track, lng, lat) * 10000) / 10000;
```

### Individual Package Imports

```bash
# Instead of:
npm install @turf/turf  # ~500KB

# Use:
npm install @turf/helpers @turf/length @turf/along @turf/nearest-point-on-line
# Much smaller bundle!
```

---

## Available Packages

### Line Operations
`@turf/along`, `@turf/length`, `@turf/line-slice`, `@turf/line-slice-along`, `@turf/line-intersect`, `@turf/line-offset`, `@turf/line-overlap`, `@turf/line-segment`, `@turf/line-split`, `@turf/line-chunk`

### Point Operations
`@turf/nearest-point`, `@turf/nearest-point-on-line`, `@turf/nearest-point-to-line`, `@turf/point-on-feature`, `@turf/point-to-line-distance`

### Measurement
`@turf/distance`, `@turf/bearing`, `@turf/destination`, `@turf/area`, `@turf/bbox`, `@turf/center`, `@turf/centroid`, `@turf/midpoint`

### Helpers
`@turf/helpers`, `@turf/meta`, `@turf/invariant`, `@turf/clone`

### Boolean Operations
`@turf/boolean-point-in-polygon`, `@turf/boolean-intersects`, `@turf/boolean-contains`, `@turf/boolean-within`

### Transformations
`@turf/buffer`, `@turf/simplify`, `@turf/transform-translate`, `@turf/transform-rotate`, `@turf/transform-scale`

---

## External Resources

- [Turf.js Documentation](https://turfjs.org/)
- [Turf.js Getting Started](https://turfjs.org/docs/getting-started)
- [nearestPointOnLine API](https://turfjs.org/docs/api/nearestPointOnLine)
- [along API](https://turfjs.org/docs/api/along)
- [length API](https://turfjs.org/docs/api/length)
- [GitHub Repository](https://github.com/Turfjs/turf)

---

**Related:** [maplibre-api.md](maplibre-api.md) | [animation-patterns.md](animation-patterns.md)
