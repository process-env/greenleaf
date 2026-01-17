# Routing and Navigation

## Basic Route Calculation

```typescript
import tt from '@tomtom-international/web-sdk-services';

const routeResult = await tt.services.calculateRoute({
    key: TOMTOM_API_KEY,
    locations: [
        { lat: 37.7749, lng: -122.4194 }, // Start
        { lat: 37.3382, lng: -121.8863 }, // End
    ],
});

const route = routeResult.routes[0];
console.log('Distance:', route.summary.lengthInMeters / 1000, 'km');
console.log('Time:', route.summary.travelTimeInSeconds / 60, 'min');
```

## Route Options

```typescript
const route = await tt.services.calculateRoute({
    key: TOMTOM_API_KEY,
    locations: [start, end],
    travelMode: 'car', // car, truck, pedestrian, bicycle
    routeType: 'fastest', // fastest, shortest, eco
    traffic: true,
    avoid: ['tollRoads', 'motorways', 'ferries'],
    departAt: new Date(),
});
```

## Multi-Stop Routes

```typescript
const route = await tt.services.calculateRoute({
    key: TOMTOM_API_KEY,
    locations: [start, waypoint1, waypoint2, end],
    computeBestOrder: true, // Optimize waypoint order
});
```

## Display Route on Map

```typescript
const geojson = routeResult.toGeoJson();

map.addLayer({
    id: 'route',
    type: 'line',
    source: { type: 'geojson', data: geojson },
    paint: { 'line-color': '#4a90d9', 'line-width': 6 },
});
```

## Reachable Range

```typescript
const range = await tt.services.calculateReachableRange({
    key: TOMTOM_API_KEY,
    origin: { lat: 40.7128, lng: -74.006 },
    timeBudgetInSec: 1800, // 30 minutes
});
```
