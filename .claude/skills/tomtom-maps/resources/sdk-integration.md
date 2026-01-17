# SDK Integration

## Installation

```bash
npm install @tomtom-international/web-sdk-maps
npm install @tomtom-international/web-sdk-services
```

## React Component

```tsx
import { useEffect, useRef } from 'react';
import tt from '@tomtom-international/web-sdk-maps';
import '@tomtom-international/web-sdk-maps/dist/maps.css';

export function TomTomMap({ center, zoom, onMapClick }) {
    const mapContainer = useRef(null);
    const map = useRef(null);

    useEffect(() => {
        if (!mapContainer.current) return;

        map.current = tt.map({
            key: process.env.NEXT_PUBLIC_TOMTOM_API_KEY,
            container: mapContainer.current,
            center,
            zoom,
        });

        if (onMapClick) {
            map.current.on('click', (e) => onMapClick(e.lngLat));
        }

        return () => map.current?.remove();
    }, []);

    return <div ref={mapContainer} style={{ width: '100%', height: '400px' }} />;
}
```

## TypeScript Types

```typescript
interface LatLng {
    lat: number;
    lng: number;
}

interface SearchResult {
    id: string;
    type: string;
    position: { lat: number; lon: number };
    address: { freeformAddress: string };
    poi?: { name: string; categories: string[] };
}
```

## Error Handling

```typescript
try {
    const result = await tt.services.fuzzySearch({ key, query });
    return result.results;
} catch (error) {
    if (error.message.includes('403')) throw new Error('Invalid API key');
    if (error.message.includes('429')) throw new Error('Rate limit exceeded');
    throw error;
}
```
