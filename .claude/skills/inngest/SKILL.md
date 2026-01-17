---
name: inngest
description: Inngest event-driven durable execution platform for background jobs, workflows, and step functions. Covers function creation, step orchestration, step.fetch for durable HTTP, flow control (concurrency, throttling, rate limiting, debounce), error handling, retries, batching, middleware, realtime streaming, and TypeScript patterns.
version: "2.0.0"
lastUpdated: "2026-01-11"
frameworkVersions:
  inngest: "3.42+"
---

# Inngest

## Purpose

Comprehensive guide for building reliable event-driven applications with Inngest's durable execution engine. Covers background jobs, multi-step workflows, durable HTTP requests, flow control, error handling, and production best practices.

> **Updated 2026-01-11:** Added `step.fetch()` for durable HTTP requests, realtime streaming updates, and Zod 4 / Standard Schema support.

## When to Use This Skill

Automatically activates when working on:
- Creating background jobs or async tasks
- Building multi-step workflows
- Implementing event-driven architectures
- Adding retry logic and error handling
- Rate limiting or throttling function execution
- Scheduling delayed or cron-based tasks
- Processing events in batches

---

## Quick Start

### Installation

```bash
npm install inngest
```

### Basic Setup

```typescript
// lib/inngest.ts
import { Inngest } from 'inngest';

export const inngest = new Inngest({
    id: 'my-app',
    // Optional: Add middleware, event schemas, etc.
});
```

### Serve Functions (Next.js App Router)

```typescript
// app/api/inngest/route.ts
import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import { myFunction } from '@/inngest/functions';

export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [myFunction],
});
```

---

## Core Concepts

### Function Structure

Every Inngest function has three parts:

1. **Configuration** - ID, name, flow control settings
2. **Trigger** - Event or cron that starts the function
3. **Handler** - The code that runs

```typescript
export const processOrder = inngest.createFunction(
    // 1. Configuration
    { id: 'process-order', name: 'Process Order' },
    // 2. Trigger
    { event: 'order/placed' },
    // 3. Handler
    async ({ event, step }) => {
        // Your logic here
        return { success: true };
    }
);
```

### Triggers

| Trigger Type | Usage | Example |
|-------------|-------|---------|
| **Event** | React to app events | `{ event: 'user/signed-up' }` |
| **Cron** | Scheduled execution | `{ cron: '0 9 * * *' }` |
| **Event + Filter** | Conditional triggers | `{ event: 'order/*', if: 'event.data.total > 100' }` |

### Sending Events

```typescript
// From your app code
await inngest.send({
    name: 'user/signed-up',
    data: {
        userId: '123',
        email: 'user@example.com',
        plan: 'pro',
    },
});

// Send multiple events
await inngest.send([
    { name: 'order/placed', data: { orderId: '1' } },
    { name: 'order/placed', data: { orderId: '2' } },
]);
```

---

## Step Functions (Durable Execution)

Steps are the key to reliable workflows. Each step:
- **Automatically retries** on failure
- **Checkpoints state** so progress isn't lost
- **Can sleep** for minutes, hours, or days

### step.run() - Execute Code

```typescript
async ({ event, step }) => {
    // Each step is independently retriable
    const user = await step.run('fetch-user', async () => {
        return await db.users.findUnique({ where: { id: event.data.userId } });
    });

    const enriched = await step.run('enrich-data', async () => {
        return await enrichmentAPI.enrich(user.email);
    });

    await step.run('update-user', async () => {
        await db.users.update({
            where: { id: user.id },
            data: { enrichedData: enriched },
        });
    });

    return { user, enriched };
}
```

### step.sleep() - Pause Execution

```typescript
async ({ step }) => {
    await step.run('send-welcome-email', async () => {
        await sendEmail('welcome');
    });

    // Wait 3 days - function state is preserved
    await step.sleep('wait-for-onboarding', '3 days');

    await step.run('send-followup', async () => {
        await sendEmail('how-are-you-finding-things');
    });
}
```

### step.sleepUntil() - Sleep to Specific Time

```typescript
async ({ event, step }) => {
    // Sleep until a specific timestamp
    await step.sleepUntil('wait-for-event', event.data.scheduledTime);

    await step.run('execute-scheduled-task', async () => {
        // Runs at the scheduled time
    });
}
```

### step.waitForEvent() - Wait for External Events

