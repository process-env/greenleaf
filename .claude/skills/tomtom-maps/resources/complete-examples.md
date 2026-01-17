# Complete Examples

## Store Locator

```typescript
class StoreLocator {
    private map: tt.Map;
    private markers: tt.Marker[] = [];

    async searchStores(query: string, center: LatLng) {
        const results = await tt.services.fuzzySearch({
            key: TOMTOM_API_KEY,
            query,
            center,
            radius: 10000,
        });

        this.clearMarkers();
        results.results.forEach((result) => {
            const marker = new tt.Marker()
                .setLngLat([result.position.lon, result.position.lat])
                .addTo(this.map);
            this.markers.push(marker);
        });
    }

    private clearMarkers() {
        this.markers.forEach((m) => m.remove());
        this.markers = [];
    }
}
```

## Route Planner

```typescript
async function planRoute(start: LatLng, end: LatLng) {
    const result = await tt.services.calculateRoute({
        key: TOMTOM_API_KEY,
        locations: [start, end],
        traffic: true,
    });

    const route = result.routes[0];
    return {
        distance: route.summary.lengthInMeters / 1000,
        duration: route.summary.travelTimeInSeconds / 60,
    };
}
```

## Address Autocomplete

```tsx
export function AddressAutocomplete({ onSelect }) {
    const [suggestions, setSuggestions] = useState([]);

    const search = debounce(async (q: string) => {
        const results = await tt.services.fuzzySearch({
            key: TOMTOM_API_KEY,
            query: q,
            typeahead: true,
            limit: 5,
        });
        setSuggestions(results.results);
    }, 300);

    return (
        <input onChange={(e) => search(e.target.value)} />
    );
}
```
