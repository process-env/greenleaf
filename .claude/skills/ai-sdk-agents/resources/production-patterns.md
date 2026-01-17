# Production Patterns

## Error Handling

### Comprehensive Error Types

```typescript
class AgentError extends Error {
    constructor(
        message: string,
        public code: string,
        public recoverable: boolean = true,
        public retryAfter?: number,
        public context?: Record<string, any>
    ) {
        super(message);
        this.name = 'AgentError';
    }
}

class ToolExecutionError extends AgentError {
    constructor(toolName: string, originalError: Error) {
        super(
            `Tool "${toolName}" failed: ${originalError.message}`,
            'TOOL_EXECUTION_ERROR',
            true,
            undefined,
            { toolName, originalError: originalError.message }
        );
    }
}

class RateLimitError extends AgentError {
    constructor(retryAfter: number) {
        super(
            `Rate limit exceeded. Retry after ${retryAfter}s`,
            'RATE_LIMIT_ERROR',
            true,
            retryAfter
        );
    }
}

class ContextLengthError extends AgentError {
    constructor(used: number, max: number) {
        super(
            `Context length exceeded: ${used}/${max} tokens`,
            'CONTEXT_LENGTH_ERROR',
            false,
            undefined,
            { used, max }
        );
    }
}
```

### Error Recovery Strategies

```typescript
async function withErrorRecovery<T>(
    fn: () => Promise<T>,
    options: {
        maxRetries?: number;
        onError?: (error: Error, attempt: number) => void;
        shouldRetry?: (error: Error) => boolean;
        fallback?: () => Promise<T>;
    } = {}
): Promise<T> {
    const { maxRetries = 3, onError, shouldRetry, fallback } = options;

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            onError?.(lastError, attempt);

            // Check if we should retry
            if (shouldRetry && !shouldRetry(lastError)) break;

            // Handle rate limits
            if (lastError instanceof RateLimitError) {
                await new Promise(r => setTimeout(r, lastError.retryAfter! * 1000));
                continue;
            }

            // Exponential backoff
            if (attempt < maxRetries) {
                await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
            }
        }
    }

    // Try fallback
    if (fallback) {
        return await fallback();
    }

    throw lastError;
}

// Usage
const result = await withErrorRecovery(
    () => generateText({ model, prompt, tools, maxSteps: 10 }),
    {
        maxRetries: 3,
        onError: (error, attempt) => {
            console.error(`Attempt ${attempt} failed:`, error.message);
            Sentry.captureException(error);
        },
        shouldRetry: (error) => {
            if (error instanceof ContextLengthError) return false;
            return true;
        },
        fallback: async () => {
            // Use simpler model or reduced context
            return await generateText({
                model: openai('gpt-4o-mini'),
                prompt: truncatedPrompt,
            });
        },
    }
);
```

---

## Timeouts and Cancellation

### Timeout Wrapper

```typescript
async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    onTimeout?: () => void
): Promise<T> {
    const controller = new AbortController();

    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
            controller.abort();
            onTimeout?.();
            reject(new AgentError('Operation timed out', 'TIMEOUT_ERROR', true));
        }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
}

// Usage with AI SDK
const result = await withTimeout(
    generateText({
        model: openai('gpt-4o'),
        prompt,
        tools,
        maxSteps: 10,
        abortSignal: controller.signal,
    }),
    30000, // 30 second timeout
    () => console.log('Agent operation timed out')
);
```

### Graceful Cancellation

```typescript
class CancellableAgent {
    private controller: AbortController | null = null;

    async run(prompt: string): Promise<string> {
        this.controller = new AbortController();

        try {
            const result = await generateText({
                model: openai('gpt-4o'),
                prompt,
                tools: this.tools,
                maxSteps: 10,
                abortSignal: this.controller.signal,
                onStepFinish: ({ stepType }) => {
                    // Check for cancellation between steps
                    if (this.controller?.signal.aborted) {
                        throw new AgentError('Cancelled by user', 'CANCELLED', false);
                    }
                },
            });

            return result.text;
        } finally {
            this.controller = null;
        }
    }

    cancel(): void {
        this.controller?.abort();
    }
}
```

---

## Logging and Observability

### Structured Logging