```typescript
async ({ event, step }) => {
    await step.run('send-invoice', async () => {
        await sendInvoice(event.data.invoiceId);
    });

    // Wait up to 7 days for payment
    const paymentEvent = await step.waitForEvent('wait-for-payment', {
        event: 'payment/received',
        match: 'data.invoiceId', // Match on invoice ID
        timeout: '7 days',
    });

    if (paymentEvent) {
        await step.run('fulfill-order', async () => {
            await fulfillOrder(event.data.orderId);
        });
    } else {
        await step.run('send-reminder', async () => {
            await sendPaymentReminder(event.data.invoiceId);
        });
    }
}
```

### step.invoke() - Call Other Functions

```typescript
async ({ step }) => {
    // Invoke another Inngest function and wait for result
    const result = await step.invoke('process-payment', {
        function: paymentProcessor,
        data: { amount: 100, currency: 'USD' },
    });

    return result;
}
```

### step.sendEvent() - Emit Events

```typescript
async ({ event, step }) => {
    await step.run('process-order', async () => {
        // Process order logic
    });

    // Send event for other functions to react to
    await step.sendEvent('notify-completion', {
        name: 'order/processed',
        data: { orderId: event.data.orderId },
    });
}
```

### step.fetch() - Durable HTTP Requests (v3.42+)

Make HTTP requests with automatic retries and checkpointing:

```typescript
async ({ event, step }) => {
    // Durable fetch - retries automatically, checkpoints response
    const response = await step.fetch('call-api', 'https://api.example.com/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: event.data.userId }),
    });

    const data = await response.json();

    // Response is checkpointed - if function restarts,
    // it won't re-call the API
    await step.run('process-response', async () => {
        await processData(data);
    });
}
```

**Benefits over `step.run()` with fetch:**
- Automatic retry with exponential backoff
- Response checkpointing (no duplicate requests on restart)
- Built-in timeout handling
- Cleaner code for HTTP-heavy workflows

---

## Flow Control

### Concurrency

Limit concurrent function executions:

```typescript
inngest.createFunction(
    {
        id: 'sync-data',
        concurrency: {
            limit: 5, // Max 5 concurrent runs
        },
    },
    { event: 'data/sync' },
    handler
);

// Scope concurrency by key
inngest.createFunction(
    {
        id: 'process-user-task',
        concurrency: {
            limit: 1,
            key: 'event.data.userId', // 1 per user
        },
    },
    { event: 'user/task' },
    handler
);
```

### Throttling

Control throughput over time:

```typescript
inngest.createFunction(
    {
        id: 'send-notification',
        throttle: {
            limit: 100,
            period: '1m', // 100 per minute
        },
    },
    { event: 'notification/send' },
    handler
);

// With burst capacity
inngest.createFunction(
    {
        id: 'api-call',
        throttle: {
            limit: 10,
            period: '1s',
            burst: 20, // Allow bursts up to 20
        },
    },
    { event: 'api/request' },
    handler
);
```

### Rate Limiting

Skip events beyond a limit (vs. throttle which queues):

```typescript
inngest.createFunction(
    {
        id: 'user-action',
        rateLimit: {
            limit: 5,
            period: '1m',
            key: 'event.data.userId', // Per user
        },
    },
    { event: 'user/action' },
    handler
);
```

### Debounce

Deduplicate rapid events:

```typescript
inngest.createFunction(
    {
        id: 'update-search-index',
        debounce: {
            period: '5s', // Wait 5s of inactivity
            key: 'event.data.documentId',
        },
    },
    { event: 'document/updated' },
    handler
);
```

### Priority

Control execution order:

```typescript
inngest.createFunction(
    {
        id: 'process-order',
        priority: {
            // -600 to 600, higher = sooner
            run: 'event.data.isPremium ? 100 : -100',
        },
    },
    { event: 'order/process' },
    handler
);
```

---

## Event Batching

Process multiple events in a single function run:

```typescript
inngest.createFunction(
    {
        id: 'bulk-insert',
        batchEvents: {
            maxSize: 100,      // Up to 100 events
            timeout: '5s',     // Or after 5 seconds
        },
    },
    { event: 'record/created' },
    async ({ events, step }) => {
        // events is an array
        const records = events.map(e => e.data);

        await step.run('bulk-insert', async () => {
            await db.records.createMany({ data: records });
        });

        return { inserted: records.length };
    }
);
```

---

## Error Handling & Retries

### Retry Configuration

