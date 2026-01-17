# Flow Control

## Overview

Flow control mechanisms manage how and when functions execute, helping you:
- Respect external API rate limits
- Prevent resource exhaustion
- Prioritize important work
- Process events efficiently

---

## Concurrency

Limit simultaneous function executions.

### Global Concurrency

```typescript
inngest.createFunction(
    {
        id: 'sync-data',
        concurrency: {
            limit: 10, // Max 10 concurrent runs total
        },
    },
    { event: 'data/sync' },
    handler
);
```

### Scoped by Key

```typescript
// Per-user concurrency
inngest.createFunction(
    {
        id: 'user-task',
        concurrency: {
            limit: 2,
            key: 'event.data.userId', // 2 concurrent per user
        },
    },
    { event: 'user/task' },
    handler
);

// Per-account concurrency
inngest.createFunction(
    {
        id: 'account-sync',
        concurrency: {
            limit: 5,
            key: 'event.data.accountId',
            scope: 'account', // Across all environments
        },
    },
    { event: 'account/sync' },
    handler
);
```

### Multiple Concurrency Rules

```typescript
inngest.createFunction(
    {
        id: 'api-task',
        concurrency: [
            { limit: 100 }, // 100 total
            { limit: 5, key: 'event.data.customerId' }, // 5 per customer
        ],
    },
    { event: 'api/task' },
    handler
);
```

### Use Cases

| Scenario | Configuration |
|----------|---------------|
| Database connections | `limit: 10` (match pool size) |
| Per-user fairness | `limit: 1, key: 'event.data.userId'` |
| External API | `limit: 5` (match API limits) |
| Expensive compute | `limit: 2` (prevent resource exhaustion) |

---

## Throttling

Control throughput rate - queues excess requests.

### Basic Throttle

```typescript
inngest.createFunction(
    {
        id: 'send-email',
        throttle: {
            limit: 100,
            period: '1m', // 100 per minute
        },
    },
    { event: 'email/send' },
    handler
);
```

### With Burst

```typescript
inngest.createFunction(
    {
        id: 'api-call',
        throttle: {
            limit: 10,
            period: '1s',
            burst: 25, // Allow bursts up to 25
        },
    },
    { event: 'api/call' },
    handler
);
```

### Per-Key Throttle

```typescript
inngest.createFunction(
    {
        id: 'customer-api',
        throttle: {
            limit: 60,
            period: '1m',
            key: 'event.data.customerId', // Per customer
        },
    },
    { event: 'customer/action' },
    handler
);
```

### Throttle vs Rate Limit

| Feature | Throttle | Rate Limit |
|---------|----------|------------|
| Excess events | Queued for later | Skipped/dropped |
| Delivery | All events eventually | Some events lost |
| Use case | API rate limits | Abuse prevention |

---

## Rate Limiting

Skip events beyond a threshold - events are dropped, not queued.

### Basic Rate Limit

```typescript
inngest.createFunction(
    {
        id: 'user-action',
        rateLimit: {
            limit: 10,
            period: '1m', // Max 10 per minute, extras dropped
        },
    },
    { event: 'user/action' },
    handler
);
```

### Per-User Rate Limit

```typescript
inngest.createFunction(
    {
        id: 'api-request',
        rateLimit: {
            limit: 100,
            period: '1h',
            key: 'event.data.userId', // Per user
        },
    },
    { event: 'api/request' },
    handler
);
```

### Abuse Prevention

```typescript
inngest.createFunction(
    {
        id: 'signup',
        rateLimit: {
            limit: 5,
            period: '1h',
            key: 'event.data.ipAddress', // Per IP
        },
    },
    { event: 'user/signup' },
    handler
);
```

---

## Debounce

Wait for a pause in events before executing - only runs once after activity stops.

### Basic Debounce

```typescript
inngest.createFunction(
    {
        id: 'update-search-index',
        debounce: {
            period: '10s', // Wait 10s of no events
        },
    },
    { event: 'document/updated' },
    handler
);
```

### Per-Key Debounce

