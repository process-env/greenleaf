---
name: convex-realtime
description: Convex reactive database and sync engine for building real-time applications. Covers queries, mutations, actions, schemas, indexes, real-time subscriptions, TypeScript patterns, and best practices for live-updating apps like sports databases.
version: "2.0.0"
lastUpdated: "2026-01-11"
frameworkVersions:
  convex: "1.31+"
---

# Convex Realtime

> **Updated 2026-01-11:** Added Zod 4 helpers support and ESLint rules. Convex 1.31+ API patterns.

## Purpose

Comprehensive guide for building real-time applications with Convex's reactive database and sync engine. Perfect for live-updating dashboards, sports databases, collaborative apps, and any application requiring instant data synchronization.

## When to Use This Skill

Automatically activates when working on:
- Real-time data synchronization
- Live-updating UIs and dashboards
- Building with Convex database
- Schema design with validators
- Query and mutation patterns
- Scheduled and background jobs
- Sports data, game stats, live scores

---

## Quick Start

### Installation

```bash
npm install convex
npx convex dev
```

### Project Structure

```
convex/
├── _generated/         # Auto-generated (don't edit)
│   ├── api.d.ts
│   └── dataModel.d.ts
├── schema.ts           # Database schema
├── functions/          # Your functions
│   ├── games.ts
│   ├── players.ts
│   └── stats.ts
└── crons.ts            # Scheduled jobs
```

### Basic Schema (MLB Example)

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
    teams: defineTable({
        name: v.string(),
        city: v.string(),
        abbreviation: v.string(),
        league: v.union(v.literal('AL'), v.literal('NL')),
        division: v.union(v.literal('East'), v.literal('Central'), v.literal('West')),
        wins: v.number(),
        losses: v.number(),
        logoUrl: v.optional(v.string()),
    })
        .index('by_league', ['league'])
        .index('by_division', ['league', 'division']),

    players: defineTable({
        teamId: v.id('teams'),
        name: v.string(),
        number: v.number(),
        position: v.string(),
        battingAverage: v.optional(v.number()),
        era: v.optional(v.number()),
        isActive: v.boolean(),
    })
        .index('by_team', ['teamId'])
        .index('by_position', ['position']),

    games: defineTable({
        homeTeamId: v.id('teams'),
        awayTeamId: v.id('teams'),
        homeScore: v.number(),
        awayScore: v.number(),
        inning: v.number(),
        isLive: v.boolean(),
        status: v.union(v.literal('scheduled'), v.literal('live'), v.literal('final')),
        startTime: v.number(),
    })
        .index('by_status', ['status'])
        .index('by_team', ['homeTeamId'])
        .index('by_date', ['startTime']),
});
```

---

## Core Concepts

### The Sync Engine

Convex automatically syncs data between server and clients:

1. **Queries subscribe** to data changes
2. **Mutations update** the database
3. **Changes propagate** instantly to all subscribers
4. **UI re-renders** automatically

```typescript
// Client: Subscribe to live games
const liveGames = useQuery(api.games.getLive);
// Automatically updates when any game changes!
```

### Three Function Types

| Type | Purpose | Database | External APIs |
|------|---------|----------|---------------|
| **Query** | Read data, subscribe to changes | Read only | No |
| **Mutation** | Write data transactionally | Read/Write | No |
| **Action** | Call external APIs | Via internal functions | Yes |

---

## Queries

### Basic Query

```typescript
// convex/games.ts
import { query } from './_generated/server';
import { v } from 'convex/values';

export const getLive = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query('games')
            .withIndex('by_status', q => q.eq('status', 'live'))
            .collect();
    },
});
```

### Query with Arguments

```typescript
export const getByTeam = query({
    args: { teamId: v.id('teams') },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('games')
            .withIndex('by_team', q => q.eq('homeTeamId', args.teamId))
            .collect();
    },
});
```

### Query with Joins

```typescript
export const getLiveWithTeams = query({
    args: {},
    handler: async (ctx) => {
        const games = await ctx.db
            .query('games')
            .withIndex('by_status', q => q.eq('status', 'live'))
            .collect();

        // Enrich with team data
        return Promise.all(
            games.map(async (game) => ({
                ...game,
                homeTeam: await ctx.db.get(game.homeTeamId),
                awayTeam: await ctx.db.get(game.awayTeamId),
            }))
        );
    },
});
```

### Filtering and Ordering

```typescript
export const getRecentGames = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('games')
            .withIndex('by_date')
            .order('desc')
            .filter(q => q.eq(q.field('status'), 'final'))
            .take(args.limit ?? 10);
    },
});
```

---

## Mutations

### Basic Mutation

```typescript
// convex/games.ts
import { mutation } from './_generated/server';
import { v } from 'convex/values';