```typescript
inngest.createFunction(
    {
        id: 'unreliable-api',
        retries: 10, // Up to 10 retries (default: 4)
    },
    { event: 'api/call' },
    handler
);
```

### Non-Retriable Errors

```typescript
import { NonRetriableError } from 'inngest';

async ({ event, step }) => {
    await step.run('validate', async () => {
        if (!event.data.email) {
            // Don't retry - this is a data issue
            throw new NonRetriableError('Email is required');
        }
    });
}
```

### Retry After Specific Time

```typescript
import { RetryAfterError } from 'inngest';

async ({ step }) => {
    await step.run('call-rate-limited-api', async () => {
        const response = await fetch('https://api.example.com/data');
        if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            throw new RetryAfterError(`Rate limited`, new Date(Date.now() + parseInt(retryAfter) * 1000));
        }
        return response.json();
    });
}
```

### Failure Handler (After All Retries Exhausted)

```typescript
inngest.createFunction(
    {
        id: 'critical-task',
        onFailure: async ({ error, event, step }) => {
            // Called after all retries fail
            await step.run('notify-team', async () => {
                await slack.send({
                    channel: '#alerts',
                    text: `Critical task failed: ${error.message}`,
                });
            });

            await step.run('save-to-dlq', async () => {
                await db.deadLetterQueue.create({
                    data: { event, error: error.message },
                });
            });
        },
    },
    { event: 'critical/task' },
    handler
);
```

---

## Cron Functions

```typescript
// Daily at 9am UTC
inngest.createFunction(
    { id: 'daily-report' },
    { cron: '0 9 * * *' },
    async ({ step }) => {
        await step.run('generate-report', async () => {
            return await generateDailyReport();
        });
    }
);

// Every 5 minutes
inngest.createFunction(
    { id: 'health-check' },
    { cron: '*/5 * * * *' },
    async ({ step }) => {
        await step.run('check-services', async () => {
            return await checkAllServices();
        });
    }
);

// With timezone
inngest.createFunction(
    { id: 'morning-greeting' },
    { cron: 'TZ=America/New_York 0 9 * * *' },
    handler
);
```

---

## Cancellation

Cancel running functions based on events:

```typescript
inngest.createFunction(
    {
        id: 'user-onboarding',
        cancelOn: [
            {
                event: 'user/deleted',
                match: 'data.userId', // Cancel if user is deleted
            },
            {
                event: 'user/upgraded',
                if: 'event.data.plan == "enterprise"',
            },
        ],
    },
    { event: 'user/signed-up' },
    handler
);
```

---

## Idempotency

Prevent duplicate executions:

```typescript
inngest.createFunction(
    {
        id: 'process-payment',
        idempotency: 'event.data.paymentId', // Unique per payment
    },
    { event: 'payment/process' },
    handler
);
```

---

## Common Patterns Reference

| Pattern | Use Case | Key Config |
|---------|----------|------------|
| **Sequential steps** | Multi-stage workflow | `step.run()` chained |
| **Parallel steps** | Independent operations | `Promise.all([step.run(), step.run()])` |
| **Delayed execution** | Scheduled emails | `step.sleep('3 days')` |
| **Event coordination** | Wait for webhooks | `step.waitForEvent()` |
| **Rate-limited API** | Third-party APIs | `throttle: { limit, period }` |
| **User-scoped** | Per-user limits | `concurrency: { key: 'event.data.userId' }` |
| **Batch processing** | Bulk inserts | `batchEvents: { maxSize, timeout }` |
| **Failure alerts** | Critical workflows | `onFailure` handler |

---

## Gotchas & Real-World Warnings

### Steps Must Be Idempotent

**Steps can execute multiple times.** If a step succeeds but the function crashes before checkpointing:

```typescript
// DANGER: Non-idempotent step
await step.run('charge-customer', async () => {
    await stripe.charges.create({ amount: 1000 });  // May charge twice!
});

// CORRECT: Use idempotency keys
await step.run('charge-customer', async () => {
    await stripe.charges.create({
        amount: 1000,
        idempotency_key: `charge-${event.data.orderId}`,
    });
});
```

### Event Payload Size Limits

**Events over 512KB fail silently or get truncated:**

```typescript
// DANGER: Sending large payloads
await inngest.send({
    name: 'document/process',
    data: {
        content: hugeDocument,  // 2MB of text = rejected
    },
});

// CORRECT: Send references, not data
await inngest.send({
    name: 'document/process',
    data: {
        documentId: doc.id,
        s3Url: 's3://bucket/documents/abc.pdf',
    },
});
```

