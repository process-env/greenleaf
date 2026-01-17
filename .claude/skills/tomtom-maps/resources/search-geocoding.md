# Search and Geocoding

## Fuzzy Search

The most versatile search - combines POI and address search.

### Basic Search

```typescript
import tt from '@tomtom-international/web-sdk-services';

const results = await tt.services.fuzzySearch({
    key: TOMTOM_API_KEY,
    query: 'pizza',
});

results.results.forEach((result) => {
    console.log(result.poi?.name || result.address.freeformAddress);
    console.log(result.position); // { lat, lon }
});
```

### Search with Options

```typescript
const results = await tt.services.fuzzySearch({
    key: TOMTOM_API_KEY,
    query: 'coffee shop',
    center: { lat: 40.7128, lng: -74.006 },
    radius: 5000, // meters
    limit: 20,
    countrySet: 'US',
    language: 'en-US',
    categorySet: '9376006', // Coffee shop category
    brandSet: 'Starbucks',
});
```

---

## Geocoding

### Forward Geocoding

```typescript
const result = await tt.services.geocode({
    key: TOMTOM_API_KEY,
    query: '1600 Amphitheatre Parkway, Mountain View, CA',
});

if (result.results.length > 0) {
    const { lat, lon } = result.results[0].position;
    console.log(`Coordinates: ${lat}, ${lon}`);
}
```

### Reverse Geocoding

```typescript
const result = await tt.services.reverseGeocode({
    key: TOMTOM_API_KEY,
    position: { lat: 40.7484, lng: -73.9857 },
});

const address = result.addresses[0].address.freeformAddress;
```

---

## POI Search

```typescript
const results = await tt.services.categorySearch({
    key: TOMTOM_API_KEY,
    query: 'restaurant',
    center: { lat: 40.7128, lng: -74.006 },
    radius: 2000,
});

// Common category codes
const categories = {
    restaurant: '7315',
    gasStation: '7311',
    parking: '7369',
    hospital: '7321',
    hotel: '7314',
    evCharging: '7309',
};
```

---

## Autocomplete

```typescript
const suggestions = await tt.services.fuzzySearch({
    key: TOMTOM_API_KEY,
    query: 'star',
    typeahead: true,
    limit: 5,
});
```
