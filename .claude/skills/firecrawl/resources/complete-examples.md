# Complete Examples

Full implementation examples for common use cases.

## RAG Pipeline with Firecrawl

Complete implementation for ingesting web content into a vector store.

```typescript
import FirecrawlApp from '@mendable/firecrawl-js';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

const firecrawl = new FirecrawlApp({
    apiKey: process.env.FIRECRAWL_API_KEY,
});

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});

const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
});

interface IngestResult {
    url: string;
    chunks: number;
    success: boolean;
    error?: string;
}

async function ingestWebsiteToRAG(
    startUrl: string,
    options: {
        limit?: number;
        maxDepth?: number;
        indexName: string;
        namespace?: string;
    }
): Promise<IngestResult[]> {
    const results: IngestResult[] = [];

    // Crawl the website
    console.log(`Starting crawl of ${startUrl}...`);
    const crawlResult = await firecrawl.crawlUrl(startUrl, {
        limit: options.limit || 50,
        maxDepth: options.maxDepth || 3,
        scrapeOptions: {
            formats: ['markdown'],
            onlyMainContent: true,
        },
    });

    if (!crawlResult.success) {
        throw new Error(`Crawl failed: ${crawlResult.error}`);
    }

    console.log(`Crawled ${crawlResult.data.length} pages`);

    // Set up text splitter
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });

    // Get Pinecone index
    const index = pinecone.Index(options.indexName);

    // Process each page
    for (const doc of crawlResult.data) {
        try {
            if (!doc.markdown) continue;

            // Split into chunks
            const chunks = await splitter.createDocuments(
                [doc.markdown],
                [{
                    url: doc.url,
                    title: doc.metadata?.title || '',
                    description: doc.metadata?.description || '',
                    source: 'firecrawl',
                }]
            );

            // Store in Pinecone
            await PineconeStore.fromDocuments(
                chunks,
                embeddings,
                {
                    pineconeIndex: index,
                    namespace: options.namespace,
                }
            );

            results.push({
                url: doc.url || '',
                chunks: chunks.length,
                success: true,
            });

            console.log(`Ingested ${doc.url}: ${chunks.length} chunks`);
        } catch (error) {
            results.push({
                url: doc.url || '',
                chunks: 0,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    return results;
}

// Usage
const results = await ingestWebsiteToRAG('https://docs.example.com', {
    limit: 100,
    maxDepth: 4,
    indexName: 'documentation',
    namespace: 'example-docs',
});

console.log(`Successfully ingested ${results.filter(r => r.success).length} pages`);
```

---

## Website Monitoring Service

Monitor websites for changes and send notifications.

```typescript
import FirecrawlApp from '@mendable/firecrawl-js';
import { createClient } from '@supabase/supabase-js';

const firecrawl = new FirecrawlApp({
    apiKey: process.env.FIRECRAWL_API_KEY,
});

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
);

interface MonitoredPage {
    id: string;
    url: string;
    name: string;
    checkInterval: number;  // minutes
    lastCheck?: string;
    lastHash?: string;
    webhookUrl?: string;
}

async function checkForChanges(page: MonitoredPage): Promise<{
    changed: boolean;
    diff?: string;
    newContent?: string;
}> {
    const result = await firecrawl.scrapeUrl(page.url, {
        formats: ['markdown', 'changeTracking'],
        changeTrackingOptions: {
            modes: ['git-diff'],
            tag: page.id,  // Use page ID for tracking
        },
        onlyMainContent: true,
    });

    if (!result.success) {
        throw new Error(`Failed to scrape ${page.url}: ${result.error}`);
    }

    const changeStatus = result.changeTracking?.changeStatus;

    if (changeStatus === 'changed') {
        return {
            changed: true,
            diff: result.changeTracking?.diff?.text,
            newContent: result.markdown,
        };
    }

    return { changed: false };
}

async function runMonitoringCycle() {
    // Get pages due for checking
    const { data: pages, error } = await supabase
        .from('monitored_pages')
        .select('*')
        .or(`last_check.is.null,last_check.lt.${new Date(Date.now() - 5 * 60 * 1000).toISOString()}`);

    if (error || !pages) {
        console.error('Failed to fetch pages:', error);
        return;
    }

    for (const page of pages as MonitoredPage[]) {
        try {
            console.log(`Checking ${page.name} (${page.url})...`);

            const { changed, diff, newContent } = await checkForChanges(page);

            // Update last check time
            await supabase
                .from('monitored_pages')
                .update({
                    last_check: new Date().toISOString(),
                    last_content: newContent,
                })
                .eq('id', page.id);

            if (changed) {
                console.log(`Change detected on ${page.name}!`);

                // Log the change
                await supabase.from('page_changes').insert({
                    page_id: page.id,
                    detected_at: new Date().toISOString(),
                    diff,
                    new_content: newContent,
                });

                // Send webhook notification
                if (page.webhookUrl) {
                    await fetch(page.webhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            page: page.name,
                            url: page.url,
                            detectedAt: new Date().toISOString(),
                            diff,
                        }),
                    });
                }
            }
        } catch (error) {
            console.error(`Error checking ${page.url}:`, error);
        }
    }
}

// Run every 5 minutes
setInterval(runMonitoringCycle, 5 * 60 * 1000);
```