### Step State Has Limits Too

**Each step's return value is stored. Large returns accumulate:**

```typescript
// DANGER: Returning large objects from steps
const data = await step.run('fetch-all', async () => {
    return await db.records.findMany();  // 10,000 records × 100 steps = memory issues
});

// BETTER: Return only what you need
const ids = await step.run('fetch-ids', async () => {
    const records = await db.records.findMany({ select: { id: true } });
    return records.map(r => r.id);
});
```

### Cold Start Latency

**Functions don't execute instantly:**

| Environment | Typical Latency |
|-------------|----------------|
| Dev server | ~100ms |
| Serverless (warm) | ~200-500ms |
| Serverless (cold) | ~1-5 seconds |

```typescript
// Don't promise instant execution to users
await inngest.send({ name: 'email/send', data: { email } });
// Email won't send for several seconds minimum

// For time-sensitive ops, consider direct execution
// with Inngest as fallback/retry mechanism
```

### Debugging Distributed Workflows Is Hard

**When things fail, tracing the problem is difficult:**

1. **Multiple services** - Events flow across microservices
2. **Async execution** - Failures happen minutes/hours after trigger
3. **Partial state** - Some steps succeeded, others didn't
4. **Retry confusion** - Is this the first run or a retry?

```typescript
// ALWAYS add context for debugging
await step.run('process-order', async () => {
    console.log(`[${event.data.orderId}] Processing order, attempt ${step.attempt}`);
    // ... logic
});
```

### Cost Considerations

**Inngest charges per function run, not per step:**

```typescript
// CHEAP: One function with 10 steps = 1 run
await step.run('step-1', ...);
await step.run('step-2', ...);
// ... 8 more steps

// EXPENSIVE: Invoking 10 separate functions
for (const item of items) {
    await step.invoke('process-item', { function: processItem, data: item });
    // Each invoke = separate billable run
}

// BETTER for bulk: Use batching
inngest.createFunction(
    { batchEvents: { maxSize: 100 } },
    { event: 'item/process' },
    async ({ events }) => { /* Process all 100 in one run */ }
);
```

### What These Patterns Don't Tell You

1. **Local development** - `npx inngest-cli dev` is required; events don't work without it
2. **Function versioning** - Changing function config mid-run can cause issues
3. **Webhook signatures** - In production, always verify webhook signatures
4. **Rate limit errors** - 429s from step.run count as step failures and trigger retries
5. **Sleep accuracy** - `step.sleep('1 hour')` isn't exactly 1 hour; it's "at least 1 hour"
6. **Cancellation timing** - `cancelOn` checks happen between steps, not during

---

## Anti-Patterns to Avoid

- **Not using steps** for external calls (lose retry/checkpointing)
- **Large payloads** in events (keep under 512KB)
- **Non-idempotent steps** (steps may retry, design accordingly)
- **Hardcoding timeouts** (use step.sleep for delays)
- **Ignoring concurrency** for resource-constrained operations
- **Batching with idempotency** (incompatible features)

---

## Navigation Guide

| Need to... | Read this |
|------------|-----------|
| Understand step functions | [steps-and-workflows.md](resources/steps-and-workflows.md) |
| Configure flow control | [flow-control.md](resources/flow-control.md) |
| Handle errors properly | [error-handling.md](resources/error-handling.md) |
| Use middleware | [middleware.md](resources/middleware.md) |
| See full examples | [complete-examples.md](resources/complete-examples.md) |

---

## Resource Files

### [steps-and-workflows.md](resources/steps-and-workflows.md)
Deep dive into step.run, step.sleep, step.waitForEvent, step.invoke, parallel execution

### [flow-control.md](resources/flow-control.md)
Concurrency, throttling, rate limiting, debounce, priority, batching

### [error-handling.md](resources/error-handling.md)
Retries, NonRetriableError, RetryAfterError, onFailure, idempotency

### [middleware.md](resources/middleware.md)
Lifecycle hooks, dependency injection, logging, Sentry integration

### [complete-examples.md](resources/complete-examples.md)
Full implementation examples: email sequences, payment processing, data sync

---

**Skill Status**: COMPLETE
**Line Count**: < 450
**Progressive Disclosure**: 5 resource files
