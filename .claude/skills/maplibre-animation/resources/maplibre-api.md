# MapLibre GL JS API Reference

## Table of Contents

1. [Map Class](#map-class)
2. [Marker Class](#marker-class)
3. [Popup Class](#popup-class)
4. [GeoJSON Sources](#geojson-sources)
5. [Layers](#layers)
6. [Events](#events)
7. [LngLat & Coordinates](#lnglat--coordinates)

---

## Map Class

### Initialization

```typescript
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const map = new maplibregl.Map({
  container: 'map',                    // Container ID or element
  style: 'https://example.com/style.json',
  center: [-74.006, 40.714],           // [lng, lat]
  zoom: 12,
  minZoom: 10,
  maxZoom: 18,
  maxBounds: [[-74.5, 40.4], [-73.5, 41.0]],  // [[sw], [ne]]
  attributionControl: false,
  hash: false,                         // Sync URL hash with map state
  pitch: 0,                            // Tilt angle
  bearing: 0,                          // Rotation angle
});
```

### Source Management

```typescript
// Add GeoJSON source
map.addSource('my-source', {
  type: 'geojson',
  data: geojsonData
});

// Get source (for updates)
const source = map.getSource('my-source') as maplibregl.GeoJSONSource;
source.setData(newData);

// Check if source exists
if (map.getSource('my-source')) { ... }

// Remove source
map.removeSource('my-source');
```

### Layer Management

```typescript
// Add layer
map.addLayer({
  id: 'my-layer',
  type: 'circle',         // circle, line, fill, symbol, etc.
  source: 'my-source',
  paint: { ... },
  layout: { ... },
  filter: ['==', 'type', 'train'],
}, 'before-layer-id');    // Optional: insert before this layer

// Get/check layer
const layer = map.getLayer('my-layer');

// Update paint property
map.setPaintProperty('my-layer', 'circle-color', '#ff0000');

// Update layout property
map.setLayoutProperty('my-layer', 'visibility', 'none');

// Remove layer
map.removeLayer('my-layer');
```

### Camera Methods

```typescript
// Instant jump
map.jumpTo({
  center: [-74.006, 40.714],
  zoom: 14,
  bearing: 0,
  pitch: 0
});

// Smooth animation
map.flyTo({
  center: [-74.006, 40.714],
  zoom: 15,
  duration: 1500,         // ms
  essential: true,        // Respects prefers-reduced-motion if false
});

// Ease to location
map.easeTo({
  center: [-74.006, 40.714],
  zoom: 14,
  duration: 500
});

// Fit bounds
map.fitBounds([[-74.1, 40.6], [-73.9, 40.8]], {
  padding: 50,
  maxZoom: 15
});
```

### Feature State

```typescript
// Set feature state (for styling)
map.setFeatureState(
  { source: 'my-source', id: featureId },
  { selected: true, hover: false }
);

// Get feature state
const state = map.getFeatureState({ source: 'my-source', id: featureId });

// Remove feature state
map.removeFeatureState({ source: 'my-source', id: featureId });
```

### Query Features

```typescript
// Query visible features at a point
const features = map.queryRenderedFeatures(
  [x, y],                 // Screen coordinates
  { layers: ['my-layer'] }
);

// Query features in a bounding box
const features = map.queryRenderedFeatures(
  [[x1, y1], [x2, y2]],
  { layers: ['my-layer'], filter: ['==', 'type', 'station'] }
);

// Query source features (including non-visible)
const features = map.querySourceFeatures('my-source', {
  sourceLayer: 'layer-name',  // For vector tiles
  filter: ['==', 'active', true]
});
```

---

## Marker Class

### Creation

```typescript
// Simple marker
const marker = new maplibregl.Marker()
  .setLngLat([-74.006, 40.714])
  .addTo(map);

// With options
const marker = new maplibregl.Marker({
  color: '#ff0000',
  draggable: true,
  rotation: 45,
  scale: 1.5,
  anchor: 'bottom',       // top, bottom, left, right, center
});

// Custom element
const el = document.createElement('div');
el.className = 'custom-marker';
el.innerHTML = '<span>A</span>';

const marker = new maplibregl.Marker({ element: el })
  .setLngLat([-74.006, 40.714])
  .addTo(map);
```

### Methods

```typescript
// Position
marker.setLngLat([lng, lat]);
const lngLat = marker.getLngLat();  // { lng, lat }

// Map attachment
marker.addTo(map);
marker.remove();

// Popup
marker.setPopup(popup);
marker.getPopup();
marker.togglePopup();

// Rotation
marker.setRotation(45);
marker.setRotationAlignment('map');  // 'map' | 'viewport' | 'auto'

// Dragging
marker.setDraggable(true);
marker.isDraggable();

// Opacity
marker.setOpacity(0.8);

// DOM element
marker.getElement();

// Offset (pixels)
marker.setOffset([0, -10]);
```

### Events

```typescript
marker.on('dragstart', () => { ... });
marker.on('drag', () => { ... });
marker.on('dragend', () => { ... });
```

### Animation Pattern

```typescript
// In requestAnimationFrame loop:
function animate() {
  const [lng, lat] = calculatePosition();
  marker.setLngLat([lng, lat]);
  requestAnimationFrame(animate);
}
```

---

## Popup Class

### Creation

```typescript
const popup = new maplibregl.Popup({
  closeButton: true,
  closeOnClick: true,
  closeOnMove: false,
  anchor: 'bottom',
  offset: [0, -15],
  className: 'my-popup',
  maxWidth: '300px',
});

popup
  .setLngLat([-74.006, 40.714])
  .setHTML('<h3>Title</h3><p>Content</p>')
  .addTo(map);
```

### Methods

```typescript
// Content
popup.setHTML('<p>HTML content</p>');
popup.setText('Plain text');
popup.setDOMContent(element);

// Position
popup.setLngLat([lng, lat]);
popup.getLngLat();

// Visibility
popup.addTo(map);
popup.remove();
popup.isOpen();

// Offset
popup.setOffset([0, -10]);
```

### With Marker

```typescript
const marker = new maplibregl.Marker()
  .setLngLat([lng, lat])
  .setPopup(popup)
  .addTo(map);

// Toggle on click
marker.togglePopup();
```

---

## GeoJSON Sources

### Adding Source

```typescript
// From object
map.addSource('trains', {
  type: 'geojson',
  data: {
    type: 'FeatureCollection',
    features: []
  }
});

// From URL
map.addSource('routes', {
  type: 'geojson',
  data: '/api/routes.geojson'
});

// With clustering
map.addSource('stations', {
  type: 'geojson',
  data: geojson,
  cluster: true,
  clusterRadius: 50,
  clusterMaxZoom: 14,
});
```

### Updating Data

```typescript
const source = map.getSource('trains') as maplibregl.GeoJSONSource;

// Replace all data
source.setData({
  type: 'FeatureCollection',
  features: newFeatures
});

// Update specific features (requires feature IDs)
source.updateData({
  add: [/* features to add */],
  update: [/* features to update */],
  remove: ['id1', 'id2']
});
```

### Feature Structure

```typescript
const feature = {
  type: 'Feature',
  id: 'train-123',        // Required for updateData
  geometry: {
    type: 'Point',
    coordinates: [-74.006, 40.714]
  },
  properties: {
    routeId: 'A',
    color: '#0039A6',
    direction: 'N'
  }
};
```

---

## Layers

### Circle Layer (Points)

```typescript
map.addLayer({
  id: 'trains',
  type: 'circle',
  source: 'trains',
  paint: {
    'circle-radius': [
      'interpolate', ['linear'], ['zoom'],
      10, 4,
      14, 8,
      18, 12
    ],
    'circle-color': ['get', 'color'],
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff',
    'circle-opacity': 0.9,
  }
});
```

### Symbol Layer (Icons/Text)

```typescript
// Load image first
map.loadImage('/icons/train.png', (error, image) => {
  map.addImage('train-icon', image);

  map.addLayer({
    id: 'train-icons',
    type: 'symbol',
    source: 'trains',
    layout: {
      'icon-image': 'train-icon',
      'icon-size': 0.5,
      'icon-allow-overlap': true,
      'text-field': ['get', 'routeId'],
      'text-size': 12,
      'text-offset': [0, 1.5],
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': '#000000',
      'text-halo-width': 1,
    }
  });
});
```

### Line Layer

```typescript
map.addLayer({
  id: 'routes',
  type: 'line',
  source: 'routes',
  paint: {
    'line-color': ['get', 'color'],
    'line-width': [
      'interpolate', ['linear'], ['zoom'],
      10, 2,
      14, 4,
      18, 6
    ],
    'line-opacity': 0.85,
  },
  layout: {
    'line-cap': 'round',
    'line-join': 'round',
  }
});
```

---

## Events

### Map Events

```typescript
// Load events
map.on('load', () => { /* Map fully loaded */ });
map.on('style.load', () => { /* Style loaded */ });

// Interaction events
map.on('click', (e) => {
  console.log(e.lngLat);  // { lng, lat }
  console.log(e.point);   // { x, y } screen coordinates
});
map.on('dblclick', handler);
map.on('contextmenu', handler);

// Movement events
map.on('move', handler);
map.on('moveend', handler);
map.on('zoom', handler);
map.on('zoomend', handler);
map.on('rotate', handler);
map.on('pitch', handler);

// Render events
map.on('render', handler);       // Every frame
map.on('idle', handler);         // Map is idle

// Data events
map.on('data', handler);         // Any data event
map.on('sourcedata', handler);   // Source data changed
```

### Layer Events

```typescript
// Click on features in layer
map.on('click', 'trains', (e) => {
  const feature = e.features[0];
  console.log(feature.properties);
});

// Hover effects
map.on('mouseenter', 'trains', () => {
  map.getCanvas().style.cursor = 'pointer';
});
map.on('mouseleave', 'trains', () => {
  map.getCanvas().style.cursor = '';
});
```

---

## LngLat & Coordinates

### LngLat Class

```typescript
const lngLat = new maplibregl.LngLat(-74.006, 40.714);
lngLat.lng;  // -74.006
lngLat.lat;  // 40.714

// From array
const lngLat = maplibregl.LngLat.convert([-74.006, 40.714]);

// Distance
const distance = lngLat.distanceTo(otherLngLat);  // meters

// Convert to array
lngLat.toArray();  // [-74.006, 40.714]
```

### Coordinate Systems

```typescript
// Geographic coordinates (lon, lat)
const geo = [-74.006, 40.714];

// Screen coordinates (pixels)
const point = map.project(geo);       // { x, y }
const geo2 = map.unproject(point);    // LngLat

// Mercator coordinates (for 3D)
const merc = maplibregl.MercatorCoordinate.fromLngLat(geo);
```

---

## Performance Tips

### Minimize setData Calls
Update GeoJSON source only when needed, not every frame.

### Use Appropriate Layer Types
- Few markers (<50): Use Marker class
- Many points: Use circle layer with GeoJSON source
- Complex icons: Use symbol layer

### Optimize Feature Properties
Only include necessary properties in GeoJSON features.

### Batch Updates
Collect all position changes, update source once per frame.

```typescript
let frameScheduled = false;

function scheduleUpdate() {
  if (frameScheduled) return;
  frameScheduled = true;

  requestAnimationFrame(() => {
    updateAllPositions();
    frameScheduled = false;
  });
}
```

---

**Related:** [turf-spatial.md](turf-spatial.md) | [animation-patterns.md](animation-patterns.md)
