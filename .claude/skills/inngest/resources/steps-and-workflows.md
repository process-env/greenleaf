# Steps and Workflows

## Understanding Durable Execution

Inngest's durable execution engine ensures your code runs reliably by:
- **Checkpointing** after each step completes
- **Persisting state** across retries and failures
- **Resuming** from the last successful step

```typescript
async ({ step }) => {
    // If this step fails and retries, it runs again
    const data = await step.run('fetch-data', async () => {
        return await api.fetchData();
    });

    // This step only runs after 'fetch-data' succeeds
    // If the function crashes here, it resumes from this point
    await step.run('process-data', async () => {
        return await processData(data);
    });
}
```

---

## step.run() Patterns

### Basic Usage

```typescript
const result = await step.run('step-id', async () => {
    // Any async operation
    return await someOperation();
});
// result contains the return value
```

### With External APIs

```typescript
const user = await step.run('fetch-user', async () => {
    const response = await fetch(`https://api.example.com/users/${userId}`);
    if (!response.ok) throw new Error('User not found');
    return response.json();
});
```

### Database Operations

```typescript
const order = await step.run('create-order', async () => {
    return await prisma.order.create({
        data: {
            userId: event.data.userId,
            items: event.data.items,
            status: 'pending',
        },
    });
});
```

### Returning Complex Data

```typescript
// Return objects, arrays, any JSON-serializable data
const result = await step.run('complex-operation', async () => {
    return {
        users: await fetchUsers(),
        metadata: { count: 10, page: 1 },
        timestamp: new Date().toISOString(),
    };
});
```

---

## step.sleep() Patterns

### Basic Delays

```typescript
// String durations
await step.sleep('short-wait', '30s');
await step.sleep('medium-wait', '5m');
await step.sleep('long-wait', '2h');
await step.sleep('multi-day', '7 days');

// Numeric milliseconds
await step.sleep('precise-wait', 60000);
```

### Email Drip Campaign

```typescript
async ({ event, step }) => {
    await step.run('send-welcome', () => sendEmail('welcome'));

    await step.sleep('wait-day-1', '1 day');
    await step.run('send-tips', () => sendEmail('getting-started-tips'));

    await step.sleep('wait-day-3', '3 days');
    await step.run('send-features', () => sendEmail('feature-highlights'));

    await step.sleep('wait-day-7', '7 days');
    await step.run('send-check-in', () => sendEmail('how-are-things'));
}
```

### Conditional Delays

```typescript
async ({ event, step }) => {
    const user = await step.run('get-user', () => getUser(event.data.userId));

    // Different delay based on user tier
    const delay = user.tier === 'premium' ? '1h' : '24h';
    await step.sleep('tier-delay', delay);

    await step.run('send-notification', () => notify(user));
}
```

---

## step.sleepUntil() Patterns

### Scheduled Execution

```typescript
async ({ event, step }) => {
    // Sleep until a specific timestamp
    await step.sleepUntil('wait-for-time', event.data.scheduledAt);

    await step.run('execute', async () => {
        await executeScheduledTask(event.data);
    });
}
```

### Business Hours Delay

```typescript
async ({ event, step }) => {
    const now = new Date();
    const nextBusinessDay = getNextBusinessDay(now);

    await step.sleepUntil('wait-for-business-hours', nextBusinessDay);

    await step.run('send-notification', async () => {
        await sendBusinessNotification(event.data);
    });
}
```

---

## step.waitForEvent() Patterns

### Basic Wait

```typescript
const paymentEvent = await step.waitForEvent('wait-payment', {
    event: 'payment/completed',
    timeout: '24h',
});

if (paymentEvent) {
    // Payment received
    await step.run('fulfill', () => fulfillOrder());
} else {
    // Timeout - no payment
    await step.run('cancel', () => cancelOrder());
}
```

### Matching Events

```typescript
// Match by field in event data
const confirmation = await step.waitForEvent('wait-confirm', {
    event: 'email/confirmed',
    match: 'data.userId', // Matches event.data.userId with received event
    timeout: '7 days',
});