export const updateScore = mutation({
    args: {
        gameId: v.id('games'),
        homeScore: v.number(),
        awayScore: v.number(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.gameId, {
            homeScore: args.homeScore,
            awayScore: args.awayScore,
        });
    },
});
```

### Create Document

```typescript
export const create = mutation({
    args: {
        homeTeamId: v.id('teams'),
        awayTeamId: v.id('teams'),
        startTime: v.number(),
    },
    handler: async (ctx, args) => {
        const gameId = await ctx.db.insert('games', {
            homeTeamId: args.homeTeamId,
            awayTeamId: args.awayTeamId,
            homeScore: 0,
            awayScore: 0,
            inning: 0,
            isLive: false,
            status: 'scheduled',
            startTime: args.startTime,
        });
        return gameId;
    },
});
```

### Update with Validation

```typescript
export const advanceInning = mutation({
    args: { gameId: v.id('games') },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (!game) throw new Error('Game not found');
        if (game.status !== 'live') throw new Error('Game is not live');

        if (game.inning >= 9) {
            // Check for tie, might need extra innings
            if (game.homeScore === game.awayScore) {
                await ctx.db.patch(args.gameId, { inning: game.inning + 1 });
            } else {
                await ctx.db.patch(args.gameId, { status: 'final', isLive: false });
            }
        } else {
            await ctx.db.patch(args.gameId, { inning: game.inning + 1 });
        }
    },
});
```

### Delete Document

```typescript
export const remove = mutation({
    args: { gameId: v.id('games') },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.gameId);
    },
});
```

---

## Actions (External APIs)

### Fetch External Data

```typescript
// convex/actions/mlbApi.ts
import { action, internalMutation } from '../_generated/server';
import { internal } from '../_generated/api';
import { v } from 'convex/values';

export const syncLiveScores = action({
    args: {},
    handler: async (ctx) => {
        // Fetch from MLB API
        const response = await fetch('https://api.mlb.com/api/v1/schedule/games/?sportId=1');
        const data = await response.json();

        // Update database via internal mutation
        for (const game of data.dates[0]?.games ?? []) {
            await ctx.runMutation(internal.games.upsertFromApi, {
                externalId: game.gamePk.toString(),
                homeScore: game.teams.home.score ?? 0,
                awayScore: game.teams.away.score ?? 0,
                status: mapStatus(game.status.abstractGameState),
            });
        }

        return { synced: data.dates[0]?.games?.length ?? 0 };
    },
});
```

### Internal Mutations (Called by Actions)

```typescript
// convex/games.ts
import { internalMutation } from './_generated/server';
import { v } from 'convex/values';

