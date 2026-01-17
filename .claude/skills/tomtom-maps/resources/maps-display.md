# Maps Display

## Map Initialization

### Basic Setup

```typescript
import tt from '@tomtom-international/web-sdk-maps';
import '@tomtom-international/web-sdk-maps/dist/maps.css';

const map = tt.map({
    key: process.env.TOMTOM_API_KEY,
    container: 'map', // HTML element ID
    center: [-74.006, 40.7128], // [longitude, latitude]
    zoom: 12,
    language: 'en-US',
    style: 'tomtom://vector/1/basic-main',
});
```

### Map Options

```typescript
const map = tt.map({
    key: apiKey,
    container: 'map',
    center: [lng, lat],
    zoom: 12,
    minZoom: 5,
    maxZoom: 18,
    pitch: 45, // 3D tilt angle
    bearing: 30, // Rotation
    style: 'tomtom://vector/1/basic-main',
    dragPan: true,
    dragRotate: true,
    scrollZoom: true,
    doubleClickZoom: true,
    touchZoomRotate: true,
    boxZoom: true,
    keyboard: true,
    hash: false, // URL hash for state
    attributionControl: true,
});
```

### Map Styles

```typescript
// Available styles
const styles = {
    basic: 'tomtom://vector/1/basic-main',
    night: 'tomtom://vector/1/basic-night',
    hybrid: 'tomtom://raster/1/hybrid-main',
    satellite: 'tomtom://raster/1/sat-main',
    labels: 'tomtom://vector/1/labels-main',
};

// Change style
map.setStyle(styles.night);

// Get current style
const currentStyle = map.getStyle();
```

---

## Markers

### Basic Marker

```typescript
const marker = new tt.Marker()
    .setLngLat([-74.006, 40.7128])
    .addTo(map);
```

### Custom Marker

```typescript
// Custom HTML element
const element = document.createElement('div');
element.className = 'custom-marker';
element.style.backgroundImage = 'url(/marker-icon.png)';
element.style.width = '32px';
element.style.height = '32px';

const customMarker = new tt.Marker({ element })
    .setLngLat([-74.006, 40.7128])
    .addTo(map);

// Marker with options
const markerWithOptions = new tt.Marker({
    color: '#ff0000',
    draggable: true,
    anchor: 'bottom',
    offset: [0, -10],
})
    .setLngLat([-74.006, 40.7128])
    .addTo(map);
```

### Marker Events

```typescript
const draggableMarker = new tt.Marker({ draggable: true })
    .setLngLat([-74.006, 40.7128])
    .addTo(map);

draggableMarker.on('dragstart', () => {
    console.log('Drag started');
});

draggableMarker.on('drag', () => {
    console.log('Dragging:', draggableMarker.getLngLat());
});

draggableMarker.on('dragend', () => {
    const lngLat = draggableMarker.getLngLat();
    console.log('Final position:', lngLat);
});
```

### Multiple Markers

```typescript
interface Location {
    id: string;
    name: string;
    coordinates: [number, number];
}

const locations: Location[] = [
    { id: '1', name: 'Location A', coordinates: [-74.006, 40.7128] },
    { id: '2', name: 'Location B', coordinates: [-73.985, 40.748] },
    { id: '3', name: 'Location C', coordinates: [-74.044, 40.689] },
];

const markers = locations.map((loc) => {
    const marker = new tt.Marker()
        .setLngLat(loc.coordinates)
        .addTo(map);

    marker.getElement().addEventListener('click', () => {
        console.log('Clicked:', loc.name);
    });

    return { id: loc.id, marker };
});

// Remove all markers
markers.forEach(({ marker }) => marker.remove());
```

---

## Popups

### Basic Popup

```typescript
const popup = new tt.Popup()
    .setLngLat([-74.006, 40.7128])
    .setHTML('<h3>New York City</h3><p>Population: 8.3 million</p>')
    .addTo(map);
```

### Popup with Marker

