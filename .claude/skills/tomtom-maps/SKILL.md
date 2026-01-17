---
name: tomtom-maps
description: TomTom Maps APIs and SDKs for location-based services including Maps Display, Search/Geocoding, Routing/Navigation, and Traffic. Covers Maps SDK for Web, REST APIs, real-time traffic, EV routing, and geofencing patterns. NOTE: Web SDK v6 deprecated - see deprecation warning.
version: "2.0.0"
lastUpdated: "2026-01-11"
frameworkVersions:
  tomtom-web-sdk: "v6 (DEPRECATED)"
  tomtom-android: "1.23"
  tomtom-ios: "0.66"
---

# TomTom Maps

> **CRITICAL DEPRECATION WARNING (2026-01-11):** TomTom Maps SDK for Web v6 is being **withdrawn on February 1, 2026**. For web applications, migrate to **MapLibre GL JS** with TomTom REST APIs, or use the `maplibre-animation` skill. Mobile SDKs (Android v1.23, iOS v0.66) remain supported. See [DEPRECATIONS.md](../DEPRECATIONS.md) for migration guidance.

## Purpose

Comprehensive guide for implementing TomTom location-based services including map display, search/geocoding, routing/navigation, traffic data, and geofencing using TomTom APIs and SDKs.

## When to Use This Skill

Automatically activates when working on:
- Displaying interactive maps
- Implementing search and geocoding
- Building route planning and navigation
- Integrating real-time traffic data
- Creating geofencing solutions
- Working with TomTom SDKs

---

## Quick Start

### New TomTom Integration Checklist

- [ ] Obtain API key from TomTom Developer Portal
- [ ] Choose SDK vs REST API approach
- [ ] Plan which services needed (Maps, Search, Routing, Traffic)
- [ ] Set up error handling for API failures
- [ ] Implement rate limiting awareness
- [ ] Consider caching for frequently accessed data
- [ ] Add usage monitoring

### API Key Setup

```typescript
// Environment configuration
const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;

// Base URLs
const TOMTOM_BASE = 'https://api.tomtom.com';
const TOMTOM_MAPS = 'https://api.tomtom.com/map/1';
const TOMTOM_SEARCH = 'https://api.tomtom.com/search/2';
const TOMTOM_ROUTING = 'https://api.tomtom.com/routing/1';
const TOMTOM_TRAFFIC = 'https://api.tomtom.com/traffic/services/5';
```

### SDK Installation (Web)

```bash
# NPM package (for SDK approach)
npm install @tomtom-international/web-sdk-maps
npm install @tomtom-international/web-sdk-services

# Or via CDN
# Maps: https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/
# Services: https://api.tomtom.com/maps-sdk-for-web/cdn/services/6.x/
```

---

## Core APIs Overview

### API Categories

| API | Purpose | Use Case |
|-----|---------|----------|
| **Maps Display** | Render maps (raster/vector) | Interactive map UI |
| **Search** | POI, address, category search | Location discovery |
| **Geocoding** | Address to coordinates | Address lookup |
| **Reverse Geocoding** | Coordinates to address | Location identification |
| **Routing** | Route calculation | Navigation, trip planning |
| **Traffic** | Real-time traffic data | Traffic visualization |
| **Geofencing** | Location monitoring | Area-based triggers |

### Maps Display API

```typescript
import tt from '@tomtom-international/web-sdk-maps';

// Initialize map
const map = tt.map({
    key: TOMTOM_API_KEY,
    container: 'map-container',
    center: [-122.4194, 37.7749], // [lng, lat]
    zoom: 12,
    style: 'tomtom://vector/1/basic-main',
});

// Add marker
const marker = new tt.Marker()
    .setLngLat([-122.4194, 37.7749])
    .addTo(map);

// Add popup
const popup = new tt.Popup({ offset: 30 })
    .setHTML('<h3>San Francisco</h3>');
marker.setPopup(popup);

// Map events
map.on('load', () => console.log('Map loaded'));
map.on('click', (e) => console.log('Clicked:', e.lngLat));
```

### Search API

```typescript
import tt from '@tomtom-international/web-sdk-services';

// Fuzzy search (addresses + POIs)
const searchResults = await tt.services.fuzzySearch({
    key: TOMTOM_API_KEY,
    query: 'coffee shop',
    center: { lat: 37.7749, lng: -122.4194 },
    radius: 5000, // meters
    limit: 10,
});

// Category search
const poiResults = await tt.services.categorySearch({
    key: TOMTOM_API_KEY,
    query: 'restaurant',
    categorySet: '7315', // Restaurant category code
});

// Nearby search
const nearbyResults = await tt.services.nearbySearch({
    key: TOMTOM_API_KEY,
    center: { lat: 37.7749, lng: -122.4194 },
    radius: 1000,
    categorySet: '7376', // Gas station
});
```

