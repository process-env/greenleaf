# Queries and Filters

## Query Basics

### Simple Query

```typescript
import { query } from './_generated/server';

export const getAll = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query('games').collect();
    },
});
```

### Query by ID

```typescript
import { v } from 'convex/values';

export const get = query({
    args: { id: v.id('games') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
```

### Query with Arguments

```typescript
export const getByStatus = query({
    args: {
        status: v.union(
            v.literal('scheduled'),
            v.literal('live'),
            v.literal('final')
        ),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('games')
            .withIndex('by_status', q => q.eq('status', args.status))
            .collect();
    },
});
```

---

## Using Indexes

### Index Query (Recommended)

```typescript
// Efficient - uses index
export const getLiveGames = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query('games')
            .withIndex('by_status', q => q.eq('status', 'live'))
            .collect();
    },
});
```

### Range Queries

```typescript
export const getGamesByDateRange = query({
    args: {
        startDate: v.number(),
        endDate: v.number(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('games')
            .withIndex('by_date', q =>
                q.gte('startTime', args.startDate)
                 .lte('startTime', args.endDate)
            )
            .collect();
    },
});
```

### Compound Index Query

```typescript
// Index: .index('by_team_date', ['teamId', 'startTime'])
export const getTeamGames = query({
    args: {
        teamId: v.id('teams'),
        afterDate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let query = ctx.db
            .query('games')
            .withIndex('by_team_date', q => {
                let indexed = q.eq('homeTeamId', args.teamId);
                if (args.afterDate) {
                    indexed = indexed.gt('startTime', args.afterDate);
                }
                return indexed;
            });
        return await query.collect();
    },
});
```

---

## Filtering

### Basic Filter

```typescript
export const getHighScoringGames = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query('games')
            .filter(q =>
                q.gt(q.add(q.field('homeScore'), q.field('awayScore')), 10)
            )
            .collect();
    },
});
```

### Multiple Conditions

```typescript
export const getCloseGames = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query('games')
            .filter(q =>
                q.and(
                    q.eq(q.field('status'), 'final'),
                    q.lte(
                        q.abs(q.sub(q.field('homeScore'), q.field('awayScore'))),
                        2
                    )
                )
            )
            .collect();
    },
});
```

### Filter Operators

```typescript
q.eq(field, value)     // Equals
q.neq(field, value)    // Not equals
q.gt(field, value)     // Greater than
q.gte(field, value)    // Greater than or equal
q.lt(field, value)     // Less than
q.lte(field, value)    // Less than or equal

// Logical operators
q.and(...conditions)   // All must be true
q.or(...conditions)    // Any must be true
q.not(condition)       // Inverse

// Math operators
q.add(a, b)            // Addition
q.sub(a, b)            // Subtraction
q.mul(a, b)            // Multiplication
q.div(a, b)            // Division
q.mod(a, b)            // Modulo
q.abs(value)           // Absolute value
```

---

## Ordering

### Basic Order

```typescript
export const getRecentGames = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query('games')
            .withIndex('by_date')
            .order('desc')  // Most recent first
            .take(20);
    },
});
```

### Order by Index Field

```typescript
// Index defines sort order
// .index('by_team_date', ['teamId', 'startTime'])
export const getTeamSchedule = query({
    args: { teamId: v.id('teams') },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('games')
            .withIndex('by_team_date', q => q.eq('homeTeamId', args.teamId))
            .order('asc')  // Earliest first
            .collect();
    },
});
```

---

## Limiting Results

### Take N Results

```typescript
export const getTopScorers = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('players')
            .withIndex('by_home_runs')
            .order('desc')
            .take(args.limit ?? 10);
    },
});
```

### First Result

```typescript
export const getCurrentGame = query({
    args: { teamId: v.id('teams') },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('games')
            .withIndex('by_status', q => q.eq('status', 'live'))
            .filter(q =>
                q.or(
                    q.eq(q.field('homeTeamId'), args.teamId),
                    q.eq(q.field('awayTeamId'), args.teamId)
                )
            )
            .first();
    },
});
```