// Match with expression
const approval = await step.waitForEvent('wait-approval', {
    event: 'order/approved',
    if: 'async.data.orderId == event.data.orderId && async.data.approved == true',
    timeout: '48h',
});
```

### Approval Workflow

```typescript
async ({ event, step }) => {
    await step.run('request-approval', async () => {
        await sendApprovalRequest(event.data.managerId, event.data.requestId);
    });

    const approval = await step.waitForEvent('wait-approval', {
        event: 'approval/decision',
        match: 'data.requestId',
        timeout: '72h',
    });

    if (!approval) {
        await step.run('escalate', () => escalateRequest(event.data.requestId));
        return { status: 'escalated' };
    }

    if (approval.data.approved) {
        await step.run('process-approved', () => processRequest(event.data));
        return { status: 'approved' };
    } else {
        await step.run('notify-rejected', () => notifyRejection(event.data));
        return { status: 'rejected' };
    }
}
```

---

## step.invoke() Patterns

### Call Another Function

```typescript
const paymentResult = await step.invoke('process-payment', {
    function: processPaymentFunction,
    data: {
        amount: event.data.total,
        currency: 'USD',
        customerId: event.data.customerId,
    },
});

if (paymentResult.success) {
    await step.run('fulfill-order', () => fulfillOrder(event.data.orderId));
}
```

### Chain Functions

```typescript
async ({ event, step }) => {
    // First function: validate order
    const validation = await step.invoke('validate', {
        function: validateOrderFunction,
        data: event.data,
    });

    if (!validation.valid) {
        return { error: validation.errors };
    }

    // Second function: process payment
    const payment = await step.invoke('charge', {
        function: chargeCustomerFunction,
        data: { orderId: event.data.orderId },
    });

    // Third function: fulfill order
    await step.invoke('fulfill', {
        function: fulfillOrderFunction,
        data: { orderId: event.data.orderId, paymentId: payment.id },
    });

    return { success: true };
}
```

---

## step.sendEvent() Patterns

### Emit Events for Other Functions

```typescript
async ({ event, step }) => {
    const order = await step.run('create-order', () => createOrder(event.data));

    // Trigger other workflows
    await step.sendEvent('emit-events', [
        { name: 'order/created', data: { orderId: order.id } },
        { name: 'inventory/reserve', data: { items: order.items } },
        { name: 'notification/send', data: { userId: order.userId, type: 'order-created' } },
    ]);

    return order;
}
```

---

## Parallel Execution

### Run Steps in Parallel

```typescript
async ({ event, step }) => {
    // These run concurrently
    const [user, products, inventory] = await Promise.all([
        step.run('fetch-user', () => getUser(event.data.userId)),
        step.run('fetch-products', () => getProducts(event.data.productIds)),
        step.run('check-inventory', () => checkInventory(event.data.productIds)),
    ]);

    // Continue with all data
    await step.run('create-order', () => createOrder(user, products, inventory));
}
```

### Fan-Out Pattern

```typescript
async ({ event, step }) => {
    const users = await step.run('get-users', () => getAllActiveUsers());

    // Process each user in parallel
    await Promise.all(
        users.map((user, index) =>
            step.run(`process-user-${index}`, () => processUser(user))
        )
    );

    return { processed: users.length };
}
```

---

## Best Practices

### Step IDs

```typescript
// Good: Descriptive, unique within function
await step.run('fetch-user-profile', ...);
await step.run('validate-payment-method', ...);
await step.run('send-confirmation-email', ...);

// Bad: Generic or duplicate IDs
await step.run('step1', ...);
await step.run('process', ...);
```

### Idempotent Steps

```typescript
// Good: Idempotent - safe to retry
await step.run('create-order', async () => {
    return await db.order.upsert({
        where: { externalId: event.data.externalId },
        create: orderData,
        update: orderData,
    });
});

// Bad: Non-idempotent - creates duplicates on retry
await step.run('create-order', async () => {
    return await db.order.create({ data: orderData });
});
```

### Error Handling in Steps

```typescript
await step.run('risky-operation', async () => {
    try {
        return await riskyApiCall();
    } catch (error) {
        if (error.code === 'RATE_LIMITED') {
            throw new RetryAfterError('Rate limited', new Date(Date.now() + 60000));
        }
        if (error.code === 'INVALID_INPUT') {
            throw new NonRetriableError('Invalid input: ' + error.message);
        }
        throw error; // Will retry
    }
});
```

### Data Between Steps

```typescript
async ({ step }) => {
    // Data flows through return values
    const user = await step.run('get-user', () => getUser());
    const enriched = await step.run('enrich', () => enrichUser(user));
    const saved = await step.run('save', () => saveUser(enriched));

    // All data available at the end
    return { user, enriched, saved };
}
```