export const upsertFromApi = internalMutation({
    args: {
        externalId: v.string(),
        homeScore: v.number(),
        awayScore: v.number(),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query('games')
            .withIndex('by_external_id', q => q.eq('externalId', args.externalId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                homeScore: args.homeScore,
                awayScore: args.awayScore,
                status: args.status,
            });
        }
    },
});
```

---

## React Integration

### Provider Setup

```typescript
// app/providers.tsx
'use client';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: React.ReactNode }) {
    return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
```

### useQuery - Real-time Subscriptions

```typescript
'use client';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function LiveScoreboard() {
    // Automatically subscribes and updates in real-time!
    const liveGames = useQuery(api.games.getLive);

    if (liveGames === undefined) return <Loading />;

    return (
        <div>
            {liveGames.map(game => (
                <GameCard key={game._id} game={game} />
            ))}
        </div>
    );
}
```

### useMutation

```typescript
'use client';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function ScoreUpdater({ gameId }: { gameId: Id<'games'> }) {
    const updateScore = useMutation(api.games.updateScore);

    const handleHomeRun = async () => {
        await updateScore({
            gameId,
            homeScore: currentHomeScore + 1,
            awayScore: currentAwayScore,
        });
        // UI updates automatically via subscription!
    };

    return <button onClick={handleHomeRun}>Home Run!</button>;
}
```

### useAction

```typescript
'use client';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function SyncButton() {
    const syncScores = useAction(api.actions.mlbApi.syncLiveScores);
    const [syncing, setSyncing] = useState(false);

    const handleSync = async () => {
        setSyncing(true);
        try {
            const result = await syncScores();
            console.log(`Synced ${result.synced} games`);
        } finally {
            setSyncing(false);
        }
    };

    return (
        <button onClick={handleSync} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync Live Scores'}
        </button>
    );
}
```

### Conditional Queries

```typescript
const teamId = selectedTeamId; // might be null
const games = useQuery(
    api.games.getByTeam,
    teamId ? { teamId } : 'skip'
);
```

---

## Scheduling

### Cron Jobs

```typescript
// convex/crons.ts
import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Sync live scores every 30 seconds during games
crons.interval('sync-live-scores', { seconds: 30 }, internal.actions.mlbApi.syncLiveScores);

// Daily standings update at 6 AM UTC
crons.daily('update-standings', { hourUTC: 6, minuteUTC: 0 }, internal.teams.updateStandings);

// Weekly cleanup on Sundays at midnight
crons.weekly('cleanup-old-games', { dayOfWeek: 'sunday', hourUTC: 0, minuteUTC: 0 }, internal.games.archiveOld);

export default crons;
```

### Scheduled Functions

```typescript
// convex/games.ts
export const startGame = mutation({
    args: { gameId: v.id('games') },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.gameId, {
            status: 'live',
            isLive: true,
        });

        // Schedule game end check in 4 hours
        await ctx.scheduler.runAfter(
            4 * 60 * 60 * 1000, // 4 hours in ms
            internal.games.checkGameEnd,
            { gameId: args.gameId }
        );
    },
});
```

---

## Indexes Best Practices

### Index Design

```typescript
// Good: Query patterns match index structure
defineTable({ ... })
    .index('by_status', ['status'])                    // Filter by status
    .index('by_team_date', ['teamId', 'startTime'])    // Filter by team, sort by date
    .index('by_league_wins', ['league', 'wins'])       // Standings by league
```

### Query with Index

```typescript
// Must use fields in order
const games = await ctx.db
    .query('games')
    .withIndex('by_team_date', q =>
        q.eq('teamId', teamId)           // First field: equality
         .gte('startTime', startOfWeek)  // Second field: range
         .lte('startTime', endOfWeek)
    )
    .collect();
```

### Compound Indexes

```typescript
// For queries like: "games for team X in date range"
.index('by_team_date', ['teamId', 'startTime'])

// Query must follow field order
.withIndex('by_team_date', q => q
    .eq('teamId', teamId)     // ✓ First field
    .gt('startTime', date)    // ✓ Second field
)
```

---

## Common Patterns Reference

| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| **Live updates** | Real-time scores | `useQuery` + mutation |
| **Polling external API** | Sync MLB data | Cron + action |
| **Optimistic updates** | Instant UI feedback | `useMutation` options |
| **Joins** | Team details in games | Query with `ctx.db.get()` |
| **Pagination** | Large result sets | `.paginate()` |
| **Filtering** | Active games only | `.filter()` or index |

---

## Gotchas & Real-World Warnings

### Real-Time Has Costs

**Every subscriber costs money.** 1000 users watching a live scoreboard = 1000 active subscriptions. Convex pricing is based on function calls and bandwidth.

```typescript
// EXPENSIVE: Every user subscribes to all games
const allGames = useQuery(api.games.getAll);

// CHEAPER: Subscribe only to relevant data
const myTeamGames = useQuery(api.games.getByTeam, { teamId: userTeamId });
```

**Frequent updates multiply quickly.** Updating scores every second × 1000 subscribers = 1000 function calls/second.

### Actions Are Not Transactions

**Actions don't roll back.** If your action calls multiple mutations and one fails:

```typescript
// DANGER: Partial state on failure
export const processOrder = action({
  handler: async (ctx) => {
    await ctx.runMutation(internal.orders.create, { ... });  // Succeeds
    await ctx.runMutation(internal.inventory.decrement, { ... });  // Fails
    await ctx.runMutation(internal.notifications.send, { ... });  // Never runs
    // Order exists but inventory not decremented!
  }
});