### Geocoding API

```typescript
// Forward geocoding (address to coordinates)
const geocodeResult = await tt.services.geocode({
    key: TOMTOM_API_KEY,
    query: '1600 Amphitheatre Parkway, Mountain View, CA',
});

const { lat, lon } = geocodeResult.results[0].position;

// Reverse geocoding (coordinates to address)
const reverseResult = await tt.services.reverseGeocode({
    key: TOMTOM_API_KEY,
    position: { lat: 37.4220, lng: -122.0841 },
});

const address = reverseResult.addresses[0].address.freeformAddress;
```

---

## Routing API

### Basic Route Calculation

```typescript
// Calculate route
const routeResult = await tt.services.calculateRoute({
    key: TOMTOM_API_KEY,
    locations: [
        { lat: 37.7749, lng: -122.4194 }, // Start
        { lat: 37.3382, lng: -121.8863 }, // End
    ],
    travelMode: 'car',
    traffic: true,
    departAt: new Date(),
});

const route = routeResult.routes[0];
const summary = route.summary;

console.log('Distance:', summary.lengthInMeters / 1000, 'km');
console.log('Time:', summary.travelTimeInSeconds / 60, 'minutes');
console.log('Traffic delay:', summary.trafficDelayInSeconds, 'seconds');
```

### Route Options

```typescript
const routeWithOptions = await tt.services.calculateRoute({
    key: TOMTOM_API_KEY,
    locations: [startPoint, endPoint],
    travelMode: 'car', // car, truck, taxi, bus, van, motorcycle, bicycle, pedestrian
    routeType: 'fastest', // fastest, shortest, eco, thrilling
    traffic: true,
    avoid: ['tollRoads', 'motorways', 'ferries', 'unpavedRoads'],
    departAt: new Date('2024-12-01T09:00:00'),
    vehicleMaxSpeed: 120, // km/h
    vehicleWeight: 2000, // kg
    vehicleLength: 5, // meters
    vehicleWidth: 2, // meters
    vehicleHeight: 2, // meters
});
```

### Multi-Stop Routes

```typescript
// Route with waypoints
const multiStopRoute = await tt.services.calculateRoute({
    key: TOMTOM_API_KEY,
    locations: [
        { lat: 37.7749, lng: -122.4194 }, // Start
        { lat: 37.5585, lng: -122.2711 }, // Waypoint 1
        { lat: 37.4419, lng: -122.1430 }, // Waypoint 2
        { lat: 37.3382, lng: -121.8863 }, // End
    ],
    computeBestOrder: true, // Optimize waypoint order
});
```

### Display Route on Map

```typescript
// Add route to map
const geojson = routeResult.toGeoJson();

map.addLayer({
    id: 'route',
    type: 'line',
    source: {
        type: 'geojson',
        data: geojson,
    },
    paint: {
        'line-color': '#4a90d9',
        'line-width': 6,
    },
});

// Fit map to route bounds
const bounds = new tt.LngLatBounds();
geojson.features[0].geometry.coordinates.forEach((coord) => {
    bounds.extend(coord);
});
map.fitBounds(bounds, { padding: 50 });
```

---

## Traffic API

### Traffic Flow

```typescript
// Get traffic flow data
const flowUrl = `${TOMTOM_TRAFFIC}/flowSegmentData/absolute/10/json`;
const response = await fetch(
    `${flowUrl}?key=${TOMTOM_API_KEY}&point=37.7749,-122.4194`
);
const flowData = await response.json();

const {
    currentSpeed,
    freeFlowSpeed,
    currentTravelTime,
    freeFlowTravelTime,
    confidence,
} = flowData.flowSegmentData;
```

### Traffic Incidents

```typescript
// Get traffic incidents in bounding box
const incidentsUrl = `${TOMTOM_BASE}/traffic/services/5/incidentDetails`;
const params = new URLSearchParams({
    key: TOMTOM_API_KEY,
    bbox: '-122.5,37.5,-122.3,37.9', // minLon,minLat,maxLon,maxLat
    fields: '{incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description}}}}',
});

const incidents = await fetch(`${incidentsUrl}?${params}`).then(r => r.json());
```

### Traffic Tiles on Map

```typescript
// Add traffic flow layer
map.addSource('traffic-flow', {
    type: 'raster',
    tiles: [
        `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${TOMTOM_API_KEY}`,
    ],
    tileSize: 256,
});

map.addLayer({
    id: 'traffic-flow-layer',
    type: 'raster',
    source: 'traffic-flow',
});
```

---

## REST API Patterns

### Generic API Request

