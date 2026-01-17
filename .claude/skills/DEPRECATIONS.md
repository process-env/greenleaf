# Skill Deprecation Registry

**Last Updated:** 2026-01-11

This file tracks deprecated APIs, patterns, and skills that require attention or migration.

---

## Active Deprecation Warnings

### Critical (Action Required)

| Skill | Deprecated Item | Removal/EOL Date | Migration Path |
|-------|-----------------|------------------|----------------|
| tomtom-maps | TomTom Web SDK v6 | 2026-02-01 | Migrate to MapLibre GL JS |
| firecrawl | v0 API endpoints | 2025-04-01 (past) | Use v1/v2 endpoints |

### Moderate (Plan Migration)

| Skill | Deprecated Item | Status | Migration Path |
|-------|-----------------|--------|----------------|
| error-tracking | Sentry v8 `getCurrentHub()` | Removed in v9 | Use new scope APIs |
| error-tracking | Sentry v8 `Hub` class | Removed in v9 | Use `Sentry.withScope()` |
| nextjs-patterns | `unstable_cache` | Deprecated | Use `use cache` directive |
| nextjs-patterns | `experimental.ppr` | Graduated | Use `experimental: { ppr: true }` |

### Informational (Awareness)

| Skill | Item | Note |
|-------|------|------|
| framer-motion | `framer-motion` package name | Rebranded to `motion` - both work |
| react-hooks | `useFormState` | Renamed to `useActionState` in React 19 |
| shadcn-patterns | HSL color system | OKLCH is now default |

---

## Detailed Deprecation Notes

### TomTom Web SDK v6 (CRITICAL)

**Status:** End of Life - February 1, 2026

**Impact:** The `tomtom-maps` skill references Web SDK v6 patterns that will stop working.

**Migration:**
1. Replace TomTom Maps SDK with MapLibre GL JS
2. Use TomTom REST APIs directly for search/routing
3. Consider `maplibre-animation` skill for map functionality

**References:**
- [TomTom SDK Deprecation Notice](https://developer.tomtom.com/maps-sdk-web-js/overview/product-information/introduction)
- [MapLibre GL JS Documentation](https://maplibre.org/maplibre-gl-js/docs/)

---

### Sentry v8 to v9 Migration

**Status:** v9 Released - Update Required

**Breaking Changes:**
1. `Hub` class removed - use `Sentry.withScope()` instead
2. `getCurrentHub()` removed - use new scope APIs
3. Minimum Node.js version: 18+
4. ECMAScript 2020 required

**Migration Example:**
```typescript
// OLD (v8)
const hub = Sentry.getCurrentHub();
hub.withScope((scope) => {
  scope.setTag('key', 'value');
  hub.captureException(error);
});

// NEW (v9)
Sentry.withScope((scope) => {
  scope.setTag('key', 'value');
  Sentry.captureException(error);
});
```

**References:**
- [Sentry v8 to v9 Migration Guide](https://docs.sentry.io/platforms/javascript/migration/v8-to-v9/)

---

### Next.js Cache API Changes

**Status:** `unstable_cache` deprecated in favor of `use cache`

**Migration:**
```typescript
// OLD (Next.js 14)
import { unstable_cache } from 'next/cache';

const getCachedData = unstable_cache(
  async () => fetchData(),
  ['cache-key'],
  { revalidate: 3600 }
);

// NEW (Next.js 15/16)
async function getCachedData() {
  'use cache';
  return fetchData();
}
```

**References:**
- [Next.js Caching Documentation](https://nextjs.org/docs/app/building-your-application/caching)

---

### Framer Motion to Motion Rebrand

**Status:** Rebranded - Both packages work

**Migration:**
```typescript
// OLD
import { motion, AnimatePresence } from 'framer-motion';

// NEW (recommended)
import { motion, AnimatePresence } from 'motion/react';
```

**Note:** The `framer-motion` package still works but new features are in `motion`.

---

## Deprecation Timeline

```
2025-04 | Firecrawl v0 endpoints EOL
2026-01 | Current date - skill updates applied
2026-02 | TomTom Web SDK v6 EOL
```

---

## Adding New Deprecations

When adding a deprecation notice:

1. Add to appropriate table above (Critical/Moderate/Informational)
2. Add detailed notes section if migration is complex
3. Update the relevant skill's SKILL.md with inline warning
4. Update VERSIONS.md status column

**Inline Warning Format:**
```markdown
> **Deprecation Warning (2026-01-11):** The `exampleAPI()` is deprecated.
> Removal date: YYYY-MM-DD. See [DEPRECATIONS.md](../DEPRECATIONS.md) for migration.
```