```typescript
interface AgentLog {
    timestamp: string;
    traceId: string;
    spanId: string;
    level: 'debug' | 'info' | 'warn' | 'error';
    event: string;
    data?: Record<string, any>;
    duration?: number;
}

class AgentLogger {
    private traceId: string;
    private logs: AgentLog[] = [];

    constructor() {
        this.traceId = crypto.randomUUID();
    }

    log(level: AgentLog['level'], event: string, data?: Record<string, any>): void {
        const log: AgentLog = {
            timestamp: new Date().toISOString(),
            traceId: this.traceId,
            spanId: crypto.randomUUID(),
            level,
            event,
            data,
        };

        this.logs.push(log);
        console.log(JSON.stringify(log));
    }

    span<T>(name: string, fn: () => Promise<T>): Promise<T> {
        const startTime = Date.now();
        this.log('debug', `${name}_start`);

        return fn()
            .then((result) => {
                this.log('debug', `${name}_end`, { duration: Date.now() - startTime });
                return result;
            })
            .catch((error) => {
                this.log('error', `${name}_error`, {
                    duration: Date.now() - startTime,
                    error: error.message,
                });
                throw error;
            });
    }

    getTraceId(): string {
        return this.traceId;
    }

    getLogs(): AgentLog[] {
        return this.logs;
    }
}
```

### Step-Level Telemetry

```typescript
interface StepTelemetry {
    stepNumber: number;
    type: string;
    startTime: number;
    endTime: number;
    tokens: { input: number; output: number };
    toolCalls?: string[];
    success: boolean;
    error?: string;
}

async function runWithTelemetry(
    prompt: string,
    options: { model: any; tools: any; maxSteps: number }
): Promise<{ result: string; telemetry: StepTelemetry[] }> {
    const telemetry: StepTelemetry[] = [];
    let stepNumber = 0;
    let stepStartTime = Date.now();

    const result = await generateText({
        ...options,
        prompt,
        onStepFinish: ({ stepType, toolCalls, usage }) => {
            telemetry.push({
                stepNumber: ++stepNumber,
                type: stepType,
                startTime: stepStartTime,
                endTime: Date.now(),
                tokens: {
                    input: usage?.promptTokens || 0,
                    output: usage?.completionTokens || 0,
                },
                toolCalls: toolCalls?.map(tc => tc.toolName),
                success: true,
            });
            stepStartTime = Date.now();
        },
    });

    return { result: result.text, telemetry };
}
```

---

## Rate Limiting

### Token Bucket Rate Limiter

```typescript
class TokenBucket {
    private tokens: number;
    private lastRefill: number;

    constructor(
        private capacity: number,
        private refillRate: number // tokens per second
    ) {
        this.tokens = capacity;
        this.lastRefill = Date.now();
    }

    private refill(): void {
        const now = Date.now();
        const elapsed = (now - this.lastRefill) / 1000;
        this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
        this.lastRefill = now;
    }

    async acquire(tokens: number = 1): Promise<void> {
        this.refill();

        if (this.tokens >= tokens) {
            this.tokens -= tokens;
            return;
        }

        // Wait for enough tokens
        const waitTime = ((tokens - this.tokens) / this.refillRate) * 1000;
        await new Promise(r => setTimeout(r, waitTime));
        this.refill();
        this.tokens -= tokens;
    }
}

// Usage
const rateLimiter = new TokenBucket(100, 10); // 100 capacity, 10/sec refill

const rateLimitedAgent = async (prompt: string) => {
    await rateLimiter.acquire(1);
    return await generateText({ model, prompt, tools, maxSteps: 10 });
};
```

### Per-User Rate Limiting

```typescript
class UserRateLimiter {
    private buckets: Map<string, TokenBucket> = new Map();

    private getBucket(userId: string): TokenBucket {
        if (!this.buckets.has(userId)) {
            this.buckets.set(userId, new TokenBucket(10, 1)); // 10 requests, 1/sec refill
        }
        return this.buckets.get(userId)!;
    }

    async checkLimit(userId: string): Promise<{ allowed: boolean; retryAfter?: number }> {
        const bucket = this.getBucket(userId);
        try {
            await bucket.acquire(1);
            return { allowed: true };
        } catch {
            return { allowed: false, retryAfter: 60 };
        }
    }
}
```

---

## Security

### Input Sanitization

```typescript
function sanitizePrompt(input: string): string {
    // Remove potential prompt injection attempts
    const patterns = [
        /ignore (previous|all|above) instructions/gi,
        /system:\s*/gi,
        /you are now/gi,
        /pretend (to be|you are)/gi,
    ];

    let sanitized = input;
    for (const pattern of patterns) {
        sanitized = sanitized.replace(pattern, '[FILTERED]');
    }

    // Limit length
    if (sanitized.length > 10000) {
        sanitized = sanitized.substring(0, 10000) + '... [truncated]';
    }

    return sanitized;
}

// Validate tool outputs
function validateToolOutput(output: any, schema: z.ZodSchema): any {
    try {
        return schema.parse(output);
    } catch (error) {
        throw new AgentError('Invalid tool output', 'VALIDATION_ERROR', false, undefined, {
            output,
            error: (error as z.ZodError).errors,
        });
    }
}
```

