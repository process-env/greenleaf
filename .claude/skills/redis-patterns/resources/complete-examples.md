# Complete Examples

Real-world implementation examples combining multiple Redis patterns.

## Table of Contents

- [API Rate Limiter Middleware](#api-rate-limiter-middleware)
- [Session-Based Authentication](#session-based-authentication)
- [Real-Time Leaderboard](#real-time-leaderboard)
- [Distributed Job Queue](#distributed-job-queue)
- [Cache Layer with Fallback](#cache-layer-with-fallback)

---

## API Rate Limiter Middleware

Complete Express middleware with multiple rate limit tiers.

```typescript
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

const redis = new Redis();

interface RateLimitTier {
    limit: number;
    windowMs: number;
}

const RATE_LIMITS: Record<string, RateLimitTier> = {
    anonymous: { limit: 60, windowMs: 60000 },    // 60/min
    authenticated: { limit: 300, windowMs: 60000 }, // 300/min
    premium: { limit: 1000, windowMs: 60000 },     // 1000/min
};

const rateLimitScript = `
    local key = KEYS[1]
    local limit = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])

    redis.call('zremrangebyscore', key, 0, now - window)

    local count = redis.call('zcard', key)

    if count >= limit then
        local oldest = redis.call('zrange', key, 0, 0, 'WITHSCORES')
        local resetAt = oldest[2] and (tonumber(oldest[2]) + window) or (now + window)
        return {0, count, resetAt}
    end

    redis.call('zadd', key, now, now .. '-' .. math.random())
    redis.call('expire', key, math.ceil(window / 1000))

    return {1, count + 1, now + window}
`;

export function rateLimiter() {
    return async (req: Request, res: Response, next: NextFunction) => {
        // Determine rate limit tier
        const tier = req.user?.premium ? 'premium' :
                    req.user ? 'authenticated' : 'anonymous';
        const config = RATE_LIMITS[tier];

        // Generate key based on user or IP
        const identifier = req.user?.id || req.ip;
        const key = `ratelimit:${tier}:${identifier}`;

        try {
            const [allowed, count, resetAt] = await redis.eval(
                rateLimitScript,
                1,
                key,
                String(config.limit),
                String(config.windowMs),
                String(Date.now())
            ) as [number, number, number];

            // Set headers
            res.set({
                'X-RateLimit-Limit': String(config.limit),
                'X-RateLimit-Remaining': String(Math.max(0, config.limit - count)),
                'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
            });

            if (!allowed) {
                res.status(429).json({
                    error: 'Too Many Requests',
                    retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
                });
                return;
            }

            next();
        } catch (error) {
            // Fail open - allow request if Redis is down
            console.error('Rate limit error:', error);
            next();
        }
    };
}
```

---

## Session-Based Authentication

Complete auth system with sessions, devices, and security.

```typescript
import Redis from 'ioredis';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

const redis = new Redis();

interface User {
    id: string;
    email: string;
    roles: string[];
}

interface Session {
    id: string;
    userId: string;
    user: User;
    deviceId: string;
    createdAt: number;
    lastAccess: number;
    fingerprint: string;
}

class AuthService {
    private readonly SESSION_TTL = 86400; // 24 hours
    private readonly MAX_SESSIONS = 5;

    async login(
        user: User,
        req: Request
    ): Promise<{ sessionId: string; expiresAt: number }> {
        const deviceId = req.headers['x-device-id'] as string || 'unknown';
        const fingerprint = this.generateFingerprint(req);

        // Check existing sessions
        const existingSessions = await this.getUserSessions(user.id);

        // Remove oldest if at limit
        if (existingSessions.length >= this.MAX_SESSIONS) {
            const oldest = existingSessions.sort(
                (a, b) => a.lastAccess - b.lastAccess
            )[0];
            await this.destroySession(oldest.id);
        }

        // Remove existing session for this device
        const deviceSession = existingSessions.find(s => s.deviceId === deviceId);
        if (deviceSession) {
            await this.destroySession(deviceSession.id);
        }

        // Create new session
        const sessionId = crypto.randomBytes(32).toString('hex');
        const session: Session = {
            id: sessionId,
            userId: user.id,
            user,
            deviceId,
            createdAt: Date.now(),
            lastAccess: Date.now(),
            fingerprint,
        };

        const pipeline = redis.pipeline();
        pipeline.set(
            `session:${sessionId}`,
            JSON.stringify(session),
            'EX',
            this.SESSION_TTL
        );
        pipeline.sadd(`user:sessions:${user.id}`, sessionId);
        pipeline.expire(`user:sessions:${user.id}`, this.SESSION_TTL);
        await pipeline.exec();

        return {
            sessionId,
            expiresAt: Date.now() + this.SESSION_TTL * 1000,
        };
    }

    async validateSession(
        sessionId: string,
        req: Request
    ): Promise<Session | null> {
        const data = await redis.get(`session:${sessionId}`);
        if (!data) return null;

        const session: Session = JSON.parse(data);

        // Validate fingerprint
        const currentFingerprint = this.generateFingerprint(req);
        if (session.fingerprint !== currentFingerprint) {
            console.warn('Session fingerprint mismatch');
            await this.destroySession(sessionId);
            return null;
        }

        // Update last access
        session.lastAccess = Date.now();
        await redis.set(
            `session:${sessionId}`,
            JSON.stringify(session),
            'EX',
            this.SESSION_TTL
        );

        return session;
    }

    async logout(sessionId: string): Promise<void> {
        await this.destroySession(sessionId);
    }

    async logoutAll(userId: string): Promise<number> {
        const sessionIds = await redis.smembers(`user:sessions:${userId}`);

        if (sessionIds.length === 0) return 0;

        const pipeline = redis.pipeline();
        for (const id of sessionIds) {
            pipeline.del(`session:${id}`);
        }
        pipeline.del(`user:sessions:${userId}`);
        await pipeline.exec();

        return sessionIds.length;
    }

    private async destroySession(sessionId: string): Promise<void> {
        const data = await redis.get(`session:${sessionId}`);
        if (!data) return;

        const session: Session = JSON.parse(data);

        const pipeline = redis.pipeline();
        pipeline.del(`session:${sessionId}`);
        pipeline.srem(`user:sessions:${session.userId}`, sessionId);
        await pipeline.exec();
    }

    private async getUserSessions(userId: string): Promise<Session[]> {
        const sessionIds = await redis.smembers(`user:sessions:${userId}`);
        const sessions: Session[] = [];

        for (const id of sessionIds) {
            const data = await redis.get(`session:${id}`);
            if (data) {
                sessions.push(JSON.parse(data));
            }
        }

        return sessions;
    }

    private generateFingerprint(req: Request): string {
        const data = [
            req.headers['user-agent'] || '',
            req.headers['accept-language'] || '',
        ].join('|');

        return crypto.createHash('sha256').update(data).digest('hex').slice(0, 16);
    }
}

// Middleware
const authService = new AuthService();

export async function sessionMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const sessionId = req.cookies.sessionId;

    if (sessionId) {
        const session = await authService.validateSession(sessionId, req);
        if (session) {
            req.session = session;
            req.user = session.user;
        }
    }

    next();
}

export function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    if (!req.session) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    next();
}
```

---

## Real-Time Leaderboard

Complete leaderboard with rankings, pagination, and updates.

```typescript
import Redis from 'ioredis';

const redis = new Redis();

interface Player {
    id: string;
    name: string;
    avatar?: string;
}

interface LeaderboardEntry {
    rank: number;
    player: Player;
    score: number;
}

class Leaderboard {
    constructor(
        private name: string,
        private maxSize: number = 1000
    ) {}

    private get key(): string {
        return `leaderboard:${this.name}`;
    }

    private get playersKey(): string {
        return `leaderboard:${this.name}:players`;
    }

    async updateScore(player: Player, score: number): Promise<{
        rank: number;
        previousRank: number | null;
    }> {
        // Get previous rank
        const previousRank = await redis.zrevrank(this.key, player.id);

        const pipeline = redis.pipeline();

        // Update score
        pipeline.zadd(this.key, score, player.id);

        // Store player info
        pipeline.hset(this.playersKey, player.id, JSON.stringify(player));

        // Trim to max size
        pipeline.zremrangebyrank(this.key, 0, -(this.maxSize + 1));

        await pipeline.exec();

        // Get new rank
        const newRank = await redis.zrevrank(this.key, player.id);

        return {
            rank: newRank !== null ? newRank + 1 : -1,
            previousRank: previousRank !== null ? previousRank + 1 : null,
        };
    }

    async incrementScore(playerId: string, increment: number): Promise<number> {
        return redis.zincrby(this.key, increment, playerId);
    }

    async getTop(count: number = 10): Promise<LeaderboardEntry[]> {
        const results = await redis.zrevrange(this.key, 0, count - 1, 'WITHSCORES');

        return this.parseResults(results, 0);
    }

    async getAroundPlayer(
        playerId: string,
        range: number = 5
    ): Promise<LeaderboardEntry[]> {
        const rank = await redis.zrevrank(this.key, playerId);
        if (rank === null) return [];

        const start = Math.max(0, rank - range);
        const end = rank + range;

        const results = await redis.zrevrange(this.key, start, end, 'WITHSCORES');

        return this.parseResults(results, start);
    }

    async getPage(
        page: number,
        pageSize: number = 20
    ): Promise<{ entries: LeaderboardEntry[]; total: number }> {
        const start = (page - 1) * pageSize;
        const end = start + pageSize - 1;

        const [results, total] = await Promise.all([
            redis.zrevrange(this.key, start, end, 'WITHSCORES'),
            redis.zcard(this.key),
        ]);

        return {
            entries: await this.parseResults(results, start),
            total,
        };
    }

    async getPlayerRank(playerId: string): Promise<{
        rank: number;
        score: number;
    } | null> {
        const [rank, score] = await Promise.all([
            redis.zrevrank(this.key, playerId),
            redis.zscore(this.key, playerId),
        ]);

        if (rank === null || score === null) return null;

        return { rank: rank + 1, score: parseFloat(score) };
    }

    private async parseResults(
        results: string[],
        startRank: number
    ): Promise<LeaderboardEntry[]> {
        const entries: LeaderboardEntry[] = [];
        const playerIds: string[] = [];

        // Extract player IDs
        for (let i = 0; i < results.length; i += 2) {
            playerIds.push(results[i]);
        }

        // Batch fetch player info
        const playerData = playerIds.length > 0
            ? await redis.hmget(this.playersKey, ...playerIds)
            : [];

        for (let i = 0; i < results.length; i += 2) {
            const playerId = results[i];
            const score = parseFloat(results[i + 1]);
            const playerJson = playerData[i / 2];

            const player: Player = playerJson
                ? JSON.parse(playerJson)
                : { id: playerId, name: `Player ${playerId}` };

            entries.push({
                rank: startRank + (i / 2) + 1,
                player,
                score,
            });
        }

        return entries;
    }
}

// Usage
const gameLeaderboard = new Leaderboard('weekly-game', 10000);

await gameLeaderboard.updateScore(
    { id: 'player123', name: 'John', avatar: 'avatar.png' },
    1500
);

const top10 = await gameLeaderboard.getTop(10);
const myRanking = await gameLeaderboard.getAroundPlayer('player123', 5);
```

---

## Distributed Job Queue

Reliable job queue with retries, priorities, and dead letter queue.

```typescript
import Redis from 'ioredis';
import crypto from 'crypto';

const redis = new Redis();

interface Job<T = unknown> {
    id: string;
    type: string;
    data: T;
    priority: number;
    attempts: number;
    maxAttempts: number;
    createdAt: number;
    processedAt?: number;
    error?: string;
}

type JobHandler<T> = (job: Job<T>) => Promise<void>;

class JobQueue {
    private handlers = new Map<string, JobHandler<any>>();
    private isProcessing = false;

    constructor(
        private queueName: string,
        private concurrency: number = 5
    ) {}

    private get pendingKey(): string {
        return `queue:${this.queueName}:pending`;
    }

    private get processingKey(): string {
        return `queue:${this.queueName}:processing`;
    }

    private get deadLetterKey(): string {
        return `queue:${this.queueName}:dead`;
    }

    private jobKey(jobId: string): string {
        return `queue:${this.queueName}:job:${jobId}`;
    }

    async enqueue<T>(
        type: string,
        data: T,
        options: { priority?: number; maxAttempts?: number } = {}
    ): Promise<string> {
        const jobId = crypto.randomUUID();
        const job: Job<T> = {
            id: jobId,
            type,
            data,
            priority: options.priority ?? 0,
            attempts: 0,
            maxAttempts: options.maxAttempts ?? 3,
            createdAt: Date.now(),
        };

        const pipeline = redis.pipeline();
        pipeline.set(this.jobKey(jobId), JSON.stringify(job));
        pipeline.zadd(this.pendingKey, job.priority, jobId);
        await pipeline.exec();

        return jobId;
    }

    registerHandler<T>(type: string, handler: JobHandler<T>): void {
        this.handlers.set(type, handler);
    }

    async start(): Promise<void> {
        this.isProcessing = true;

        // Recover jobs stuck in processing
        await this.recoverStuckJobs();

        // Start worker loops
        const workers = Array(this.concurrency)
            .fill(null)
            .map(() => this.workerLoop());

        await Promise.all(workers);
    }

    stop(): void {
        this.isProcessing = false;
    }

    private async workerLoop(): Promise<void> {
        while (this.isProcessing) {
            try {
                await this.processNextJob();
            } catch (error) {
                console.error('Worker error:', error);
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }

    private async processNextJob(): Promise<void> {
        // Move job from pending to processing atomically
        const jobId = await redis.eval(`
            local jobId = redis.call('zpopmin', KEYS[1])
            if jobId[1] then
                redis.call('zadd', KEYS[2], ARGV[1], jobId[1])
                return jobId[1]
            end
            return nil
        `, 2, this.pendingKey, this.processingKey, String(Date.now())) as string | null;

        if (!jobId) {
            // No jobs - wait a bit
            await new Promise(r => setTimeout(r, 100));
            return;
        }

        const jobData = await redis.get(this.jobKey(jobId));
        if (!jobData) return;

        const job: Job = JSON.parse(jobData);
        job.attempts++;
        job.processedAt = Date.now();

        const handler = this.handlers.get(job.type);
        if (!handler) {
            console.error(`No handler for job type: ${job.type}`);
            await this.failJob(job, 'No handler registered');
            return;
        }

        try {
            await handler(job);
            await this.completeJob(job);
        } catch (error: any) {
            await this.handleJobError(job, error.message);
        }
    }

    private async completeJob(job: Job): Promise<void> {
        const pipeline = redis.pipeline();
        pipeline.zrem(this.processingKey, job.id);
        pipeline.del(this.jobKey(job.id));
        await pipeline.exec();
    }

    private async handleJobError(job: Job, error: string): Promise<void> {
        job.error = error;

        if (job.attempts < job.maxAttempts) {
            // Retry with exponential backoff
            const delay = Math.pow(2, job.attempts) * 1000;
            const retryAt = Date.now() + delay;

            const pipeline = redis.pipeline();
            pipeline.set(this.jobKey(job.id), JSON.stringify(job));
            pipeline.zrem(this.processingKey, job.id);
            pipeline.zadd(this.pendingKey, retryAt, job.id);
            await pipeline.exec();
        } else {
            await this.failJob(job, error);
        }
    }

    private async failJob(job: Job, error: string): Promise<void> {
        job.error = error;

        const pipeline = redis.pipeline();
        pipeline.zrem(this.processingKey, job.id);
        pipeline.zadd(this.deadLetterKey, Date.now(), job.id);
        pipeline.set(this.jobKey(job.id), JSON.stringify(job));
        await pipeline.exec();
    }

    private async recoverStuckJobs(): Promise<void> {
        const stuckTimeout = 5 * 60 * 1000; // 5 minutes
        const cutoff = Date.now() - stuckTimeout;

        const stuckJobs = await redis.zrangebyscore(
            this.processingKey, 0, cutoff
        );

        for (const jobId of stuckJobs) {
            await redis.eval(`
                redis.call('zrem', KEYS[1], ARGV[1])
                redis.call('zadd', KEYS[2], 0, ARGV[1])
            `, 2, this.processingKey, this.pendingKey, jobId);
        }
    }

    async getStats(): Promise<{
        pending: number;
        processing: number;
        dead: number;
    }> {
        const [pending, processing, dead] = await Promise.all([
            redis.zcard(this.pendingKey),
            redis.zcard(this.processingKey),
            redis.zcard(this.deadLetterKey),
        ]);

        return { pending, processing, dead };
    }
}

// Usage
const emailQueue = new JobQueue('emails', 3);

emailQueue.registerHandler('send-email', async (job) => {
    const { to, subject, body } = job.data as any;
    await sendEmail(to, subject, body);
});

await emailQueue.enqueue('send-email', {
    to: 'user@example.com',
    subject: 'Welcome!',
    body: 'Hello...',
}, { priority: 1 });

emailQueue.start();
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- All other resource files