### Unique Result

```typescript
export const getByExternalId = query({
    args: { externalId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('games')
            .withIndex('by_external_id', q => q.eq('externalId', args.externalId))
            .unique(); // Throws if more than one
    },
});
```

---

## Pagination

### Basic Pagination

```typescript
import { paginationOptsValidator } from 'convex/server';

export const listGames = query({
    args: { paginationOpts: paginationOptsValidator },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('games')
            .withIndex('by_date')
            .order('desc')
            .paginate(args.paginationOpts);
    },
});
```

### Using in React

```typescript
import { usePaginatedQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

function GameList() {
    const { results, status, loadMore } = usePaginatedQuery(
        api.games.listGames,
        {},
        { initialNumItems: 20 }
    );

    return (
        <div>
            {results.map(game => <GameCard key={game._id} game={game} />)}
            {status === 'CanLoadMore' && (
                <button onClick={() => loadMore(20)}>Load More</button>
            )}
        </div>
    );
}
```

---

## Joins (Related Data)

### One-to-One Join

```typescript
export const getGameWithTeams = query({
    args: { gameId: v.id('games') },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (!game) return null;

        const homeTeam = await ctx.db.get(game.homeTeamId);
        const awayTeam = await ctx.db.get(game.awayTeamId);

        return { ...game, homeTeam, awayTeam };
    },
});
```

### One-to-Many Join

```typescript
export const getTeamWithPlayers = query({
    args: { teamId: v.id('teams') },
    handler: async (ctx, args) => {
        const team = await ctx.db.get(args.teamId);
        if (!team) return null;

        const players = await ctx.db
            .query('players')
            .withIndex('by_team', q => q.eq('teamId', args.teamId))
            .collect();

        return { ...team, players };
    },
});
```

### Batch Joins

```typescript
export const getLiveGamesWithTeams = query({
    args: {},
    handler: async (ctx) => {
        const games = await ctx.db
            .query('games')
            .withIndex('by_status', q => q.eq('status', 'live'))
            .collect();

        // Batch fetch all teams
        const teamIds = new Set<Id<'teams'>>();
        games.forEach(g => {
            teamIds.add(g.homeTeamId);
            teamIds.add(g.awayTeamId);
        });

        const teams = await Promise.all(
            Array.from(teamIds).map(id => ctx.db.get(id))
        );
        const teamMap = new Map(teams.filter(Boolean).map(t => [t!._id, t]));

        return games.map(game => ({
            ...game,
            homeTeam: teamMap.get(game.homeTeamId),
            awayTeam: teamMap.get(game.awayTeamId),
        }));
    },
});
```

---

## Query Helpers

### Reusable Query Logic

```typescript
// convex/lib/helpers.ts
import { QueryCtx } from './_generated/server';
import { Id } from './_generated/dataModel';

export async function getTeamWithRecord(ctx: QueryCtx, teamId: Id<'teams'>) {
    const team = await ctx.db.get(teamId);
    if (!team) return null;

    const winPct = team.wins / (team.wins + team.losses);
    return { ...team, winPct };
}

// Use in queries
export const getGame = query({
    args: { gameId: v.id('games') },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (!game) return null;

        return {
            ...game,
            homeTeam: await getTeamWithRecord(ctx, game.homeTeamId),
            awayTeam: await getTeamWithRecord(ctx, game.awayTeamId),
        };
    },
});
```

---

## Best Practices

1. **Use indexes for filtering** - Always prefer `withIndex` over `filter`
2. **Limit results** - Use `take()` or `paginate()` for large tables
3. **Batch related queries** - Fetch related data in parallel
4. **Cache team lookups** - Use Map for repeated lookups
5. **Order matters** - Query → Index → Filter → Order → Limit
