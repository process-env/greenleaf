# Session Management

Guide to implementing session storage and management with Redis.

## Table of Contents

- [Basic Session Store](#basic-session-store)
- [Express Session Integration](#express-session-integration)
- [JWT Token Blacklisting](#jwt-token-blacklisting)
- [Multi-Device Sessions](#multi-device-sessions)
- [Session Security](#session-security)

---

## Basic Session Store

### Session Interface

```typescript
interface Session {
    id: string;
    userId: string;
    email: string;
    roles: string[];
    createdAt: number;
    lastAccess: number;
    expiresAt: number;
    metadata?: {
        userAgent?: string;
        ip?: string;
        device?: string;
    };
}

interface SessionStore {
    create(data: Omit<Session, 'id'>): Promise<Session>;
    get(sessionId: string): Promise<Session | null>;
    update(sessionId: string, data: Partial<Session>): Promise<Session | null>;
    destroy(sessionId: string): Promise<boolean>;
    destroyAll(userId: string): Promise<number>;
}
```

### Redis Implementation

```typescript
class RedisSessionStore implements SessionStore {
    private readonly prefix = 'session:';
    private readonly userSessionsPrefix = 'user:sessions:';
    private readonly defaultTTL = 86400; // 24 hours

    constructor(private redis: Redis) {}

    async create(data: Omit<Session, 'id'>): Promise<Session> {
        const sessionId = crypto.randomUUID();
        const session: Session = {
            ...data,
            id: sessionId,
            createdAt: Date.now(),
            lastAccess: Date.now(),
        };

        const ttl = Math.floor((data.expiresAt - Date.now()) / 1000);

        const pipeline = this.redis.pipeline();

        // Store session
        pipeline.set(
            `${this.prefix}${sessionId}`,
            JSON.stringify(session),
            'EX',
            ttl > 0 ? ttl : this.defaultTTL
        );

        // Track user's sessions
        pipeline.sadd(`${this.userSessionsPrefix}${data.userId}`, sessionId);
        pipeline.expire(
            `${this.userSessionsPrefix}${data.userId}`,
            this.defaultTTL
        );

        await pipeline.exec();

        return session;
    }

    async get(sessionId: string): Promise<Session | null> {
        const data = await this.redis.get(`${this.prefix}${sessionId}`);
        if (!data) return null;

        const session: Session = JSON.parse(data);

        // Check expiration
        if (session.expiresAt < Date.now()) {
            await this.destroy(sessionId);
            return null;
        }

        // Update last access (sliding expiration)
        await this.touch(sessionId);

        return session;
    }

    async update(
        sessionId: string,
        data: Partial<Session>
    ): Promise<Session | null> {
        const current = await this.get(sessionId);
        if (!current) return null;

        const updated: Session = {
            ...current,
            ...data,
            lastAccess: Date.now(),
        };

        const ttl = await this.redis.ttl(`${this.prefix}${sessionId}`);
        await this.redis.set(
            `${this.prefix}${sessionId}`,
            JSON.stringify(updated),
            'EX',
            ttl > 0 ? ttl : this.defaultTTL
        );

        return updated;
    }

    async destroy(sessionId: string): Promise<boolean> {
        const session = await this.get(sessionId);
        if (!session) return false;

        const pipeline = this.redis.pipeline();
        pipeline.del(`${this.prefix}${sessionId}`);
        pipeline.srem(`${this.userSessionsPrefix}${session.userId}`, sessionId);
        await pipeline.exec();

        return true;
    }

    async destroyAll(userId: string): Promise<number> {
        const sessionIds = await this.redis.smembers(
            `${this.userSessionsPrefix}${userId}`
        );

        if (sessionIds.length === 0) return 0;

        const pipeline = this.redis.pipeline();

        for (const sessionId of sessionIds) {
            pipeline.del(`${this.prefix}${sessionId}`);
        }
        pipeline.del(`${this.userSessionsPrefix}${userId}`);

        await pipeline.exec();

        return sessionIds.length;
    }

    private async touch(sessionId: string): Promise<void> {
        const ttl = await this.redis.ttl(`${this.prefix}${sessionId}`);
        if (ttl > 0) {
            // Optionally extend TTL on access
            await this.redis.expire(`${this.prefix}${sessionId}`, this.defaultTTL);
        }
    }

    async getActiveSessions(userId: string): Promise<Session[]> {
        const sessionIds = await this.redis.smembers(
            `${this.userSessionsPrefix}${userId}`
        );

        const sessions: Session[] = [];

        for (const sessionId of sessionIds) {
            const session = await this.get(sessionId);
            if (session) {
                sessions.push(session);
            }
        }

        return sessions;
    }
}
```

---

## Express Session Integration

### Using connect-redis

```typescript
import session from 'express-session';
import RedisStore from 'connect-redis';
import Redis from 'ioredis';

const redis = new Redis();

const sessionStore = new RedisStore({
    client: redis,
    prefix: 'sess:',
    ttl: 86400, // 24 hours
});

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET!,
    name: 'sessionId',
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset TTL on each request
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 86400000, // 24 hours
        sameSite: 'lax',
    },
}));
```

### Custom Session Middleware

```typescript
import { Request, Response, NextFunction } from 'express';

const sessionStore = new RedisSessionStore(redis);

declare global {
    namespace Express {
        interface Request {
            session?: Session;
        }
    }
}

export async function sessionMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const sessionId = req.cookies.sessionId;

    if (sessionId) {
        const session = await sessionStore.get(sessionId);
        if (session) {
            req.session = session;
        }
    }

    next();
}

export function requireSession(
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

## JWT Token Blacklisting

### Blacklist Store

```typescript
class TokenBlacklist {
    private readonly prefix = 'blacklist:token:';

    constructor(private redis: Redis) {}

    async add(jti: string, expiresAt: Date): Promise<void> {
        const ttl = Math.max(
            0,
            Math.floor((expiresAt.getTime() - Date.now()) / 1000)
        );

        if (ttl > 0) {
            await this.redis.set(`${this.prefix}${jti}`, '1', 'EX', ttl);
        }
    }

    async isBlacklisted(jti: string): Promise<boolean> {
        const exists = await this.redis.exists(`${this.prefix}${jti}`);
        return exists === 1;
    }

    async addBulk(tokens: { jti: string; expiresAt: Date }[]): Promise<void> {
        const pipeline = this.redis.pipeline();

        for (const { jti, expiresAt } of tokens) {
            const ttl = Math.max(
                0,
                Math.floor((expiresAt.getTime() - Date.now()) / 1000)
            );

            if (ttl > 0) {
                pipeline.set(`${this.prefix}${jti}`, '1', 'EX', ttl);
            }
        }

        await pipeline.exec();
    }
}

// Middleware
const blacklist = new TokenBlacklist(redis);

async function validateToken(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

        // Check blacklist
        if (decoded.jti && await blacklist.isBlacklisted(decoded.jti)) {
            res.status(401).json({ error: 'Token revoked' });
            return;
        }

        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
}

// Logout - blacklist the token
async function logout(req: Request, res: Response): Promise<void> {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.decode(token!) as JWTPayload;

    if (decoded.jti && decoded.exp) {
        await blacklist.add(decoded.jti, new Date(decoded.exp * 1000));
    }

    res.json({ success: true });
}
```

---

## Multi-Device Sessions

### Device-Aware Sessions

```typescript
interface DeviceSession extends Session {
    deviceId: string;
    deviceName: string;
    deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
    lastLocation?: {
        ip: string;
        country?: string;
        city?: string;
    };
}

class MultiDeviceSessionStore extends RedisSessionStore {
    private readonly devicePrefix = 'device:session:';

    async createDeviceSession(
        data: Omit<DeviceSession, 'id'>,
        maxDevices: number = 5
    ): Promise<DeviceSession> {
        const userId = data.userId;

        // Check device limit
        const activeSessions = await this.getActiveSessions(userId);

        if (activeSessions.length >= maxDevices) {
            // Remove oldest session
            const oldest = activeSessions.reduce((a, b) =>
                a.lastAccess < b.lastAccess ? a : b
            );
            await this.destroy(oldest.id);
        }

        // Check if device already has session
        const existingDeviceSession = await this.redis.get(
            `${this.devicePrefix}${userId}:${data.deviceId}`
        );

        if (existingDeviceSession) {
            await this.destroy(existingDeviceSession);
        }

        // Create new session
        const session = await this.create(data) as DeviceSession;

        // Track device -> session mapping
        await this.redis.set(
            `${this.devicePrefix}${userId}:${data.deviceId}`,
            session.id,
            'EX',
            86400
        );

        return session;
    }

    async destroyDevice(userId: string, deviceId: string): Promise<boolean> {
        const sessionId = await this.redis.get(
            `${this.devicePrefix}${userId}:${deviceId}`
        );

        if (!sessionId) return false;

        await this.redis.del(`${this.devicePrefix}${userId}:${deviceId}`);
        return this.destroy(sessionId);
    }

    async getDeviceSessions(userId: string): Promise<DeviceSession[]> {
        return this.getActiveSessions(userId) as Promise<DeviceSession[]>;
    }
}
```

---

## Session Security

### Secure Session Configuration

```typescript
const securityConfig = {
    // Session ID generation
    idLength: 32,
    idAlphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',

    // Timeouts
    absoluteTimeout: 24 * 60 * 60 * 1000,  // 24 hours max
    idleTimeout: 30 * 60 * 1000,            // 30 minutes idle

    // Concurrent sessions
    maxSessionsPerUser: 5,

    // IP binding
    bindToIP: false, // Set true for high-security apps

    // Fingerprinting
    useFingerprint: true,
};

function generateSecureSessionId(): string {
    const bytes = crypto.randomBytes(securityConfig.idLength);
    let result = '';
    for (const byte of bytes) {
        result += securityConfig.idAlphabet[byte % securityConfig.idAlphabet.length];
    }
    return result;
}

function generateFingerprint(req: Request): string {
    const data = [
        req.headers['user-agent'] || '',
        req.headers['accept-language'] || '',
        req.headers['accept-encoding'] || '',
    ].join('|');

    return crypto.createHash('sha256').update(data).digest('hex').slice(0, 16);
}
```

### Session Hijacking Prevention

```typescript
async function validateSessionSecurity(
    req: Request,
    session: Session
): Promise<boolean> {
    // Check fingerprint
    if (securityConfig.useFingerprint) {
        const currentFingerprint = generateFingerprint(req);
        if (session.metadata?.fingerprint !== currentFingerprint) {
            console.warn('Session fingerprint mismatch');
            return false;
        }
    }

    // Check IP binding
    if (securityConfig.bindToIP) {
        if (session.metadata?.ip !== req.ip) {
            console.warn('Session IP mismatch');
            return false;
        }
    }

    // Check absolute timeout
    if (Date.now() - session.createdAt > securityConfig.absoluteTimeout) {
        console.warn('Session absolute timeout');
        return false;
    }

    // Check idle timeout
    if (Date.now() - session.lastAccess > securityConfig.idleTimeout) {
        console.warn('Session idle timeout');
        return false;
    }

    return true;
}
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [caching-strategies.md](caching-strategies.md)
- [distributed-locking.md](distributed-locking.md)
