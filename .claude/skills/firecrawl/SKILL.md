---
name: firecrawl
description: Firecrawl web scraping and crawling API for extracting clean markdown/HTML from websites. Covers scraping, crawling, batch operations, structured data extraction with LLM, /agent endpoint, change tracking, deep research, and LLMs.txt generation.
version: "2.0.0"
lastUpdated: "2026-01-11"
frameworkVersions:
  firecrawl: "v2.7+"
---

# Firecrawl

> **Updated 2026-01-11:** Updated to v2.7 features. Added `/agent` endpoint documentation and change tracking feature. Note: v0 endpoints are deprecated.

## Purpose

Comprehensive guide for web scraping and crawling using Firecrawl's API. Convert any website into clean, LLM-ready markdown or structured data with support for JavaScript rendering, anti-bot bypassing, and intelligent extraction.

## When to Use This Skill

Automatically activates when working on:
- Web scraping or crawling tasks
- Converting websites to markdown
- Extracting structured data from web pages
- Building RAG pipelines with web content
- Research automation and data collection
- Generating LLMs.txt for websites

---

## Quick Start

### Installation

```bash
npm install @mendable/firecrawl-js
```

### Basic Setup

```typescript
import FirecrawlApp from '@mendable/firecrawl-js';

const firecrawl = new FirecrawlApp({
    apiKey: process.env.FIRECRAWL_API_KEY,
    // Optional: self-hosted instance
    // apiUrl: 'https://your-firecrawl-instance.com'
});
```

---

## Core Operations

### Scrape a Single URL

Get clean markdown from any webpage:

```typescript
const result = await firecrawl.scrapeUrl('https://example.com/page', {
    formats: ['markdown', 'html', 'links'],
    onlyMainContent: true,
});

if (result.success) {
    console.log(result.markdown);  // Clean markdown content
    console.log(result.metadata);  // Title, description, og tags
    console.log(result.links);     // All links on page
}
```

### Scrape with Screenshots

```typescript
const result = await firecrawl.scrapeUrl('https://example.com', {
    formats: ['markdown', 'screenshot'],
});

// result.screenshot contains base64 image
```

### Scrape with Full Page Screenshot

```typescript
const result = await firecrawl.scrapeUrl('https://example.com', {
    formats: ['markdown', 'screenshot@fullPage'],
});
```

---

## Crawling Websites

### Crawl Entire Site

```typescript
const result = await firecrawl.crawlUrl('https://example.com', {
    limit: 100,              // Max pages to crawl
    maxDepth: 3,             // How deep to crawl
    includePaths: ['/blog/*', '/docs/*'],
    excludePaths: ['/admin/*'],
    scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true,
    },
});

if (result.success) {
    for (const doc of result.data) {
        console.log(doc.url);
        console.log(doc.markdown);
    }
}
```

### Async Crawl with Status Checking

```typescript
// Start crawl
const crawlJob = await firecrawl.asyncCrawlUrl('https://example.com', {
    limit: 500,
    maxDepth: 5,
});

// Check status periodically
const status = await firecrawl.checkCrawlStatus(crawlJob.id);
console.log(`Progress: ${status.completed}/${status.total}`);

// Get results when done
if (status.status === 'completed') {
    for (const doc of status.data) {
        console.log(doc.markdown);
    }
}
```

### Crawl with WebSocket Monitoring

```typescript
const watcher = await firecrawl.crawlUrlAndWatch('https://example.com', {
    limit: 100,
});

watcher.addEventListener('document', (event) => {
    console.log('New page:', event.detail.url);
    console.log(event.detail.markdown);
});

watcher.addEventListener('done', (event) => {
    console.log('Crawl complete!', event.detail.data.length, 'pages');
});

watcher.addEventListener('error', (event) => {
    console.error('Crawl failed:', event.detail.error);
});
```

---

## Map URLs

Discover all URLs on a website without scraping content:

```typescript
const result = await firecrawl.mapUrl('https://example.com', {
    search: 'blog',          // Optional: filter by search term
    includeSubdomains: true,
    limit: 1000,
});

if (result.success) {
    console.log(result.links);  // Array of discovered URLs
}
```

---

## Batch Scraping

Scrape multiple URLs efficiently:

