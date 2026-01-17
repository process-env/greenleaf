# Traffic API

## Traffic Flow

```typescript
const flowUrl = 'https://api.tomtom.com/traffic/services/5/flowSegmentData/absolute/10/json';
const response = await fetch(
    `${flowUrl}?key=${TOMTOM_API_KEY}&point=37.7749,-122.4194`
);
const flowData = await response.json();

const { currentSpeed, freeFlowSpeed, confidence } = flowData.flowSegmentData;
```

## Traffic Incidents

```typescript
const incidentsUrl = 'https://api.tomtom.com/traffic/services/5/incidentDetails';
const params = new URLSearchParams({
    key: TOMTOM_API_KEY,
    bbox: '-122.5,37.5,-122.3,37.9',
});

const incidents = await fetch(`${incidentsUrl}?${params}`).then(r => r.json());
```

## Traffic Tiles on Map

```typescript
map.addSource('traffic-flow', {
    type: 'raster',
    tiles: [
        `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${TOMTOM_API_KEY}`,
    ],
    tileSize: 256,
});

map.addLayer({
    id: 'traffic-layer',
    type: 'raster',
    source: 'traffic-flow',
});
```
