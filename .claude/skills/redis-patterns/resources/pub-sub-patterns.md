# Pub/Sub Patterns

Guide to implementing messaging patterns with Redis Pub/Sub and Streams.

## Table of Contents

- [Basic Pub/Sub](#basic-pubsub)
- [Pattern Subscriptions](#pattern-subscriptions)
- [Redis Streams](#redis-streams)
- [Consumer Groups](#consumer-groups)
- [Event Broadcasting](#event-broadcasting)
- [Message Queues](#message-queues)

---

## Basic Pub/Sub

### Publisher

```typescript
import Redis from 'ioredis';

const publisher = new Redis();

async function publishEvent(channel: string, event: object): Promise<number> {
    const message = JSON.stringify({
        ...event,
        timestamp: Date.now(),
    });
    return publisher.publish(channel, message);
}

// Usage
await publishEvent('notifications', {
    type: 'NEW_MESSAGE',
    userId: '123',
    data: { messageId: '456' },
});
```

### Subscriber

```typescript
const subscriber = new Redis();

// Subscribe to channel
subscriber.subscribe('notifications', (err, count) => {
    if (err) {
        console.error('Failed to subscribe:', err);
        return;
    }
    console.log(`Subscribed to ${count} channels`);
});

// Handle messages
subscriber.on('message', (channel, message) => {
    const event = JSON.parse(message);
    console.log(`Received on ${channel}:`, event);

    switch (event.type) {
        case 'NEW_MESSAGE':
            handleNewMessage(event.data);
            break;
        case 'USER_ONLINE':
            handleUserOnline(event.data);
            break;
    }
});

// Multiple channels
subscriber.subscribe('notifications', 'alerts', 'updates');
```

### Important Notes

- Subscriber connection is dedicated (can't run other commands)
- Messages are fire-and-forget (no persistence)
- No acknowledgment mechanism
- Messages lost if no subscribers

---

## Pattern Subscriptions

Subscribe to channels matching a pattern.

```typescript
// Subscribe to all user channels
subscriber.psubscribe('user:*:events', (err, count) => {
    console.log(`Subscribed to pattern, ${count} patterns total`);
});

// Handle pattern messages
subscriber.on('pmessage', (pattern, channel, message) => {
    console.log(`Pattern: ${pattern}, Channel: ${channel}`);
    const event = JSON.parse(message);

    // Extract user ID from channel
    const match = channel.match(/user:(\d+):events/);
    const userId = match?.[1];

    handleUserEvent(userId, event);
});

// Patterns supported:
// * - matches any characters
// ? - matches single character
// [abc] - matches a, b, or c
```

---

## Redis Streams

Persistent, ordered message log with consumer groups.

### Basic Stream Operations

```typescript
// Add entry (auto-generated ID)
const entryId = await redis.xadd('events', '*',
    'type', 'user_login',
    'userId', '123',
    'ip', '192.168.1.1'
);
// Returns: "1234567890123-0"

// Add with fields object
await redis.xadd('events', '*', ...Object.entries({
    type: 'page_view',
    page: '/home',
    userId: '123',
}).flat());

// Read entries
const entries = await redis.xrange('events', '-', '+');
// Returns: [["1234567890123-0", ["type", "user_login", "userId", "123", ...]]]

// Read last N entries
const recent = await redis.xrevrange('events', '+', '-', 'COUNT', 10);

// Read from specific ID
const newEntries = await redis.xrange('events', lastProcessedId, '+');

// Blocking read (wait for new entries)
const result = await redis.xread('BLOCK', 5000, 'STREAMS', 'events', '$');
```

### Stream Parsing Helper

```typescript
interface StreamEntry {
    id: string;
    data: Record<string, string>;
}

function parseStreamEntries(entries: [string, string[]][]): StreamEntry[] {
    return entries.map(([id, fields]) => {
        const data: Record<string, string> = {};
        for (let i = 0; i < fields.length; i += 2) {
            data[fields[i]] = fields[i + 1];
        }
        return { id, data };
    });
}

// Usage
const raw = await redis.xrange('events', '-', '+');
const parsed = parseStreamEntries(raw);
// [{ id: "1234567890123-0", data: { type: "user_login", userId: "123" } }]
```

---

## Consumer Groups

Multiple consumers processing stream with acknowledgment.

### Setup

```typescript
// Create consumer group ($ = only new messages)
await redis.xgroup('CREATE', 'events', 'processors', '$', 'MKSTREAM');

// Create from beginning (0 = all messages)
await redis.xgroup('CREATE', 'events', 'processors', '0', 'MKSTREAM');
```

### Consumer

```typescript
class StreamConsumer {
    constructor(
        private redis: Redis,
        private stream: string,
        private group: string,
        private consumer: string
    ) {}

    async process(handler: (entry: StreamEntry) => Promise<void>): Promise<void> {
        while (true) {
            try {
                // Read pending messages first, then new ones
                const messages = await this.redis.xreadgroup(
                    'GROUP', this.group, this.consumer,
                    'COUNT', 10,
                    'BLOCK', 5000,
                    'STREAMS', this.stream, '>'
                );

                if (!messages || messages.length === 0) continue;

                const [, entries] = messages[0];

                for (const [id, fields] of entries) {
                    const entry = {
                        id,
                        data: this.parseFields(fields),
                    };

                    try {
                        await handler(entry);
                        // Acknowledge successful processing
                        await this.redis.xack(this.stream, this.group, id);
                    } catch (error) {
                        console.error(`Failed to process ${id}:`, error);
                        // Message will be retried (not acknowledged)
                    }
                }
            } catch (error) {
                console.error('Consumer error:', error);
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }

    private parseFields(fields: string[]): Record<string, string> {
        const data: Record<string, string> = {};
        for (let i = 0; i < fields.length; i += 2) {
            data[fields[i]] = fields[i + 1];
        }
        return data;
    }

    // Claim old pending messages from dead consumers
    async claimPending(minIdleMs: number = 60000): Promise<void> {
        const pending = await this.redis.xpending(
            this.stream, this.group,
            '-', '+', 100
        );

        for (const [id, consumer, idleTime] of pending) {
            if (idleTime > minIdleMs) {
                await this.redis.xclaim(
                    this.stream, this.group, this.consumer,
                    minIdleMs, id
                );
            }
        }
    }
}

// Usage
const consumer = new StreamConsumer(redis, 'events', 'processors', 'worker-1');

consumer.process(async (entry) => {
    console.log('Processing:', entry);
    await processEvent(entry.data);
});
```

---

## Event Broadcasting

### Typed Event Emitter

```typescript
interface Events {
    'user:created': { userId: string; email: string };
    'user:updated': { userId: string; changes: Record<string, unknown> };
    'order:placed': { orderId: string; userId: string; total: number };
}

class EventBus {
    private publisher: Redis;
    private subscriber: Redis;
    private handlers: Map<string, Set<Function>> = new Map();

    constructor() {
        this.publisher = new Redis();
        this.subscriber = new Redis();
        this.setupSubscriber();
    }

    private setupSubscriber(): void {
        this.subscriber.psubscribe('events:*');
        this.subscriber.on('pmessage', (pattern, channel, message) => {
            const eventName = channel.replace('events:', '');
            const data = JSON.parse(message);
            this.emit(eventName, data);
        });
    }

    async publish<K extends keyof Events>(
        event: K,
        data: Events[K]
    ): Promise<void> {
        await this.publisher.publish(
            `events:${event}`,
            JSON.stringify(data)
        );
    }

    on<K extends keyof Events>(
        event: K,
        handler: (data: Events[K]) => void
    ): void {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event)!.add(handler);
    }

    private emit(event: string, data: unknown): void {
        const handlers = this.handlers.get(event);
        if (handlers) {
            handlers.forEach((handler) => handler(data));
        }
    }
}

// Usage
const eventBus = new EventBus();

eventBus.on('user:created', (data) => {
    console.log('User created:', data.userId);
    sendWelcomeEmail(data.email);
});

await eventBus.publish('user:created', {
    userId: '123',
    email: 'john@example.com',
});
```

---

## Message Queues

### Reliable Queue with Streams

```typescript
class MessageQueue<T> {
    constructor(
        private redis: Redis,
        private queueName: string
    ) {}

    async enqueue(message: T, priority: number = 0): Promise<string> {
        const id = await this.redis.xadd(
            this.queueName,
            '*',
            'data', JSON.stringify(message),
            'priority', String(priority),
            'createdAt', String(Date.now())
        );
        return id;
    }

    async dequeue(): Promise<{ id: string; message: T } | null> {
        const result = await this.redis.xread(
            'COUNT', 1,
            'BLOCK', 5000,
            'STREAMS', this.queueName, '0'
        );

        if (!result || result.length === 0) return null;

        const [, entries] = result[0];
        if (entries.length === 0) return null;

        const [id, fields] = entries[0];
        const data = JSON.parse(fields[1]);

        // Remove from queue
        await this.redis.xdel(this.queueName, id);

        return { id, message: data };
    }

    async length(): Promise<number> {
        return this.redis.xlen(this.queueName);
    }

    async trim(maxLen: number): Promise<void> {
        await this.redis.xtrim(this.queueName, 'MAXLEN', '~', maxLen);
    }
}

// Usage
const queue = new MessageQueue<{ taskId: string; action: string }>(redis, 'tasks');

await queue.enqueue({ taskId: '123', action: 'process' });

const item = await queue.dequeue();
if (item) {
    await processTask(item.message);
}
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [data-structures.md](data-structures.md)
- [complete-examples.md](complete-examples.md)