```typescript
const urls = [
    'https://example.com/page1',
    'https://example.com/page2',
    'https://example.com/page3',
];

const result = await firecrawl.batchScrapeUrls(urls, {
    formats: ['markdown'],
    onlyMainContent: true,
});

for (const doc of result.data) {
    console.log(doc.url, doc.markdown);
}
```

### Async Batch with Monitoring

```typescript
const watcher = await firecrawl.batchScrapeUrlsAndWatch(urls, {
    formats: ['markdown'],
});

watcher.addEventListener('document', (event) => {
    console.log('Scraped:', event.detail.url);
});
```

---

## Structured Data Extraction

Extract structured data using LLM and Zod schemas:

```typescript
import { z } from 'zod';

const ProductSchema = z.object({
    name: z.string(),
    price: z.number(),
    description: z.string(),
    features: z.array(z.string()),
    inStock: z.boolean(),
});

const result = await firecrawl.scrapeUrl('https://example.com/product', {
    formats: ['extract'],
    extract: {
        schema: ProductSchema,
        prompt: 'Extract the product information from this page',
    },
});

// result.extract is typed as z.infer<typeof ProductSchema>
console.log(result.extract?.name);
console.log(result.extract?.price);
```

### Extract from Multiple URLs

```typescript
const CompanySchema = z.object({
    name: z.string(),
    founded: z.string(),
    employees: z.number(),
    headquarters: z.string(),
});

const result = await firecrawl.extract(
    ['https://company1.com/about', 'https://company2.com/about'],
    {
        schema: CompanySchema,
        prompt: 'Extract company information',
        allowExternalLinks: false,
    }
);

console.log(result.data);
```

---

## Deep Research

Conduct AI-powered research on a topic:

```typescript
const result = await firecrawl.deepResearch(
    'What are the latest trends in AI development?',
    {
        maxDepth: 5,       // Research depth (1-10)
        maxUrls: 20,       // Max URLs to analyze
        timeLimit: 180,    // Seconds (30-300)
    },
    // Activity callback
    (activity) => {
        console.log(`[${activity.type}] ${activity.message}`);
    },
    // Source callback
    (source) => {
        console.log(`Found source: ${source.url}`);
    }
);

console.log(result.data.finalAnalysis);
console.log(result.data.sources);
```

### Async Deep Research

```typescript
const job = await firecrawl.asyncDeepResearch(
    'Latest developments in quantum computing',
    { maxDepth: 7, maxUrls: 30 }
);

// Check status
const status = await firecrawl.checkDeepResearchStatus(job.id);
if (status.status === 'completed') {
    console.log(status.data.finalAnalysis);
}
```

---

## Generate LLMs.txt

Create LLM-friendly site summaries:

```typescript
const result = await firecrawl.generateLLMsText('https://example.com', {
    maxUrls: 50,
    showFullText: true,
});

console.log(result.data.llmstxt);     // Concise summary
console.log(result.data.llmsfulltxt); // Full content (if showFullText)
```

---

## Actions (Browser Automation)

Perform actions before scraping:

```typescript
const result = await firecrawl.scrapeUrl('https://example.com/dynamic', {
    formats: ['markdown'],
    actions: [
        { type: 'wait', milliseconds: 2000 },
        { type: 'click', selector: '#load-more' },
        { type: 'wait', milliseconds: 1000 },
        { type: 'scroll', direction: 'down' },
        { type: 'screenshot', fullPage: true },
        { type: 'scrape' },
    ],
});

// Access action results
console.log(result.actions.screenshots);  // Base64 images
console.log(result.actions.scrapes);      // Scraped content
```

### Available Actions

| Action | Description | Parameters |
|--------|-------------|------------|
| `wait` | Wait for time/selector | `milliseconds` or `selector` |
| `click` | Click element | `selector`, `all?: boolean` |
| `screenshot` | Take screenshot | `fullPage?: boolean` |
| `write` | Type text | `text` |
| `press` | Press key | `key` |
| `scroll` | Scroll page | `direction: 'up' \| 'down'` |
| `scrape` | Capture page state | - |
| `executeJavascript` | Run JS | `script` |

---

## Scrape Options Reference