```typescript
inngest.createFunction(
    {
        id: 'sync-user-data',
        debounce: {
            period: '30s',
            key: 'event.data.userId', // Per user
        },
    },
    { event: 'user/data-changed' },
    handler
);
```

### Use Cases

| Scenario | Period | Key |
|----------|--------|-----|
| Search index | `10s` | `documentId` |
| User sync | `30s` | `userId` |
| Aggregate metrics | `1m` | `metricType` |
| Save draft | `5s` | `documentId` |

---

## Priority

Control execution order when there's a queue.

### Static Priority

```typescript
inngest.createFunction(
    {
        id: 'high-priority-task',
        priority: {
            run: '100', // Higher = runs sooner
        },
    },
    { event: 'important/task' },
    handler
);
```

### Dynamic Priority

```typescript
inngest.createFunction(
    {
        id: 'customer-task',
        priority: {
            // Expression evaluated per event
            run: 'event.data.tier == "enterprise" ? 200 : event.data.tier == "pro" ? 100 : 0',
        },
    },
    { event: 'customer/task' },
    handler
);
```

### Priority Scale

```typescript
// Range: -600 to 600 (configurable)
priority: { run: '-600' } // Lowest priority
priority: { run: '0' }    // Default
priority: { run: '600' }  // Highest priority
```

---

## Event Batching

Process multiple events in one function run.

### Basic Batching

```typescript
inngest.createFunction(
    {
        id: 'bulk-insert',
        batchEvents: {
            maxSize: 100,    // Up to 100 events
            timeout: '5s',   // Or after 5 seconds
        },
    },
    { event: 'record/created' },
    async ({ events, step }) => {
        // events is an array
        await step.run('insert-all', async () => {
            const records = events.map(e => e.data);
            await db.records.createMany({ data: records });
        });
        return { inserted: events.length };
    }
);
```

### Per-Key Batching

```typescript
inngest.createFunction(
    {
        id: 'user-events',
        batchEvents: {
            maxSize: 50,
            timeout: '10s',
            key: 'event.data.userId', // Batch per user
        },
    },
    { event: 'user/activity' },
    async ({ events, step }) => {
        // All events are for the same user
        const userId = events[0].data.userId;
        await step.run('process-batch', () =>
            processUserActivities(userId, events)
        );
    }
);
```

### Conditional Batching

```typescript
inngest.createFunction(
    {
        id: 'conditional-batch',
        batchEvents: {
            maxSize: 100,
            timeout: '5s',
            if: 'event.data.batchable == true', // Only batch if flag set
        },
    },
    { event: 'data/process' },
    handler
);
```

### Batching Limits

- Max `maxSize`: 100 events
- Max batch payload: 10 MiB
- Timeout range: 1s to 60s

### Incompatible Features

Batching **cannot** be combined with:
- Idempotency
- Rate limiting
- Cancellation
- Priority

---

## Combining Flow Control

### Common Patterns

```typescript
// API with rate limit + per-customer throttle
inngest.createFunction(
    {
        id: 'external-api',
        throttle: { limit: 100, period: '1m' },
        concurrency: { limit: 10 },
    },
    { event: 'api/call' },
    handler
);

// User tasks with fairness
inngest.createFunction(
    {
        id: 'user-task',
        concurrency: { limit: 1, key: 'event.data.userId' },
        priority: { run: 'event.data.isPremium ? 100 : 0' },
    },
    { event: 'user/task' },
    handler
);

// Bulk processing with debounce
inngest.createFunction(
    {
        id: 'sync-index',
        debounce: { period: '30s', key: 'event.data.indexId' },
        concurrency: { limit: 5 },
    },
    { event: 'index/update' },
    handler
);
```

### Decision Guide

| Need | Use |
|------|-----|
| Limit concurrent DB connections | Concurrency |
| Respect external API limits | Throttle |
| Prevent abuse | Rate Limit |
| Reduce redundant processing | Debounce |
| Process VIP customers first | Priority |
| Bulk database operations | Batching |
