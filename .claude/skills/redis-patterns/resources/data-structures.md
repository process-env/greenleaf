# Redis Data Structures

Complete guide to Redis data structures and when to use each type.

## Table of Contents

- [Strings](#strings)
- [Hashes](#hashes)
- [Lists](#lists)
- [Sets](#sets)
- [Sorted Sets](#sorted-sets)
- [Streams](#streams)
- [Choosing the Right Structure](#choosing-the-right-structure)

---

## Strings

The most basic Redis type. Can hold any data (text, JSON, binary) up to 512MB.

### Common Operations

```typescript
// Basic set/get
await redis.set('key', 'value');
await redis.set('key', 'value', 'EX', 3600);  // With 1 hour TTL
await redis.set('key', 'value', 'NX');         // Only if not exists
await redis.set('key', 'value', 'XX');         // Only if exists

const value = await redis.get('key');

// Multiple keys
await redis.mset('key1', 'value1', 'key2', 'value2');
const values = await redis.mget('key1', 'key2');

// Counters
await redis.incr('counter');
await redis.incrby('counter', 10);
await redis.decr('counter');
await redis.incrbyfloat('counter', 1.5);

// String manipulation
await redis.append('key', ' appended');
const length = await redis.strlen('key');
const substring = await redis.getrange('key', 0, 4);
```

### Use Cases

- **Caching**: Store serialized objects
- **Counters**: Page views, API calls
- **Session tokens**: Simple session storage
- **Rate limiting**: Request counts

---

## Hashes

Maps between string fields and string values. Perfect for objects.

### Common Operations

```typescript
// Set fields
await redis.hset('user:123', 'name', 'John');
await redis.hset('user:123', { name: 'John', email: 'john@example.com', age: '30' });

// Get fields
const name = await redis.hget('user:123', 'name');
const user = await redis.hgetall('user:123');
const fields = await redis.hmget('user:123', 'name', 'email');

// Check existence
const exists = await redis.hexists('user:123', 'name');

// Get all field names or values
const fieldNames = await redis.hkeys('user:123');
const fieldValues = await redis.hvals('user:123');

// Increment numeric field
await redis.hincrby('user:123', 'loginCount', 1);
await redis.hincrbyfloat('user:123', 'balance', 10.50);

// Delete field
await redis.hdel('user:123', 'temporaryField');

// Get field count
const count = await redis.hlen('user:123');
```

### Use Cases

- **User profiles**: Store user attributes
- **Product data**: Store product details
- **Settings**: Application configuration
- **Counters per entity**: Multiple counters in one key

---

## Lists

Ordered collections of strings. Implemented as linked lists.

### Common Operations

```typescript
// Add elements
await redis.lpush('queue', 'item1');              // Add to head
await redis.rpush('queue', 'item2', 'item3');     // Add to tail

// Remove and return
const first = await redis.lpop('queue');          // Remove from head
const last = await redis.rpop('queue');           // Remove from tail

// Blocking pop (for queues)
const item = await redis.blpop('queue', 5);       // Wait up to 5 seconds

// Get range
const items = await redis.lrange('queue', 0, -1); // Get all
const first10 = await redis.lrange('queue', 0, 9);

// Get by index
const element = await redis.lindex('queue', 0);

// Set by index
await redis.lset('queue', 0, 'newValue');

// Get length
const length = await redis.llen('queue');

// Trim (keep only range)
await redis.ltrim('recent', 0, 99);               // Keep last 100
```

### Use Cases

- **Job queues**: FIFO processing
- **Recent activity**: Last N items
- **Timeline/feeds**: Ordered events
- **Message buffers**: Temporary storage

---

## Sets

Unordered collections of unique strings.

### Common Operations

```typescript
// Add members
await redis.sadd('tags', 'redis', 'database', 'cache');

// Remove members
await redis.srem('tags', 'cache');

// Check membership
const isMember = await redis.sismember('tags', 'redis');

// Get all members
const members = await redis.smembers('tags');

// Get random member(s)
const random = await redis.srandmember('tags');
const randomThree = await redis.srandmember('tags', 3);

// Pop random member
const popped = await redis.spop('tags');

// Set operations
const union = await redis.sunion('set1', 'set2');
const intersection = await redis.sinter('set1', 'set2');
const difference = await redis.sdiff('set1', 'set2');

// Store results
await redis.sunionstore('result', 'set1', 'set2');

// Get cardinality
const count = await redis.scard('tags');
```

### Use Cases

- **Tags/categories**: Unique labels
- **Online users**: Track unique visitors
- **Unique items**: Deduplication
- **Social features**: Followers, friends

---

## Sorted Sets

Like Sets but with a score for each member. Ordered by score.

### Common Operations

```typescript
// Add with scores
await redis.zadd('leaderboard', 100, 'player1', 200, 'player2');
await redis.zadd('leaderboard', { 'player3': 150 });

// Get by rank (lowest to highest)
const bottom10 = await redis.zrange('leaderboard', 0, 9);
const withScores = await redis.zrange('leaderboard', 0, 9, 'WITHSCORES');

// Get by rank (highest to lowest)
const top10 = await redis.zrevrange('leaderboard', 0, 9, 'WITHSCORES');

// Get by score range
const range = await redis.zrangebyscore('leaderboard', 100, 200);

// Get rank
const rank = await redis.zrank('leaderboard', 'player1');        // Low to high
const revRank = await redis.zrevrank('leaderboard', 'player1');  // High to low

// Get score
const score = await redis.zscore('leaderboard', 'player1');

// Increment score
await redis.zincrby('leaderboard', 10, 'player1');

// Remove members
await redis.zrem('leaderboard', 'player1');

// Remove by rank range
await redis.zremrangebyrank('leaderboard', 0, 9);  // Remove bottom 10

// Remove by score range
await redis.zremrangebyscore('leaderboard', 0, 100);

// Get cardinality
const count = await redis.zcard('leaderboard');
```

### Use Cases

- **Leaderboards**: Ranked scores
- **Priority queues**: Score = priority
- **Time-series data**: Score = timestamp
- **Rate limiting**: Sliding window

---

## Streams

Append-only log data structure. Perfect for event sourcing.

### Common Operations

```typescript
// Add entries
const id = await redis.xadd('events', '*', 'type', 'login', 'userId', '123');
// Returns something like "1234567890123-0"

// Add with specific ID
await redis.xadd('events', '1234567890123-0', 'type', 'login');

// Read entries
const entries = await redis.xrange('events', '-', '+');           // All
const recent = await redis.xrange('events', '-', '+', 'COUNT', 10);

// Read from specific ID
const fromId = await redis.xrange('events', '1234567890123-0', '+');

// Reverse read
const reverse = await redis.xrevrange('events', '+', '-', 'COUNT', 10);

// Get length
const length = await redis.xlen('events');

// Consumer groups
await redis.xgroup('CREATE', 'events', 'mygroup', '$', 'MKSTREAM');

// Read as consumer
const messages = await redis.xreadgroup(
    'GROUP', 'mygroup', 'consumer1',
    'COUNT', 10, 'STREAMS', 'events', '>'
);

// Acknowledge processing
await redis.xack('events', 'mygroup', messageId);

// Trim stream
await redis.xtrim('events', 'MAXLEN', '~', 1000);  // Keep ~1000 entries
```

### Use Cases

- **Event sourcing**: Immutable event log
- **Activity feeds**: Social media feeds
- **Message queues**: With consumer groups
- **Audit logs**: System events

---

## Choosing the Right Structure

| Need | Use | Why |
|------|-----|-----|
| Simple key-value | String | Fastest, simplest |
| Object with fields | Hash | Memory efficient, field-level access |
| Queue (FIFO) | List | Push/pop operations |
| Stack (LIFO) | List | LPUSH + LPOP |
| Unique collection | Set | Automatic deduplication |
| Ranked data | Sorted Set | Score-based ordering |
| Event log | Stream | Append-only, consumer groups |
| Counter | String | INCR is atomic |
| Bitmap | String | SETBIT/GETBIT operations |

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [caching-strategies.md](caching-strategies.md)