```typescript
interface ScrapeParams {
    // Output formats
    formats?: ('markdown' | 'html' | 'rawHtml' | 'links' |
               'screenshot' | 'screenshot@fullPage' | 'extract' | 'json')[];

    // Content filtering
    onlyMainContent?: boolean;     // Remove boilerplate (nav, footer, ads)
    includeTags?: string[];        // Only include specific tags
    excludeTags?: string[];        // Exclude specific tags

    // Rendering
    waitFor?: number;              // Wait ms after page load
    timeout?: number;              // Max wait time
    mobile?: boolean;              // Use mobile viewport

    // Anti-bot
    headers?: Record<string, string>;
    proxy?: 'basic' | 'stealth' | 'auto';
    blockAds?: boolean;
    skipTlsVerification?: boolean;

    // Caching
    storeInCache?: boolean;
    maxAge?: number;               // Cache duration in seconds

    // Geo-targeting
    location?: {
        country?: string;
        languages?: string[];
    };

    // PDF handling
    parsePDF?: boolean;
}
```

---

## Crawl Options Reference

```typescript
interface CrawlParams {
    // Scope control
    limit?: number;                 // Max pages
    maxDepth?: number;              // Link depth
    includePaths?: string[];        // Glob patterns to include
    excludePaths?: string[];        // Glob patterns to exclude
    allowBackwardLinks?: boolean;
    allowExternalLinks?: boolean;
    allowSubdomains?: boolean;
    crawlEntireDomain?: boolean;

    // Rate limiting
    delay?: number;                 // Seconds between requests
    maxConcurrency?: number;

    // Sitemap
    ignoreSitemap?: boolean;

    // URL handling
    deduplicateSimilarURLs?: boolean;
    ignoreQueryParameters?: boolean;

    // Scrape options for each page
    scrapeOptions?: CrawlScrapeOptions;

    // Webhooks
    webhook?: string | {
        url: string;
        headers?: Record<string, string>;
        events?: ('started' | 'page' | 'completed' | 'failed')[];
    };
}
```

---

## Error Handling

```typescript
import FirecrawlApp, { FirecrawlError } from '@mendable/firecrawl-js';

try {
    const result = await firecrawl.scrapeUrl('https://example.com');

    if (!result.success) {
        console.error('Scrape failed:', result.error);
        return;
    }

    console.log(result.markdown);
} catch (error) {
    if (error instanceof FirecrawlError) {
        console.error(`Firecrawl error (${error.statusCode}):`, error.message);
        console.error('Details:', error.details);
    } else {
        throw error;
    }
}
```

---

## Common Patterns

### RAG Pipeline Integration

```typescript
async function ingestWebContent(urls: string[]) {
    const result = await firecrawl.batchScrapeUrls(urls, {
        formats: ['markdown'],
        onlyMainContent: true,
    });

    const documents = result.data.map(doc => ({
        content: doc.markdown,
        metadata: {
            url: doc.url,
            title: doc.metadata?.title,
            source: 'firecrawl',
        },
    }));

    // Feed to your vector store
    await vectorStore.addDocuments(documents);
}
```

### Change Tracking

```typescript
const result = await firecrawl.scrapeUrl('https://example.com/page', {
    formats: ['markdown', 'changeTracking'],
    changeTrackingOptions: {
        modes: ['git-diff'],
        tag: 'daily-check',
    },
});

if (result.changeTracking?.changeStatus === 'changed') {
    console.log('Page changed!');
    console.log('Diff:', result.changeTracking.diff?.text);
}
```

### Webhook Processing

```typescript
// Set up webhook during crawl
await firecrawl.asyncCrawlUrl('https://example.com', {
    limit: 100,
    webhook: {
        url: 'https://your-server.com/webhook',
        events: ['page', 'completed'],
        headers: { 'Authorization': 'Bearer secret' },
    },
});

// Your webhook handler
app.post('/webhook', (req, res) => {
    const { type, data } = req.body;

    if (type === 'page') {
        console.log('New page scraped:', data.url);
    } else if (type === 'completed') {
        console.log('Crawl finished!');
    }

    res.sendStatus(200);
});
```

---

## Gotchas & Real-World Warnings

### Scraping Costs Add Up Fast

**Every page costs money.** A crawl with `limit: 1000` can blow through your monthly quota in one job:

```typescript
// DANGER: Innocent-looking crawl that costs $$$
await firecrawl.crawlUrl('https://large-site.com', {
    limit: 5000,  // 5000 pages × $0.003 = $15 for one crawl
    maxDepth: 10, // Deep crawls find LOTS of pages
});

// SAFER: Start small, increase as needed
await firecrawl.crawlUrl('https://large-site.com', {
    limit: 100,   // Test first
    maxDepth: 3,
    includePaths: ['/docs/*'],  // Scope it down
});
```