// BETTER: Use a single mutation for transactional operations
```

**External API calls can't be undone.** If you send an email then the database write fails, the email is already sent.

### Query Reactivity Surprises

**Queries re-run on ANY table change.** If your query touches the `games` table, it re-runs when ANY game changes, not just the one you're viewing.

```typescript
// RE-RUNS OFTEN: Any change to games table
export const getGame = query({
  args: { gameId: v.id('games') },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    // Also re-runs if unrelated games change
  }
});
```

**Large result sets hurt performance.** Returning 10,000 documents makes the client slow:

```typescript
// DANGER: Client receives entire table
return await ctx.db.query('events').collect();

// BETTER: Paginate
return await ctx.db.query('events').paginate(opts);
```

### Index Gotchas

**Filter after index is slow.** The index narrows results, then filter scans the rest:

```typescript
// SLOW: Index gets 10,000 rows, filter scans all
.withIndex('by_team', q => q.eq('teamId', teamId))
.filter(q => q.eq(q.field('isLive'), true))

// FAST: Compound index includes both fields
.withIndex('by_team_status', q =>
  q.eq('teamId', teamId).eq('isLive', true)
)
```

**Index field order matters.** You can't use the second field without the first:

```typescript
// Index: ['league', 'division', 'wins']

// ✓ Valid
.withIndex('by_league', q => q.eq('league', 'AL'))
.withIndex('by_league', q => q.eq('league', 'AL').eq('division', 'East'))

// ✗ Invalid - can't skip 'league'
.withIndex('by_league', q => q.eq('division', 'East'))
```

### What These Patterns Don't Tell You

1. **Local development** - `npx convex dev` needs to run alongside your app
2. **Schema migrations** - Changing validators on existing data is tricky
3. **Authentication** - Convex has its own auth or integrates with Clerk/Auth0
4. **File storage** - Different API than database; has its own limits
5. **Cold starts** - First query after idle period is slower
6. **Debugging** - Dashboard is your friend; use `console.log` in functions

---

## Anti-Patterns to Avoid

- **Calling external APIs in queries/mutations** (use actions)
- **Multiple runMutation calls without batching** (race conditions)
- **Not using indexes for large tables** (slow queries)
- **Storing derived data** (compute in queries instead)
- **Forgetting to handle `undefined`** from useQuery (loading state)
- **Using `collect()` on large tables** (use pagination)

---

## Navigation Guide

| Need to... | Read this |
|------------|-----------|
| Design schemas | [schema-design.md](resources/schema-design.md) |
| Write queries | [queries-and-filters.md](resources/queries-and-filters.md) |
| Handle mutations | [mutations-and-transactions.md](resources/mutations-and-transactions.md) |
| Call external APIs | [actions-and-scheduling.md](resources/actions-and-scheduling.md) |
| Optimize performance | [indexes-and-performance.md](resources/indexes-and-performance.md) |
| See MLB examples | [complete-examples.md](resources/complete-examples.md) |

---

## Resource Files

### [schema-design.md](resources/schema-design.md)
Validators (v.string, v.id, v.union), relationships, optional fields, schema evolution

### [queries-and-filters.md](resources/queries-and-filters.md)
Query patterns, withIndex, filter, order, collect, pagination, joins

### [mutations-and-transactions.md](resources/mutations-and-transactions.md)
insert, patch, replace, delete, transactions, validation, optimistic updates

### [actions-and-scheduling.md](resources/actions-and-scheduling.md)
External APIs, runQuery, runMutation, cron jobs, scheduler

### [indexes-and-performance.md](resources/indexes-and-performance.md)
Index design, compound indexes, query optimization, best practices

### [complete-examples.md](resources/complete-examples.md)
Full MLB database implementation with real-time scores, standings, player stats

---

**Skill Status**: COMPLETE
**Line Count**: < 500
**Progressive Disclosure**: 6 resource files