```typescript
const marker = new tt.Marker()
    .setLngLat([-74.006, 40.7128])
    .addTo(map);

const popup = new tt.Popup({ offset: 30 })
    .setHTML('<h3>Click me!</h3>');

marker.setPopup(popup);

// Or toggle popup
marker.togglePopup();
```

### Popup Options

```typescript
const popup = new tt.Popup({
    closeButton: true,
    closeOnClick: true,
    closeOnMove: false,
    anchor: 'bottom', // top, bottom, left, right, etc.
    offset: [0, -30],
    maxWidth: '300px',
    className: 'custom-popup',
})
    .setLngLat([-74.006, 40.7128])
    .setHTML(content);
```

### Dynamic Popup Content

```typescript
function createPopupContent(data: LocationData): string {
    return `
        <div class="popup-container">
            <h3>${data.name}</h3>
            <p>${data.address}</p>
            <button onclick="handleClick('${data.id}')">Details</button>
        </div>
    `;
}

map.on('click', (e) => {
    new tt.Popup()
        .setLngLat(e.lngLat)
        .setHTML(createPopupContent({ name: 'Location', address: '...', id: '1' }))
        .addTo(map);
});
```

---

## Map Controls

### Navigation Control

```typescript
map.addControl(new tt.NavigationControl(), 'top-right');
```

### Fullscreen Control

```typescript
map.addControl(new tt.FullscreenControl(), 'top-right');
```

### Geolocation Control

```typescript
const geolocate = new tt.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: true,
    showUserHeading: true,
});

map.addControl(geolocate);

geolocate.on('geolocate', (e) => {
    console.log('User location:', e.coords);
});
```

### Scale Control

```typescript
map.addControl(new tt.ScaleControl({
    maxWidth: 200,
    unit: 'metric', // 'imperial' or 'nautical'
}), 'bottom-left');
```

### Custom Control

```typescript
class CustomControl {
    onAdd(map: tt.Map) {
        this._map = map;
        this._container = document.createElement('div');
        this._container.className = 'mapboxgl-ctrl custom-ctrl';
        this._container.innerHTML = '<button>Custom</button>';
        this._container.onclick = () => this.handleClick();
        return this._container;
    }

    onRemove() {
        this._container.parentNode.removeChild(this._container);
        this._map = undefined;
    }

    handleClick() {
        console.log('Custom control clicked');
    }
}

map.addControl(new CustomControl(), 'top-left');
```

---

## Map Events

### Common Events

```typescript
// Map load
map.on('load', () => {
    console.log('Map fully loaded');
});

// Click
map.on('click', (e) => {
    console.log('Clicked at:', e.lngLat);
});

// Double click
map.on('dblclick', (e) => {
    console.log('Double clicked');
});

// Mouse move
map.on('mousemove', (e) => {
    console.log('Mouse position:', e.point);
});

// Zoom
map.on('zoom', () => {
    console.log('Zoom level:', map.getZoom());
});

// Move
map.on('move', () => {
    console.log('Center:', map.getCenter());
});

// Moveend (after animation)
map.on('moveend', () => {
    console.log('Move ended');
});
```

### Layer Events

```typescript
// Click on specific layer
map.on('click', 'poi-layer', (e) => {
    const feature = e.features[0];
    console.log('Clicked POI:', feature.properties);
});

// Hover effect
map.on('mouseenter', 'poi-layer', () => {
    map.getCanvas().style.cursor = 'pointer';
});

map.on('mouseleave', 'poi-layer', () => {
    map.getCanvas().style.cursor = '';
});
```

---

## Camera Controls

### Set View

```typescript
// Fly to location
map.flyTo({
    center: [-74.006, 40.7128],
    zoom: 14,
    pitch: 45,
    bearing: 0,
    duration: 2000, // milliseconds
});

// Jump to (instant)
map.jumpTo({
    center: [-74.006, 40.7128],
    zoom: 12,
});

// Ease to (smooth, no flight)
map.easeTo({
    center: [-74.006, 40.7128],
    zoom: 12,
    duration: 1000,
});
```

### Fit Bounds