### Sites Block Scrapers

**Your scrape works today, fails tomorrow.** Sites actively detect and block scrapers:

| Symptom | Likely Cause |
|---------|-------------|
| Empty content | JavaScript rendering blocked |
| 403/429 errors | Rate limiting / IP blocking |
| CAPTCHA pages | Bot detection triggered |
| Partial content | Anti-scraping measures |

```typescript
// BETTER: Use stealth options for sensitive sites
const result = await firecrawl.scrapeUrl(url, {
    proxy: 'stealth',  // Rotate IPs
    headers: { 'Accept-Language': 'en-US' },  // Look like a browser
    waitFor: 3000,  // Let JS render
});
```

### Structured Extraction Is Probabilistic

**LLM extraction isn't 100% accurate.** It's parsing unstructured HTML with AI:

```typescript
// DANGER: Trusting extraction blindly
const { extract } = await firecrawl.scrapeUrl(url, {
    extract: { schema: ProductSchema },
});
await db.products.create({ data: extract });  // Could have wrong/missing fields!

// SAFER: Validate before using
const parsed = ProductSchema.safeParse(extract);
if (!parsed.success) {
    console.warn('Extraction incomplete:', parsed.error);
    // Handle gracefully
}
```

### Cached Content Goes Stale

**`storeInCache` saves money but returns old data:**

```typescript
// DANGER: Showing week-old prices
const result = await firecrawl.scrapeUrl('https://shop.com/product', {
    storeInCache: true,
    maxAge: 604800,  // 1 week
});

// BETTER: Balance freshness vs cost
const result = await firecrawl.scrapeUrl(url, {
    storeInCache: true,
    maxAge: 3600,  // 1 hour for time-sensitive data
});
```

### Legal and Ethical Considerations

**Just because you CAN scrape doesn't mean you SHOULD:**

1. **robots.txt** - Firecrawl ignores it by default; you might be violating site terms
2. **Rate limiting** - Aggressive scraping can DDoS small sites
3. **Copyright** - Scraped content may be copyrighted
4. **Terms of Service** - Many sites explicitly prohibit scraping
5. **Personal data** - GDPR/CCPA implications if scraping user data

### What These Patterns Don't Tell You

1. **Webhook reliability** - Your webhook endpoint must be idempotent; events can be delivered multiple times
2. **Large crawl management** - Crawls over 10K pages need careful monitoring and chunking
3. **Content changes** - Change tracking requires a baseline scrape first
4. **Screenshot storage** - Base64 screenshots are huge; store them externally
5. **JavaScript-heavy sites** - Some SPAs require `actions` to trigger content loading
6. **Concurrent limits** - Your plan has API concurrency limits that affect parallel operations

---

## Anti-Patterns to Avoid

- **Not using onlyMainContent** when you need clean text (includes nav/footer)
- **Ignoring rate limits** (respect `delay` option, use webhooks for large crawls)
- **Not handling errors** (network issues, blocked requests happen)
- **Scraping too aggressively** (use appropriate concurrency/delay)
- **Missing cache** (use `storeInCache` for repeated requests)
- **Huge batch without async** (use async + webhooks for 100+ URLs)

---

## API Limits & Best Practices

| Tier | Rate Limit | Recommendation |
|------|------------|----------------|
| Free | 100 pages/month | Testing only |
| Starter | 3,000 pages/month | Small projects |
| Standard | 100,000 pages/month | Production apps |

**Best Practices:**
1. Use `onlyMainContent: true` for cleaner output
2. Set appropriate `limit` and `maxDepth` for crawls
3. Use async operations + webhooks for large jobs
4. Cache results when possible
5. Use structured extraction for consistent data

---

## Resource Files

### [scraping-patterns.md](resources/scraping-patterns.md)
Advanced scraping techniques, handling SPAs, authentication, and anti-bot bypass

### [extraction-examples.md](resources/extraction-examples.md)
Real-world extraction schemas and patterns for e-commerce, news, documentation sites

### [complete-examples.md](resources/complete-examples.md)
Full implementation examples: RAG pipelines, monitoring tools, research automation

---

**Skill Status**: COMPLETE
**Line Count**: < 450
**Progressive Disclosure**: 3 resource files