---

## Competitive Intelligence Tool

Track competitor pricing and product changes.

```typescript
import FirecrawlApp from '@mendable/firecrawl-js';
import { z } from 'zod';

const firecrawl = new FirecrawlApp({
    apiKey: process.env.FIRECRAWL_API_KEY,
});

const ProductSchema = z.object({
    name: z.string(),
    price: z.number(),
    originalPrice: z.number().optional(),
    inStock: z.boolean(),
    features: z.array(z.string()),
});

interface Competitor {
    name: string;
    productUrls: string[];
}

interface PriceAlert {
    competitor: string;
    product: string;
    previousPrice: number;
    currentPrice: number;
    changePercent: number;
}

async function trackCompetitorPricing(
    competitors: Competitor[]
): Promise<{
    products: Map<string, z.infer<typeof ProductSchema>>;
    alerts: PriceAlert[];
}> {
    const products = new Map<string, z.infer<typeof ProductSchema>>();
    const alerts: PriceAlert[] = [];

    // Load previous prices from storage
    const previousPrices = await loadPreviousPrices();

    for (const competitor of competitors) {
        console.log(`Checking ${competitor.name}...`);

        const result = await firecrawl.batchScrapeUrls(competitor.productUrls, {
            formats: ['extract'],
            extract: {
                schema: ProductSchema,
                prompt: 'Extract product information including current price',
            },
        });

        for (const doc of result.data) {
            if (!doc.extract || !doc.url) continue;

            const product = doc.extract as z.infer<typeof ProductSchema>;
            const key = `${competitor.name}:${doc.url}`;

            products.set(key, product);

            // Check for price change
            const previousPrice = previousPrices.get(key);
            if (previousPrice && previousPrice !== product.price) {
                const changePercent = ((product.price - previousPrice) / previousPrice) * 100;

                alerts.push({
                    competitor: competitor.name,
                    product: product.name,
                    previousPrice,
                    currentPrice: product.price,
                    changePercent,
                });
            }
        }
    }

    // Save current prices for next run
    await savePrices(products);

    return { products, alerts };
}

async function loadPreviousPrices(): Promise<Map<string, number>> {
    // Implementation: Load from database/file
    return new Map();
}

async function savePrices(products: Map<string, z.infer<typeof ProductSchema>>) {
    // Implementation: Save to database/file
}

// Usage
const competitors: Competitor[] = [
    {
        name: 'Competitor A',
        productUrls: [
            'https://competitor-a.com/product/1',
            'https://competitor-a.com/product/2',
        ],
    },
    {
        name: 'Competitor B',
        productUrls: [
            'https://competitor-b.com/item/xyz',
            'https://competitor-b.com/item/abc',
        ],
    },
];

const { products, alerts } = await trackCompetitorPricing(competitors);

for (const alert of alerts) {
    console.log(`PRICE ALERT: ${alert.competitor} - ${alert.product}`);
    console.log(`  Was: $${alert.previousPrice} -> Now: $${alert.currentPrice}`);
    console.log(`  Change: ${alert.changePercent.toFixed(1)}%`);
}
```

---

## Research Automation Agent

Automated research with structured output.