```typescript
const bounds = new tt.LngLatBounds(
    [-74.1, 40.6], // Southwest
    [-73.9, 40.8]  // Northeast
);

map.fitBounds(bounds, {
    padding: { top: 50, bottom: 50, left: 50, right: 50 },
    maxZoom: 15,
    duration: 1000,
});

// Extend bounds with points
const extendedBounds = new tt.LngLatBounds();
points.forEach(point => extendedBounds.extend(point));
map.fitBounds(extendedBounds);
```

### Get Map State

```typescript
const center = map.getCenter(); // LngLat
const zoom = map.getZoom();
const bounds = map.getBounds();
const pitch = map.getPitch();
const bearing = map.getBearing();
```

---

## Layers and Sources

### GeoJSON Source

```typescript
map.addSource('points', {
    type: 'geojson',
    data: {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-74.006, 40.7128] },
                properties: { name: 'New York' },
            },
        ],
    },
});

// Update source data
map.getSource('points').setData(newGeoJSON);
```

### Circle Layer

```typescript
map.addLayer({
    id: 'points-circle',
    type: 'circle',
    source: 'points',
    paint: {
        'circle-radius': 8,
        'circle-color': '#ff0000',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
    },
});
```

### Line Layer

```typescript
map.addLayer({
    id: 'route-line',
    type: 'line',
    source: 'route',
    layout: {
        'line-join': 'round',
        'line-cap': 'round',
    },
    paint: {
        'line-color': '#4a90d9',
        'line-width': 5,
        'line-opacity': 0.8,
    },
});
```

### Fill Layer

```typescript
map.addLayer({
    id: 'polygon-fill',
    type: 'fill',
    source: 'areas',
    paint: {
        'fill-color': '#088',
        'fill-opacity': 0.5,
    },
});

map.addLayer({
    id: 'polygon-outline',
    type: 'line',
    source: 'areas',
    paint: {
        'line-color': '#000',
        'line-width': 2,
    },
});
```

### Symbol Layer

```typescript
map.addLayer({
    id: 'labels',
    type: 'symbol',
    source: 'points',
    layout: {
        'text-field': ['get', 'name'],
        'text-size': 12,
        'text-offset': [0, 1.5],
        'text-anchor': 'top',
        'icon-image': 'marker-icon',
        'icon-size': 0.5,
    },
    paint: {
        'text-color': '#000000',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
    },
});
```

---

## React Integration

```tsx
import { useEffect, useRef, useState } from 'react';
import tt from '@tomtom-international/web-sdk-maps';

interface MapProps {
    center: [number, number];
    zoom: number;
    markers?: Array<{ id: string; position: [number, number] }>;
    onMapClick?: (lngLat: tt.LngLat) => void;
}

export function TomTomMap({ center, zoom, markers, onMapClick }: MapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<tt.Map | null>(null);
    const markersRef = useRef<Map<string, tt.Marker>>(new Map());

    useEffect(() => {
        if (!mapContainer.current) return;

        map.current = tt.map({
            key: process.env.NEXT_PUBLIC_TOMTOM_API_KEY!,
            container: mapContainer.current,
            center,
            zoom,
        });

        if (onMapClick) {
            map.current.on('click', (e) => onMapClick(e.lngLat));
        }

        return () => {
            map.current?.remove();
        };
    }, []);

    // Update markers
    useEffect(() => {
        if (!map.current || !markers) return;

        // Remove old markers
        markersRef.current.forEach((marker, id) => {
            if (!markers.find(m => m.id === id)) {
                marker.remove();
                markersRef.current.delete(id);
            }
        });

        // Add/update markers
        markers.forEach(({ id, position }) => {
            if (markersRef.current.has(id)) {
                markersRef.current.get(id)!.setLngLat(position);
            } else {
                const marker = new tt.Marker()
                    .setLngLat(position)
                    .addTo(map.current!);
                markersRef.current.set(id, marker);
            }
        });
    }, [markers]);

    return <div ref={mapContainer} style={{ width: '100%', height: '400px' }} />;
}
```