```typescript
interface TomTomApiConfig {
    apiKey: string;
    baseUrl?: string;
}

class TomTomApi {
    private apiKey: string;
    private baseUrl: string;

    constructor(config: TomTomApiConfig) {
        this.apiKey = config.apiKey;
        this.baseUrl = config.baseUrl || 'https://api.tomtom.com';
    }

    async request<T>(
        endpoint: string,
        params: Record<string, string | number> = {}
    ): Promise<T> {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        url.searchParams.set('key', this.apiKey);

        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, String(value));
        });

        const response = await fetch(url.toString());

        if (!response.ok) {
            throw new TomTomApiError(response.status, await response.text());
        }

        return response.json();
    }

    // Geocode
    async geocode(query: string, options: GeocodeOptions = {}) {
        return this.request(`/search/2/geocode/${encodeURIComponent(query)}.json`, {
            limit: options.limit || 10,
            ...(options.countrySet && { countrySet: options.countrySet }),
            ...(options.language && { language: options.language }),
        });
    }

    // Search
    async search(query: string, options: SearchOptions = {}) {
        return this.request(`/search/2/search/${encodeURIComponent(query)}.json`, {
            limit: options.limit || 10,
            ...(options.lat && { lat: options.lat }),
            ...(options.lon && { lon: options.lon }),
            ...(options.radius && { radius: options.radius }),
        });
    }

    // Route
    async calculateRoute(locations: LatLng[], options: RouteOptions = {}) {
        const coords = locations.map(l => `${l.lat},${l.lng}`).join(':');
        return this.request(`/routing/1/calculateRoute/${coords}/json`, {
            travelMode: options.travelMode || 'car',
            traffic: options.traffic !== false,
            ...(options.routeType && { routeType: options.routeType }),
            ...(options.avoid && { avoid: options.avoid.join(',') }),
        });
    }
}
```

### Error Handling

```typescript
class TomTomApiError extends Error {
    constructor(
        public statusCode: number,
        public responseBody: string
    ) {
        super(`TomTom API Error ${statusCode}: ${responseBody}`);
        this.name = 'TomTomApiError';
    }
}

// Retry logic with exponential backoff
async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (error instanceof TomTomApiError) {
                // Don't retry client errors (4xx)
                if (error.statusCode >= 400 && error.statusCode < 500) {
                    throw error;
                }
            }

            if (attempt === maxRetries) throw error;

            const delay = baseDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error('Retry logic error');
}
```

---

## Common Commands Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/search/2/search/{query}.json` | GET | Fuzzy search |
| `/search/2/geocode/{query}.json` | GET | Forward geocoding |
| `/search/2/reverseGeocode/{position}.json` | GET | Reverse geocoding |
| `/search/2/nearbySearch/.json` | GET | Search nearby location |
| `/search/2/poiSearch/{query}.json` | GET | POI search |
| `/routing/1/calculateRoute/{locations}/json` | GET | Calculate route |
| `/routing/1/calculateReachableRange/{origin}/json` | GET | Reachable range |
| `/traffic/services/5/flowSegmentData` | GET | Traffic flow data |
| `/traffic/services/5/incidentDetails` | GET | Traffic incidents |

---

## Gotchas & Real-World Warnings

### Web SDK v6 Is Being Withdrawn

**CRITICAL: TomTom Maps SDK for Web v6 is deprecated and will stop working February 1, 2026:**

```typescript
// DANGER: This code will stop working
import tt from '@tomtom-international/web-sdk-maps';
const map = tt.map({ key: API_KEY, container: 'map' });

// MIGRATION: Use MapLibre GL JS with TomTom REST APIs
import maplibregl from 'maplibre-gl';

const map = new maplibregl.Map({
    container: 'map',
    style: `https://api.tomtom.com/style/1/style/22.2.1-*?map=basic_main&key=${API_KEY}`,
    center: [-122.4194, 37.7749],
    zoom: 12,
});

// See maplibre-animation skill for MapLibre patterns
```

### API Costs Add Up Fast

**Every API call costs money. Development can be expensive:**

| API | Cost (approx) |
|-----|---------------|
| Search | $0.50 per 1,000 |
| Routing | $1.00 per 1,000 |
| Traffic | $1.50 per 1,000 |
| Geocoding | $0.50 per 1,000 |

```typescript
// DANGER: Autocomplete on every keystroke
input.addEventListener('input', async (e) => {
    const results = await tt.services.fuzzySearch({
        query: e.target.value  // 10 chars typed = 10 API calls
    });
});

// BETTER: Debounce and minimum character threshold
const debouncedSearch = debounce(async (query) => {
    if (query.length < 3) return;  // Don't search short strings
    const results = await tt.services.fuzzySearch({ query });
}, 300);
```

### Rate Limits Aren't Generous

**Free tier: 2,500 requests/day. That's ~100 requests/hour:**

```typescript
// DANGER: No rate limit handling
const route = await tt.services.calculateRoute({ ... });

// REALITY: After 2,500 requests
// Error: 429 Too Many Requests