```typescript
import FirecrawlApp from '@mendable/firecrawl-js';
import { z } from 'zod';
import OpenAI from 'openai';

const firecrawl = new FirecrawlApp({
    apiKey: process.env.FIRECRAWL_API_KEY,
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const ResearchTopicSchema = z.object({
    topic: z.string(),
    summary: z.string(),
    keyFindings: z.array(z.object({
        finding: z.string(),
        source: z.string(),
        confidence: z.enum(['high', 'medium', 'low']),
    })),
    statistics: z.array(z.object({
        metric: z.string(),
        value: z.string(),
        source: z.string(),
    })),
    quotes: z.array(z.object({
        quote: z.string(),
        author: z.string(),
        context: z.string(),
    })),
    recommendations: z.array(z.string()),
    furtherReading: z.array(z.object({
        title: z.string(),
        url: z.string(),
        description: z.string(),
    })),
});

async function conductResearch(
    query: string,
    options: {
        depth?: number;
        maxUrls?: number;
        timeLimit?: number;
    } = {}
): Promise<z.infer<typeof ResearchTopicSchema>> {
    console.log(`Starting research on: "${query}"`);

    // Use Firecrawl's deep research
    const researchResult = await firecrawl.deepResearch(
        query,
        {
            maxDepth: options.depth || 5,
            maxUrls: options.maxUrls || 20,
            timeLimit: options.timeLimit || 180,
            formats: ['markdown', 'json'],
            jsonOptions: {
                schema: ResearchTopicSchema,
                prompt: `
                    Analyze the research findings and extract:
                    1. A comprehensive summary of the topic
                    2. Key findings with confidence levels
                    3. Relevant statistics and data points
                    4. Notable quotes from experts
                    5. Actionable recommendations
                    6. Resources for further reading
                `,
            },
        },
        (activity) => {
            console.log(`[${activity.depth}] ${activity.type}: ${activity.message}`);
        },
        (source) => {
            console.log(`  Found source: ${source.title || source.url}`);
        }
    );

    if (!researchResult.success || researchResult.status === 'failed') {
        throw new Error('Research failed');
    }

    // Get the structured output
    const research = researchResult.data;

    // If we didn't get structured output, use OpenAI to structure it
    if (!research.json) {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: 'You are a research analyst. Structure the following research findings into the requested format.',
                },
                {
                    role: 'user',
                    content: `Research findings:\n\n${research.finalAnalysis}\n\nSources:\n${research.sources.map(s => `- ${s.title}: ${s.url}`).join('\n')}`,
                },
            ],
            response_format: { type: 'json_object' },
        });

        return JSON.parse(completion.choices[0].message.content || '{}');
    }

    return research.json;
}

// Usage
const research = await conductResearch(
    'What are the latest developments in sustainable aviation fuel?',
    { depth: 7, maxUrls: 30 }
);

console.log('\n=== RESEARCH RESULTS ===\n');
console.log('Summary:', research.summary);
console.log('\nKey Findings:');
for (const finding of research.keyFindings) {
    console.log(`- [${finding.confidence}] ${finding.finding}`);
}
console.log('\nStatistics:');
for (const stat of research.statistics) {
    console.log(`- ${stat.metric}: ${stat.value} (${stat.source})`);
}
```

---

## Documentation Site Generator

Generate documentation from any website.

```typescript
import FirecrawlApp from '@mendable/firecrawl-js';
import * as fs from 'fs/promises';
import * as path from 'path';

const firecrawl = new FirecrawlApp({
    apiKey: process.env.FIRECRAWL_API_KEY,
});

interface DocPage {
    url: string;
    title: string;
    content: string;
    slug: string;
    order: number;
}

async function generateDocsFromSite(
    siteUrl: string,
    outputDir: string,
    options: {
        includePaths?: string[];
        excludePaths?: string[];
        maxPages?: number;
    } = {}
): Promise<void> {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Crawl the documentation site
    console.log(`Crawling ${siteUrl}...`);
    const result = await firecrawl.crawlUrl(siteUrl, {
        limit: options.maxPages || 100,
        maxDepth: 5,
        includePaths: options.includePaths,
        excludePaths: options.excludePaths,
        scrapeOptions: {
            formats: ['markdown'],
            onlyMainContent: true,
        },
    });

    if (!result.success) {
        throw new Error(`Crawl failed: ${result.error}`);
    }

    console.log(`Processing ${result.data.length} pages...`);

    const docs: DocPage[] = [];
    let order = 0;

    for (const doc of result.data) {
        if (!doc.markdown || !doc.url) continue;

        // Create slug from URL
        const urlPath = new URL(doc.url).pathname;
        const slug = urlPath
            .replace(/^\//, '')
            .replace(/\/$/, '')
            .replace(/\//g, '-')
            || 'index';

        // Clean up markdown
        const content = cleanMarkdown(doc.markdown, doc.metadata?.title || '');

        docs.push({
            url: doc.url,
            title: doc.metadata?.title || slug,
            content,
            slug,
            order: order++,
        });
    }

    // Write documentation files
    for (const doc of docs) {
        const filePath = path.join(outputDir, `${doc.slug}.md`);

        const frontmatter = `---
title: "${doc.title}"
source: "${doc.url}"
order: ${doc.order}
---

`;

        await fs.writeFile(filePath, frontmatter + doc.content);
        console.log(`Written: ${filePath}`);
    }

    // Generate index
    const indexContent = `# Documentation Index

Generated from: ${siteUrl}
Pages: ${docs.length}
Generated: ${new Date().toISOString()}

## Pages

${docs.map(d => `- [${d.title}](./${d.slug}.md)`).join('\n')}
`;

    await fs.writeFile(path.join(outputDir, 'README.md'), indexContent);
    console.log(`\nGenerated ${docs.length} documentation files in ${outputDir}`);
}

function cleanMarkdown(content: string, title: string): string {
    // Remove duplicate title if present at start
    const lines = content.split('\n');
    if (lines[0]?.startsWith('# ') && lines[0].includes(title)) {
        lines.shift();
    }

    // Clean up excessive whitespace
    return lines
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// Usage
await generateDocsFromSite('https://docs.example.com', './generated-docs', {
    includePaths: ['/api/*', '/guides/*'],
    excludePaths: ['/api/internal/*'],
    maxPages: 50,
});
```
