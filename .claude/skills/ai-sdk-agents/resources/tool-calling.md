# Tool Calling Deep Dive

## Tool Definition Best Practices

### Descriptive Tools

Tools with clear descriptions lead to better model decisions:

```typescript
import { tool } from 'ai';
import { z } from 'zod';

// GOOD: Descriptive parameters
const searchTool = tool({
    description: 'Search for products in the catalog. Use this when users ask about products, prices, or availability.',
    parameters: z.object({
        query: z.string().describe('Search terms - product name, category, or description'),
        category: z.enum(['electronics', 'clothing', 'home', 'all']).default('all')
            .describe('Filter by product category'),
        maxPrice: z.number().optional()
            .describe('Maximum price in USD'),
        inStockOnly: z.boolean().default(true)
            .describe('Only return products currently in stock'),
    }),
    execute: async (params) => { /* ... */ },
});

// BAD: Vague descriptions
const badTool = tool({
    description: 'Search stuff',
    parameters: z.object({
        q: z.string(),
        cat: z.string().optional(),
    }),
    execute: async (params) => { /* ... */ },
});
```

### Complex Parameter Schemas

```typescript
const createOrderTool = tool({
    description: 'Create a new order for a customer',
    parameters: z.object({
        customerId: z.string().uuid(),
        items: z.array(z.object({
            productId: z.string(),
            quantity: z.number().int().positive(),
            customizations: z.record(z.string()).optional(),
        })).min(1).describe('Order items - at least one required'),
        shipping: z.object({
            method: z.enum(['standard', 'express', 'overnight']),
            address: z.object({
                street: z.string(),
                city: z.string(),
                state: z.string(),
                zip: z.string(),
                country: z.string().default('US'),
            }),
        }),
        payment: z.object({
            method: z.enum(['card', 'paypal', 'invoice']),
            saveForFuture: z.boolean().default(false),
        }),
        notes: z.string().optional(),
    }),
    execute: async (params) => { /* ... */ },
});
```

---

## Async Tool Patterns

### Parallel Tool Execution

```typescript
const tools = {
    getUser: tool({
        description: 'Get user profile',
        parameters: z.object({ userId: z.string() }),
        execute: async ({ userId }) => {
            return await userService.get(userId);
        },
    }),

    getOrders: tool({
        description: 'Get user orders',
        parameters: z.object({ userId: z.string() }),
        execute: async ({ userId }) => {
            return await orderService.getByUser(userId);
        },
    }),

    getRecommendations: tool({
        description: 'Get product recommendations for user',
        parameters: z.object({ userId: z.string() }),
        execute: async ({ userId }) => {
            return await recommendationService.forUser(userId);
        },
    }),
};

// The model may call multiple tools in parallel if they're independent
```

### Tool with Progress Updates

```typescript
const longRunningTool = tool({
    description: 'Process a large dataset',
    parameters: z.object({
        datasetId: z.string(),
    }),
    execute: async ({ datasetId }, { abortSignal }) => {
        const dataset = await loadDataset(datasetId);
        const results: ProcessedItem[] = [];

        for (let i = 0; i < dataset.items.length; i++) {
            if (abortSignal?.aborted) {
                return {
                    status: 'cancelled',
                    processed: results.length,
                    total: dataset.items.length,
                };
            }

            const processed = await processItem(dataset.items[i]);
            results.push(processed);

            // Could emit progress via callback/event
        }

        return {
            status: 'complete',
            processed: results.length,
            summary: summarize(results),
        };
    },
});
```

---

## Error Handling Patterns

### Structured Error Responses

```typescript
type ToolResult<T> =
    | { success: true; data: T }
    | { success: false; error: string; code: string; suggestion?: string };

const apiTool = tool({
    description: 'Call external API',
    parameters: z.object({ endpoint: z.string() }),
    execute: async ({ endpoint }): Promise<ToolResult<any>> => {
        try {
            const response = await fetch(endpoint);

            if (!response.ok) {
                if (response.status === 404) {
                    return {
                        success: false,
                        error: 'Resource not found',
                        code: 'NOT_FOUND',
                        suggestion: 'Check the endpoint URL or try a different resource',
                    };
                }
                if (response.status === 429) {
                    return {
                        success: false,
                        error: 'Rate limit exceeded',
                        code: 'RATE_LIMITED',
                        suggestion: 'Wait a moment before trying again',
                    };
                }
                return {
                    success: false,
                    error: `HTTP ${response.status}`,
                    code: 'HTTP_ERROR',
                };
            }

            return { success: true, data: await response.json() };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'NETWORK_ERROR',
                suggestion: 'Check network connectivity',
            };
        }
    },
});
```

