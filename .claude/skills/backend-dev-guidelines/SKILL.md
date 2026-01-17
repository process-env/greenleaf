---
name: backend-dev-guidelines
description: Comprehensive backend development guide for Node.js/Express/TypeScript microservices. Use when creating routes, controllers, services, repositories, middleware, or working with Express APIs, Prisma database access, Sentry error tracking, Zod validation, unifiedConfig, dependency injection, or async patterns. Covers layered architecture (routes → controllers → services → repositories), BaseController pattern, error handling, performance monitoring, testing strategies, and migration from legacy patterns.
version: "2.0.0"
lastUpdated: "2026-01-11"
frameworkVersions:
  nodejs: "20+"
  sentry: "v9"
  prisma: "6.x"
---

# Backend Development Guidelines

## Purpose

Establish consistency and best practices across backend microservices (blog-api, auth-service, notifications-service) using modern Node.js/Express/TypeScript patterns.

> **Updated 2026-01-11:** Sentry patterns updated for v9. See [sentry-and-monitoring.md](resources/sentry-and-monitoring.md) and **error-tracking** skill for v9 migration details.

## When to Use This Skill

Automatically activates when working on:
- Creating or modifying routes, endpoints, APIs
- Building controllers, services, repositories
- Implementing middleware (auth, validation, error handling)
- Database operations with Prisma
- Error tracking with Sentry
- Input validation with Zod
- Configuration management
- Backend testing and refactoring

---

## Quick Start

### New Backend Feature Checklist

- [ ] **Route**: Clean definition, delegate to controller
- [ ] **Controller**: Extend BaseController
- [ ] **Service**: Business logic with DI
- [ ] **Repository**: Database access (if complex)
- [ ] **Validation**: Zod schema
- [ ] **Sentry**: Error tracking
- [ ] **Tests**: Unit + integration tests
- [ ] **Config**: Use unifiedConfig

### New Microservice Checklist

- [ ] Directory structure (see [architecture-overview.md](architecture-overview.md))
- [ ] instrument.ts for Sentry
- [ ] unifiedConfig setup
- [ ] BaseController class
- [ ] Middleware stack
- [ ] Error boundary
- [ ] Testing framework

---

## Architecture Overview

### Layered Architecture

```
HTTP Request
    ↓
Routes (routing only)
    ↓
Controllers (request handling)
    ↓
Services (business logic)
    ↓
Repositories (data access)
    ↓
Database (Prisma)
```

**Key Principle:** Each layer has ONE responsibility.

See [architecture-overview.md](architecture-overview.md) for complete details.

---

## Directory Structure

```
service/src/
├── config/              # UnifiedConfig
├── controllers/         # Request handlers
├── services/            # Business logic
├── repositories/        # Data access
├── routes/              # Route definitions
├── middleware/          # Express middleware
├── types/               # TypeScript types
├── validators/          # Zod schemas
├── utils/               # Utilities
├── tests/               # Tests
├── instrument.ts        # Sentry (FIRST IMPORT)
├── app.ts               # Express setup
└── server.ts            # HTTP server
```

**Naming Conventions:**
- Controllers: `PascalCase` - `UserController.ts`
- Services: `camelCase` - `userService.ts`
- Routes: `camelCase + Routes` - `userRoutes.ts`
- Repositories: `PascalCase + Repository` - `UserRepository.ts`

---

## Core Principles (7 Key Rules)

### 1. Routes Only Route, Controllers Control

```typescript
// ❌ NEVER: Business logic in routes
router.post('/submit', async (req, res) => {
    // 200 lines of logic
});

// ✅ ALWAYS: Delegate to controller
router.post('/submit', (req, res) => controller.submit(req, res));
```

### 2. All Controllers Extend BaseController

```typescript
export class UserController extends BaseController {
    async getUser(req: Request, res: Response): Promise<void> {
        try {
            const user = await this.userService.findById(req.params.id);
            this.handleSuccess(res, user);
        } catch (error) {
            this.handleError(error, res, 'getUser');
        }
    }
}
```

### 3. All Errors to Sentry

```typescript
try {
    await operation();
} catch (error) {
    Sentry.captureException(error);
    throw error;
}
```

### 4. Use unifiedConfig, NEVER process.env

```typescript
// ❌ NEVER
const timeout = process.env.TIMEOUT_MS;

// ✅ ALWAYS
import { config } from './config/unifiedConfig';
const timeout = config.timeouts.default;
```

### 5. Validate All Input with Zod

```typescript
const schema = z.object({ email: z.string().email() });
const validated = schema.parse(req.body);
```

### 6. Use Repository Pattern for Data Access

```typescript
// Service → Repository → Database
const users = await userRepository.findActive();
```

### 7. Comprehensive Testing Required

```typescript
describe('UserService', () => {
    it('should create user', async () => {
        expect(user).toBeDefined();
    });
});
```

---

## Common Imports

```typescript
// Express
import express, { Request, Response, NextFunction, Router } from 'express';

// Validation
import { z } from 'zod';

// Database
import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

// Sentry
import * as Sentry from '@sentry/node';

// Config
import { config } from './config/unifiedConfig';

// Middleware
import { SSOMiddlewareClient } from './middleware/SSOMiddleware';
import { asyncErrorWrapper } from './middleware/errorBoundary';
```

---

## Quick Reference

### HTTP Status Codes

| Code | Use Case |
|------|----------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Server Error |

