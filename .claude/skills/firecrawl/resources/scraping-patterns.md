# Scraping Patterns

## Handling Single Page Applications (SPAs)

SPAs load content dynamically. Use wait and actions to ensure content loads.

### Wait for Content

```typescript
const result = await firecrawl.scrapeUrl('https://spa-site.com', {
    formats: ['markdown'],
    waitFor: 5000,  // Wait 5 seconds for JS to execute
});
```

### Wait for Specific Element

```typescript
const result = await firecrawl.scrapeUrl('https://spa-site.com', {
    formats: ['markdown'],
    actions: [
        { type: 'wait', selector: '.content-loaded' },
        { type: 'scrape' },
    ],
});
```

### Handle Infinite Scroll

```typescript
const result = await firecrawl.scrapeUrl('https://infinite-scroll.com', {
    formats: ['markdown'],
    actions: [
        { type: 'wait', milliseconds: 2000 },
        { type: 'scroll', direction: 'down' },
        { type: 'wait', milliseconds: 1000 },
        { type: 'scroll', direction: 'down' },
        { type: 'wait', milliseconds: 1000 },
        { type: 'scroll', direction: 'down' },
        { type: 'wait', milliseconds: 1000 },
        { type: 'scrape' },
    ],
});
```

---

## Authentication Patterns

### Cookie-Based Auth

```typescript
const result = await firecrawl.scrapeUrl('https://protected-site.com/dashboard', {
    formats: ['markdown'],
    headers: {
        'Cookie': 'session=abc123; auth_token=xyz789',
    },
});
```

### Bearer Token

```typescript
const result = await firecrawl.scrapeUrl('https://api-site.com/content', {
    formats: ['markdown'],
    headers: {
        'Authorization': 'Bearer your-token-here',
    },
});
```

### Login Flow with Actions

```typescript
const result = await firecrawl.scrapeUrl('https://site.com/login', {
    formats: ['markdown'],
    actions: [
        { type: 'wait', selector: '#email' },
        { type: 'click', selector: '#email' },
        { type: 'write', text: 'user@example.com' },
        { type: 'click', selector: '#password' },
        { type: 'write', text: 'password123' },
        { type: 'click', selector: '#submit' },
        { type: 'wait', milliseconds: 3000 },
        { type: 'scrape' },
    ],
});
```

---

## Anti-Bot Bypass Strategies

### Use Stealth Proxy

```typescript
const result = await firecrawl.scrapeUrl('https://protected-site.com', {
    formats: ['markdown'],
    proxy: 'stealth',  // Uses rotating residential proxies
    blockAds: true,
});
```

### Geographic Targeting

```typescript
const result = await firecrawl.scrapeUrl('https://geo-restricted.com', {
    formats: ['markdown'],
    location: {
        country: 'US',
        languages: ['en-US'],
    },
    proxy: 'stealth',
});
```

### Custom Headers

```typescript
const result = await firecrawl.scrapeUrl('https://site.com', {
    formats: ['markdown'],
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://google.com',
    },
});
```

---

## Content Filtering

### Include Only Specific Elements

```typescript
const result = await firecrawl.scrapeUrl('https://news-site.com/article', {
    formats: ['markdown'],
    includeTags: ['article', 'main', '.article-content'],
});
```

### Exclude Unwanted Elements

```typescript
const result = await firecrawl.scrapeUrl('https://site.com', {
    formats: ['markdown'],
    excludeTags: ['nav', 'footer', '.ads', '.sidebar', '.comments'],
    onlyMainContent: true,
});
```

---

## Mobile vs Desktop

### Mobile View

```typescript
const result = await firecrawl.scrapeUrl('https://responsive-site.com', {
    formats: ['markdown', 'screenshot'],
    mobile: true,
});
```

### Compare Both Views

```typescript
const [desktop, mobile] = await Promise.all([
    firecrawl.scrapeUrl('https://site.com', {
        formats: ['screenshot'],
        mobile: false,
    }),
    firecrawl.scrapeUrl('https://site.com', {
        formats: ['screenshot'],
        mobile: true,
    }),
]);
```

---

## PDF Handling

```typescript
const result = await firecrawl.scrapeUrl('https://site.com/document.pdf', {
    formats: ['markdown'],
    parsePDF: true,
});

console.log(result.markdown);  // PDF content as markdown
```

---

## Caching Strategies

### Enable Caching

```typescript
const result = await firecrawl.scrapeUrl('https://slow-site.com', {
    formats: ['markdown'],
    storeInCache: true,
    maxAge: 3600,  // Cache for 1 hour
});

// Check if result was cached
console.log(result.metadata?.cacheState);  // 'hit' or 'miss'
```

### Force Fresh Content

```typescript
const result = await firecrawl.scrapeUrl('https://site.com', {
    formats: ['markdown'],
    storeInCache: false,  // Don't cache
});
```

---

## Timeout Handling

```typescript
const result = await firecrawl.scrapeUrl('https://slow-site.com', {
    formats: ['markdown'],
    timeout: 60000,  // 60 second timeout
    waitFor: 10000,  // Wait 10 seconds for content
});
```

---

## Parallel Scraping with Rate Limiting

```typescript
async function scrapeWithRateLimit(urls: string[], concurrency: number = 5) {
    const results: ScrapeResponse[] = [];
    const chunks: string[][] = [];

    // Split into chunks
    for (let i = 0; i < urls.length; i += concurrency) {
        chunks.push(urls.slice(i, i + concurrency));
    }

    for (const chunk of chunks) {
        const chunkResults = await Promise.all(
            chunk.map(url => firecrawl.scrapeUrl(url, {
                formats: ['markdown'],
                onlyMainContent: true,
            }))
        );

        results.push(...chunkResults.filter(r => r.success));

        // Rate limit: wait between chunks
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
}
```

---

## Error Recovery

```typescript
async function scrapeWithRetry(
    url: string,
    maxRetries: number = 3
): Promise<ScrapeResponse | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await firecrawl.scrapeUrl(url, {
                formats: ['markdown'],
                proxy: attempt > 1 ? 'stealth' : 'basic',  // Escalate proxy on retry
                timeout: 30000 * attempt,  // Increase timeout on retry
            });

            if (result.success) return result;

            console.warn(`Attempt ${attempt} failed:`, result.error);
        } catch (error) {
            console.error(`Attempt ${attempt} threw error:`, error);
        }

        if (attempt < maxRetries) {
            await new Promise(resolve =>
                setTimeout(resolve, 1000 * Math.pow(2, attempt))  // Exponential backoff
            );
        }
    }

    return null;
}
```