### Retry with Exponential Backoff

```typescript
async function withRetry<T>(
    fn: () => Promise<T>,
    options: {
        maxRetries?: number;
        baseDelayMs?: number;
        maxDelayMs?: number;
        retryOn?: (error: any) => boolean;
    } = {}
): Promise<T> {
    const {
        maxRetries = 3,
        baseDelayMs = 1000,
        maxDelayMs = 10000,
        retryOn = () => true,
    } = options;

    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt === maxRetries || !retryOn(error)) {
                throw error;
            }

            const delay = Math.min(
                baseDelayMs * Math.pow(2, attempt),
                maxDelayMs
            );
            await new Promise(r => setTimeout(r, delay));
        }
    }

    throw lastError;
}

const reliableTool = tool({
    description: 'Reliable API call with retries',
    parameters: z.object({ query: z.string() }),
    execute: async ({ query }) => {
        return await withRetry(
            () => externalAPI.search(query),
            {
                maxRetries: 3,
                retryOn: (error) => error.status === 429 || error.status >= 500,
            }
        );
    },
});
```

---

## Tool Composition

### Wrapper Tools

```typescript
function createAuthenticatedTool<T extends z.ZodType>(
    name: string,
    description: string,
    parameters: T,
    handler: (params: z.infer<T>, auth: AuthContext) => Promise<any>
) {
    return tool({
        description,
        parameters,
        execute: async (params) => {
            const auth = await getAuthContext();
            if (!auth) {
                return {
                    success: false,
                    error: 'Authentication required',
                    code: 'UNAUTHENTICATED',
                };
            }
            return await handler(params, auth);
        },
    });
}

const protectedTool = createAuthenticatedTool(
    'getUserData',
    'Get private user data',
    z.object({ field: z.string() }),
    async ({ field }, auth) => {
        return await db.users.findUnique({
            where: { id: auth.userId },
            select: { [field]: true },
        });
    }
);
```

### Tool Pipelines

```typescript
const researchPipeline = tool({
    description: 'Research a topic comprehensively',
    parameters: z.object({ topic: z.string() }),
    execute: async ({ topic }) => {
        // Step 1: Search for sources
        const sources = await searchWeb(topic);

        // Step 2: Fetch and parse each source
        const contents = await Promise.all(
            sources.slice(0, 5).map(async (source) => {
                const content = await fetchAndParse(source.url);
                return { url: source.url, content };
            })
        );

        // Step 3: Summarize findings
        const summary = await summarize(contents);

        return {
            topic,
            sourcesAnalyzed: contents.length,
            summary,
            sources: sources.map(s => s.url),
        };
    },
});
```

---

## Tool Security

### Input Validation

```typescript
const fileReadTool = tool({
    description: 'Read a file from the allowed directory',
    parameters: z.object({
        filename: z.string()
            .regex(/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/)
            .describe('Filename without path'),
    }),
    execute: async ({ filename }) => {
        // Validate path
        const allowedDir = '/app/data';
        const fullPath = path.join(allowedDir, filename);

        // Prevent path traversal
        if (!fullPath.startsWith(allowedDir)) {
            return { success: false, error: 'Invalid path' };
        }

        try {
            const content = await fs.readFile(fullPath, 'utf-8');
            return { success: true, content };
        } catch {
            return { success: false, error: 'File not found' };
        }
    },
});
```

### Rate Limiting

```typescript
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

function createRateLimitedTool<T extends z.ZodType>(
    key: string,
    limit: number,
    windowMs: number,
    toolDef: Parameters<typeof tool>[0]
) {
    const originalExecute = toolDef.execute;

    return tool({
        ...toolDef,
        execute: async (params) => {
            const now = Date.now();
            const state = rateLimiter.get(key) || { count: 0, resetAt: now + windowMs };

            if (now > state.resetAt) {
                state.count = 0;
                state.resetAt = now + windowMs;
            }

            if (state.count >= limit) {
                return {
                    success: false,
                    error: 'Rate limit exceeded',
                    retryAfter: Math.ceil((state.resetAt - now) / 1000),
                };
            }

            state.count++;
            rateLimiter.set(key, state);

            return await originalExecute(params);
        },
    });
}
```