### Service Templates

**Blog API** (✅ Mature) - Use as template for REST APIs
**Auth Service** (✅ Mature) - Use as template for authentication patterns

---

## Gotchas & Real-World Warnings

### Layered Architecture Overhead

**Not every endpoint needs 4 layers.** For a simple GET endpoint returning static data, creating Route → Controller → Service → Repository is over-engineering. Use judgment.

```typescript
// OVERKILL for: GET /api/health
// This doesn't need service/repository layers
router.get('/health', (req, res) => res.json({ status: 'ok' }));

// APPROPRIATE for: Complex business operations
router.post('/orders', (req, res) => orderController.create(req, res));
```

### BaseController Gotchas

**handleError swallows stack traces if misconfigured.** Make sure Sentry captures the original error:

```typescript
// DANGER: Generic error message, original stack lost
this.handleError(new Error('Something went wrong'), res, 'createUser');

// BETTER: Pass original error through
this.handleError(error, res, 'createUser');
```

**Response already sent errors.** If you call `res.json()` before `handleError`:

```typescript
// DANGER: Express error - headers already sent
async create(req, res) {
  try {
    const user = await this.service.create(req.body);
    res.json(user);  // Response sent
    await this.audit.log(user);  // This throws
  } catch (error) {
    this.handleError(error, res);  // CRASH - response already sent
  }
}
```

### Prisma Pitfalls

**Connection pool exhaustion.** Serverless environments create new Prisma clients per request:

```typescript
// DANGER in serverless: New client per request = connection leak
export async function handler() {
  const prisma = new PrismaClient();
  // ...
}

// CORRECT: Singleton client
import { prisma } from '@/lib/prisma';
```

**Transaction timeouts.** Default is 5 seconds. Long operations fail silently:

```typescript
// DANGER: Complex operation exceeds default timeout
await prisma.$transaction([
  prisma.user.update({ ... }),
  prisma.order.createMany({ ... }),  // 10,000 records
  prisma.notification.create({ ... }),
]);

// SAFER: Explicit timeout
await prisma.$transaction([...], { timeout: 30000 });
```

### Validation Gaps

**Zod validates structure, not business rules:**

```typescript
// Zod says this is valid:
const schema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

// But this is nonsense (end before start):
{ startDate: '2024-12-31', endDate: '2024-01-01' }

// Add business validation in service layer, not just Zod
```

### What These Patterns Don't Tell You

1. **Database migrations in production** - Who runs them? During deployment? Manually?
2. **Secrets rotation** - unifiedConfig caches values; rotating secrets requires restart
3. **Health checks** - Load balancers need them; add `/health` and `/ready` endpoints
4. **Graceful shutdown** - Handle SIGTERM, close DB connections, finish in-flight requests
5. **Request tracing** - Add correlation IDs for debugging distributed calls
6. **Memory leaks** - Long-running Node processes need monitoring

---

## Anti-Patterns to Avoid

❌ Business logic in routes
❌ Direct process.env usage
❌ Missing error handling
❌ No input validation
❌ Direct Prisma everywhere
❌ console.log instead of Sentry

---

## Navigation Guide

| Need to... | Read this |
|------------|-----------|
| Understand architecture | [architecture-overview.md](architecture-overview.md) |
| Create routes/controllers | [routing-and-controllers.md](routing-and-controllers.md) |
| Organize business logic | [services-and-repositories.md](services-and-repositories.md) |
| Validate input | [validation-patterns.md](validation-patterns.md) |
| Add error tracking | [sentry-and-monitoring.md](sentry-and-monitoring.md) |
| Create middleware | [middleware-guide.md](middleware-guide.md) |
| Database access | [database-patterns.md](database-patterns.md) |
| Manage config | [configuration.md](configuration.md) |
| Handle async/errors | [async-and-errors.md](async-and-errors.md) |
| Write tests | [testing-guide.md](testing-guide.md) |
| See examples | [complete-examples.md](complete-examples.md) |

---

## Resource Files

### [architecture-overview.md](architecture-overview.md)
Layered architecture, request lifecycle, separation of concerns

### [routing-and-controllers.md](routing-and-controllers.md)
Route definitions, BaseController, error handling, examples

### [services-and-repositories.md](services-and-repositories.md)
Service patterns, DI, repository pattern, caching

### [validation-patterns.md](validation-patterns.md)
Zod schemas, validation, DTO pattern

### [sentry-and-monitoring.md](sentry-and-monitoring.md)
Sentry init, error capture, performance monitoring

### [middleware-guide.md](middleware-guide.md)
Auth, audit, error boundaries, AsyncLocalStorage

### [database-patterns.md](database-patterns.md)
PrismaService, repositories, transactions, optimization

### [configuration.md](configuration.md)
UnifiedConfig, environment configs, secrets

### [async-and-errors.md](async-and-errors.md)
Async patterns, custom errors, asyncErrorWrapper

### [testing-guide.md](testing-guide.md)
Unit/integration tests, mocking, coverage

### [complete-examples.md](complete-examples.md)
Full examples, refactoring guide

---

## Related Skills

- **database-verification** - Verify column names and schema consistency
- **error-tracking** - Sentry integration patterns
- **skill-developer** - Meta-skill for creating and managing skills

---

**Skill Status**: COMPLETE ✅
**Line Count**: < 500 ✅
**Progressive Disclosure**: 11 resource files ✅