// BETTER: Implement rate limiting and queuing
const rateLimiter = {
    queue: [],
    processing: false,
    async add(request) {
        return new Promise((resolve, reject) => {
            this.queue.push({ request, resolve, reject });
            this.process();
        });
    },
    async process() {
        if (this.processing || this.queue.length === 0) return;
        this.processing = true;
        const { request, resolve, reject } = this.queue.shift();
        try {
            const result = await request();
            resolve(result);
        } catch (e) {
            if (e.status === 429) {
                await new Promise(r => setTimeout(r, 60000));  // Wait 1 minute
                this.queue.unshift({ request, resolve, reject });
            } else {
                reject(e);
            }
        }
        this.processing = false;
        setTimeout(() => this.process(), 100);  // 10 requests/second max
    }
};
```

### Coordinates Are [lng, lat], Not [lat, lng]

**GeoJSON and TomTom use longitude-first. Google Maps uses latitude-first:**

```typescript
// DANGER: Wrong coordinate order
const map = tt.map({
    center: [37.7749, -122.4194],  // WRONG: lat, lng
});
// Map centers on wrong location (somewhere in Antarctica)

// CORRECT: TomTom uses [longitude, latitude]
const map = tt.map({
    center: [-122.4194, 37.7749],  // RIGHT: lng, lat
});

// GOTCHA: Services API uses object format
const results = await tt.services.fuzzySearch({
    center: { lat: 37.7749, lng: -122.4194 },  // Object uses lat/lng keys
});
```

### Traffic Data Has Coverage Gaps

**Real-time traffic isn't available everywhere:**

```typescript
// DANGER: Assuming traffic data exists
const route = await tt.services.calculateRoute({
    traffic: true,
    departAt: new Date(),
});

// In rural areas or developing countries:
// - trafficDelayInSeconds: 0 (not "no traffic", just "no data")
// - freeFlowSpeed might be inaccurate

// BETTER: Check confidence score
const flowData = await getTrafficFlow(point);
if (flowData.confidence < 0.5) {
    // Low confidence - traffic data may be unreliable
    showWarning('Traffic data limited in this area');
}
```

### What These Patterns Don't Tell You

1. **API key exposure** - Restrict keys by domain/IP in TomTom dashboard
2. **Offline support** - No offline maps; need different solution for offline use
3. **Map styles** - Custom styles require TomTom Map Styler or manual JSON
4. **3D buildings** - Not available in all areas or zoom levels
5. **Batch API** - For 100+ routing requests, use Batch Routing API (different pricing)
6. **EV routing** - Requires vehicle model data; not all EVs are supported

---

## Anti-Patterns to Avoid

- Hardcoding API keys in source code
- Not handling rate limiting (429 errors)
- Making excessive API calls without caching
- Ignoring CORS configuration for web apps
- Not validating user input before API calls
- Using synchronous blocking for API calls
- Ignoring traffic data for time-sensitive routes

---

## Navigation Guide

| Need to... | Read this |
|------------|-----------|
| Display interactive maps | [maps-display.md](resources/maps-display.md) |
| Search locations/POIs | [search-geocoding.md](resources/search-geocoding.md) |
| Calculate routes | [routing-navigation.md](resources/routing-navigation.md) |
| Show traffic data | [traffic-api.md](resources/traffic-api.md) |
| Integrate SDK | [sdk-integration.md](resources/sdk-integration.md) |
| See full examples | [complete-examples.md](resources/complete-examples.md) |

---

## Resource Files

### [maps-display.md](resources/maps-display.md)
Map initialization, markers, popups, layers, styles, controls

### [search-geocoding.md](resources/search-geocoding.md)
Fuzzy search, geocoding, reverse geocoding, POI search, autocomplete

### [routing-navigation.md](resources/routing-navigation.md)
Route calculation, waypoints, EV routing, reachable range, matrix routing

### [traffic-api.md](resources/traffic-api.md)
Traffic flow, incidents, tiles, real-time data integration

### [sdk-integration.md](resources/sdk-integration.md)
SDK setup, React integration, TypeScript types, best practices

### [complete-examples.md](resources/complete-examples.md)
Full implementation examples and real-world patterns

---

## External Resources

- [TomTom Developer Portal](https://developer.tomtom.com/)
- [Maps SDK Documentation](https://developer.tomtom.com/maps-sdk-web-js/documentation)
- [Search API](https://developer.tomtom.com/search-api/documentation)
- [Routing API](https://developer.tomtom.com/routing-api/documentation)
- [Traffic API](https://developer.tomtom.com/traffic-api/documentation)
- [Geocoding API](https://developer.tomtom.com/geocoding-api/documentation)

---

**Skill Status**: COMPLETE
**Line Count**: < 450
**Progressive Disclosure**: 6 resource files