### Secrets Management

```typescript
class SecureToolExecutor {
    private secrets: Map<string, string>;

    constructor(secrets: Record<string, string>) {
        this.secrets = new Map(Object.entries(secrets));
    }

    async execute(
        toolName: string,
        params: Record<string, any>,
        handler: (params: Record<string, any>, secrets: Map<string, string>) => Promise<any>
    ): Promise<any> {
        // Execute with secrets, but never return secrets in output
        const result = await handler(params, this.secrets);

        // Scrub secrets from output
        return this.scrubSecrets(result);
    }

    private scrubSecrets(obj: any): any {
        if (typeof obj === 'string') {
            let scrubbed = obj;
            for (const secret of this.secrets.values()) {
                scrubbed = scrubbed.replaceAll(secret, '[REDACTED]');
            }
            return scrubbed;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.scrubSecrets(item));
        }

        if (typeof obj === 'object' && obj !== null) {
            return Object.fromEntries(
                Object.entries(obj).map(([k, v]) => [k, this.scrubSecrets(v)])
            );
        }

        return obj;
    }
}
```

---

## Monitoring and Alerting

### Health Checks

```typescript
interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, { status: string; latency?: number; error?: string }>;
    timestamp: string;
}

class AgentHealthMonitor {
    async check(): Promise<HealthStatus> {
        const checks: HealthStatus['checks'] = {};

        // Check model availability
        checks.model = await this.checkModel();

        // Check tool availability
        checks.tools = await this.checkTools();

        // Check memory systems
        checks.memory = await this.checkMemory();

        const status = Object.values(checks).every(c => c.status === 'ok')
            ? 'healthy'
            : Object.values(checks).some(c => c.status === 'error')
            ? 'unhealthy'
            : 'degraded';

        return {
            status,
            checks,
            timestamp: new Date().toISOString(),
        };
    }

    private async checkModel(): Promise<{ status: string; latency?: number }> {
        const start = Date.now();
        try {
            await generateText({
                model: openai('gpt-4o-mini'),
                prompt: 'ping',
                maxTokens: 1,
            });
            return { status: 'ok', latency: Date.now() - start };
        } catch (error) {
            return { status: 'error', error: (error as Error).message };
        }
    }

    private async checkTools(): Promise<{ status: string }> {
        // Verify tools are properly configured
        return { status: 'ok' };
    }

    private async checkMemory(): Promise<{ status: string }> {
        // Check vector store connectivity
        return { status: 'ok' };
    }
}
```

### Metrics Collection

```typescript
interface AgentMetrics {
    requestCount: number;
    successCount: number;
    errorCount: number;
    avgLatency: number;
    avgSteps: number;
    avgTokens: number;
    toolUsage: Record<string, number>;
}

class MetricsCollector {
    private metrics: AgentMetrics = {
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        avgLatency: 0,
        avgSteps: 0,
        avgTokens: 0,
        toolUsage: {},
    };

    record(data: {
        success: boolean;
        latency: number;
        steps: number;
        tokens: number;
        tools: string[];
    }): void {
        this.metrics.requestCount++;

        if (data.success) {
            this.metrics.successCount++;
        } else {
            this.metrics.errorCount++;
        }

        // Running averages
        const n = this.metrics.requestCount;
        this.metrics.avgLatency = ((n - 1) * this.metrics.avgLatency + data.latency) / n;
        this.metrics.avgSteps = ((n - 1) * this.metrics.avgSteps + data.steps) / n;
        this.metrics.avgTokens = ((n - 1) * this.metrics.avgTokens + data.tokens) / n;

        // Tool usage counts
        for (const tool of data.tools) {
            this.metrics.toolUsage[tool] = (this.metrics.toolUsage[tool] || 0) + 1;
        }
    }

    getMetrics(): AgentMetrics {
        return { ...this.metrics };
    }

    reset(): void {
        this.metrics = {
            requestCount: 0,
            successCount: 0,
            errorCount: 0,
            avgLatency: 0,
            avgSteps: 0,
            avgTokens: 0,
            toolUsage: {},
        };
    }
}
```
