# Middleware

## Overview

Middleware executes code at various points in Inngest's lifecycle:
- Before/after function execution
- When sending events
- For dependency injection
- Adding observability

---

## Creating Middleware

### Basic Structure

```typescript
import { InngestMiddleware } from 'inngest';

const myMiddleware = new InngestMiddleware({
    name: 'My Middleware',
    init() {
        return {
            onFunctionRun({ fn, ctx }) {
                console.log(`Starting: ${fn.name}`);
                return {
                    afterExecution() {
                        console.log(`Completed: ${fn.name}`);
                    },
                };
            },
        };
    },
});
```

### Registering Middleware

```typescript
// Client-level (applies to all functions)
const inngest = new Inngest({
    id: 'my-app',
    middleware: [myMiddleware],
});

// Function-level (applies to specific function)
inngest.createFunction(
    {
        id: 'my-function',
        middleware: [functionSpecificMiddleware],
    },
    { event: 'my/event' },
    handler
);
```

---

## Lifecycle Hooks

### onFunctionRun

Runs when a function starts.

```typescript
const loggingMiddleware = new InngestMiddleware({
    name: 'Logging',
    init() {
        return {
            onFunctionRun({ fn, ctx, steps }) {
                const startTime = Date.now();
                console.log(`[${fn.id}] Starting run ${ctx.runId}`);

                return {
                    transformInput({ ctx, fn, steps }) {
                        // Modify input before function runs
                        return { ctx, fn, steps };
                    },
                    beforeExecution() {
                        console.log(`[${fn.id}] Executing...`);
                    },
                    afterExecution() {
                        const duration = Date.now() - startTime;
                        console.log(`[${fn.id}] Completed in ${duration}ms`);
                    },
                    transformOutput({ result, error }) {
                        // Modify output after function runs
                        return { result, error };
                    },
                };
            },
        };
    },
});
```

### onSendEvent

Runs when sending events.

```typescript
const eventMiddleware = new InngestMiddleware({
    name: 'Event Logging',
    init() {
        return {
            onSendEvent() {
                return {
                    transformInput({ payloads }) {
                        // Log all outgoing events
                        payloads.forEach(p => console.log(`Sending: ${p.name}`));
                        return { payloads };
                    },
                    transformOutput({ result }) {
                        console.log(`Events sent: ${result.ids.join(', ')}`);
                        return { result };
                    },
                };
            },
        };
    },
});
```

---

## Dependency Injection

### Database Client

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const prismaMiddleware = new InngestMiddleware({
    name: 'Prisma',
    init() {
        return {
            onFunctionRun() {
                return {
                    transformInput({ ctx }) {
                        return {
                            ctx: {
                                ...ctx,
                                prisma, // Inject Prisma client
                            },
                        };
                    },
                };
            },
        };
    },
});

// Usage in functions
async ({ event, step, prisma }) => {
    const user = await step.run('get-user', () =>
        prisma.user.findUnique({ where: { id: event.data.userId } })
    );
};
```

### External Services

```typescript
import OpenAI from 'openai';
import Stripe from 'stripe';

const openai = new OpenAI();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const servicesMiddleware = new InngestMiddleware({
    name: 'External Services',
    init() {
        return {
            onFunctionRun() {
                return {
                    transformInput({ ctx }) {
                        return {
                            ctx: {
                                ...ctx,
                                services: {
                                    openai,
                                    stripe,
                                },
                            },
                        };
                    },
                };
            },
        };
    },
});
```

---

## Observability

### Sentry Integration

```typescript
import * as Sentry from '@sentry/node';

const sentryMiddleware = new InngestMiddleware({
    name: 'Sentry',
    init() {
        return {
            onFunctionRun({ fn, ctx }) {
                Sentry.setTag('inngest.function', fn.id);
                Sentry.setTag('inngest.runId', ctx.runId);

                return {
                    transformOutput({ error }) {
                        if (error) {
                            Sentry.captureException(error, {
                                extra: {
                                    functionId: fn.id,
                                    runId: ctx.runId,
                                },
                            });
                        }
                        return { error };
                    },
                };
            },
        };
    },
});
```

### OpenTelemetry Tracing

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('inngest');

const tracingMiddleware = new InngestMiddleware({
    name: 'OpenTelemetry',
    init() {
        return {
            onFunctionRun({ fn, ctx }) {
                const span = tracer.startSpan(`inngest.${fn.id}`, {
                    attributes: {
                        'inngest.run_id': ctx.runId,
                        'inngest.function_id': fn.id,
                    },
                });

                return {
                    transformOutput({ result, error }) {
                        if (error) {
                            span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
                            span.recordException(error);
                        } else {
                            span.setStatus({ code: SpanStatusCode.OK });
                        }
                        span.end();
                        return { result, error };
                    },
                };
            },
        };
    },
});
```

### Custom Metrics

```typescript
import { metrics } from './metrics';

const metricsMiddleware = new InngestMiddleware({
    name: 'Metrics',
    init() {
        return {
            onFunctionRun({ fn }) {
                const startTime = Date.now();
                metrics.increment('inngest.function.started', { function: fn.id });

                return {
                    transformOutput({ error }) {
                        const duration = Date.now() - startTime;
                        metrics.histogram('inngest.function.duration', duration, { function: fn.id });

                        if (error) {
                            metrics.increment('inngest.function.error', { function: fn.id });
                        } else {
                            metrics.increment('inngest.function.success', { function: fn.id });
                        }
                        return { error };
                    },
                };
            },
        };
    },
});
```

---

## Encryption Middleware

### Encrypt Event Data

```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;

function encrypt(data: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(data: string): string {
    const [ivHex, authTagHex, encrypted] = data.split(':');
    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(ENCRYPTION_KEY, 'hex'),
        Buffer.from(ivHex, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

const encryptionMiddleware = new InngestMiddleware({
    name: 'Encryption',
    init() {
        return {
            onSendEvent() {
                return {
                    transformInput({ payloads }) {
                        return {
                            payloads: payloads.map(p => ({
                                ...p,
                                data: { encrypted: encrypt(JSON.stringify(p.data)) },
                            })),
                        };
                    },
                };
            },
            onFunctionRun() {
                return {
                    transformInput({ ctx }) {
                        if (ctx.event.data.encrypted) {
                            return {
                                ctx: {
                                    ...ctx,
                                    event: {
                                        ...ctx.event,
                                        data: JSON.parse(decrypt(ctx.event.data.encrypted)),
                                    },
                                },
                            };
                        }
                        return { ctx };
                    },
                };
            },
        };
    },
});
```

---

## Middleware Execution Order

Middleware executes in a specific order:

1. Client-level middleware (first registered → last registered)
2. Function-level middleware (first registered → last registered)

For `afterExecution` and `transformOutput`, the order is reversed (LIFO).

```typescript
// If registered: [A, B] at client, [C, D] at function
// onFunctionRun order: A → B → C → D
// afterExecution order: D → C → B → A
```

---

## Best Practices

1. **Keep middleware focused** - One concern per middleware
2. **Handle errors gracefully** - Don't let middleware errors break functions
3. **Use async carefully** - All hooks support async, but keep them fast
4. **Share clients** - Create clients once, inject via middleware
5. **Don't mutate events** - Return new objects in transforms
