# Error Handling

## Retry Behavior

By default, Inngest retries failed steps up to 4 times with exponential backoff.

### Configuring Retries

```typescript
inngest.createFunction(
    {
        id: 'critical-task',
        retries: 10, // 0-20 retries allowed
    },
    { event: 'critical/task' },
    handler
);

// Disable retries
inngest.createFunction(
    {
        id: 'no-retry-task',
        retries: 0,
    },
    { event: 'one-shot/task' },
    handler
);
```

### Retry Timing

Default backoff: exponential with jitter
- Retry 1: ~1 second
- Retry 2: ~2 seconds
- Retry 3: ~4 seconds
- Retry 4: ~8 seconds
- And so on...

---

## Error Types

### Standard Errors (Retriable)

```typescript
await step.run('api-call', async () => {
    const response = await fetch('https://api.example.com/data');
    if (!response.ok) {
        // This will retry
        throw new Error(`API error: ${response.status}`);
    }
    return response.json();
});
```

### NonRetriableError

Stop retries immediately - use for permanent failures.

```typescript
import { NonRetriableError } from 'inngest';

await step.run('validate-input', async () => {
    if (!event.data.email) {
        // Don't retry - data is invalid
        throw new NonRetriableError('Email is required');
    }

    if (!isValidEmail(event.data.email)) {
        throw new NonRetriableError('Invalid email format');
    }

    return { valid: true };
});
```

**Use NonRetriableError for:**
- Validation failures
- Missing required data
- Business rule violations
- 4xx HTTP errors (client errors)
- Authentication failures

### RetryAfterError

Retry after a specific time.

```typescript
import { RetryAfterError } from 'inngest';

await step.run('rate-limited-api', async () => {
    const response = await fetch('https://api.example.com/data');

    if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const retryAt = new Date(Date.now() + parseInt(retryAfter) * 1000);
        throw new RetryAfterError('Rate limited', retryAt);
    }

    return response.json();
});
```

**Use RetryAfterError for:**
- Rate limit responses (429)
- Service temporarily unavailable (503)
- Maintenance windows
- Scheduled availability

---

## Failure Handlers

Execute code after all retries are exhausted.

### Basic onFailure

```typescript
inngest.createFunction(
    {
        id: 'important-task',
        onFailure: async ({ error, event, step }) => {
            await step.run('alert-team', async () => {
                await slack.send({
                    channel: '#alerts',
                    text: `Task failed: ${error.message}`,
                    blocks: [
                        { type: 'section', text: { type: 'mrkdwn', text: `*Event:* ${event.name}` } },
                        { type: 'section', text: { type: 'mrkdwn', text: `*Error:* ${error.message}` } },
                    ],
                });
            });
        },
    },
    { event: 'important/task' },
    handler
);
```

### Dead Letter Queue Pattern

```typescript
inngest.createFunction(
    {
        id: 'process-order',
        onFailure: async ({ error, event, step, runId }) => {
            await step.run('save-to-dlq', async () => {
                await db.deadLetterQueue.create({
                    data: {
                        eventName: event.name,
                        eventData: event.data,
                        error: error.message,
                        stack: error.stack,
                        runId,
                        failedAt: new Date(),
                    },
                });
            });

            await step.run('notify', async () => {
                await notifyOps(`Order processing failed: ${event.data.orderId}`);
            });
        },
    },
    { event: 'order/process' },
    handler
);
```

### Cleanup on Failure

```typescript
inngest.createFunction(
    {
        id: 'provision-resources',
        onFailure: async ({ event, step }) => {
            // Rollback any partial provisioning
            await step.run('cleanup-resources', async () => {
                await cleanupPartialProvisioning(event.data.provisioningId);
            });
        },
    },
    { event: 'resource/provision' },
    handler
);
```

---

## Step-Level Error Handling

### Try-Catch Within Steps

```typescript
await step.run('risky-operation', async () => {
    try {
        return await riskyApiCall();
    } catch (error) {
        // Transform or handle specific errors
        if (error.code === 'RATE_LIMITED') {
            throw new RetryAfterError('Rate limited', new Date(Date.now() + 60000));
        }
        if (error.code === 'NOT_FOUND') {
            // Return a default instead of failing
            return { data: null, notFound: true };
        }
        throw error; // Re-throw for retry
    }
});
```

### Conditional Retry Logic

```typescript
await step.run('external-api', async () => {
    const response = await fetch('https://api.example.com/data');

    switch (response.status) {
        case 200:
            return response.json();
        case 400:
        case 404:
            throw new NonRetriableError(`Client error: ${response.status}`);
        case 429:
            throw new RetryAfterError('Rate limited', new Date(Date.now() + 60000));
        case 503:
            throw new RetryAfterError('Service unavailable', new Date(Date.now() + 30000));
        default:
            throw new Error(`Server error: ${response.status}`);
    }
});
```

---

## Idempotency

Prevent duplicate function runs.

### Event-Level Idempotency

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

### TTL (Time-To-Live)

```typescript
inngest.createFunction(
    {
        id: 'send-notification',
        idempotency: {
            key: 'event.data.notificationId',
            ttl: '24h', // Reset after 24 hours
        },
    },
    { event: 'notification/send' },
    handler
);
```

### Composite Keys

```typescript
// Combine multiple fields
idempotency: 'event.data.userId + "-" + event.data.action'
```

---

## Designing Idempotent Steps

### Database Operations

```typescript
// Good: Upsert is idempotent
await step.run('save-user', async () => {
    return await db.user.upsert({
        where: { externalId: event.data.externalId },
        create: userData,
        update: userData,
    });
});

// Bad: Create may duplicate on retry
await step.run('save-user', async () => {
    return await db.user.create({ data: userData });
});
```

### External APIs

```typescript
// Good: Use idempotency keys
await step.run('charge-customer', async () => {
    return await stripe.charges.create({
        amount: 1000,
        currency: 'usd',
        customer: customerId,
    }, {
        idempotencyKey: `charge-${event.data.orderId}`,
    });
});
```

### File Operations

```typescript
// Good: Check before creating
await step.run('create-file', async () => {
    const exists = await storage.exists(filePath);
    if (exists) return { existed: true };

    await storage.create(filePath, content);
    return { created: true };
});
```

---

## Error Patterns Summary

| Error Type | Behavior | Use Case |
|------------|----------|----------|
| Regular `Error` | Retries with backoff | Temporary failures |
| `NonRetriableError` | Stops immediately | Permanent failures |
| `RetryAfterError` | Retries at specific time | Rate limits |
| `onFailure` handler | Runs after all retries | Alerts, cleanup |

### Decision Flow

```
Error thrown in step
        ↓
Is it NonRetriableError?
    Yes → Mark as failed, call onFailure
    No  ↓
Is it RetryAfterError?
    Yes → Wait until specified time, retry
    No  ↓
Are retries remaining?
    Yes → Wait (exponential backoff), retry
    No  → Mark as failed, call onFailure
```

---

## Best Practices

1. **Categorize errors early** - Determine if retriable in catch blocks
2. **Use idempotency keys** - For payments, emails, any side effects
3. **Set up onFailure** - For critical workflows
4. **Log context** - Include event data in error messages
5. **Design for retries** - Steps should be safe to run multiple times
