# Indexes and Performance

## Index Fundamentals

### What Indexes Do

- **Speed up queries** - O(log n) instead of O(n)
- **Define sort order** - Results come pre-sorted
- **Enable range queries** - Greater than, less than, between

### Defining Indexes

```typescript
defineTable({
    teamId: v.id('teams'),
    startTime: v.number(),
    status: v.string(),
})
    .index('by_team', ['teamId'])
    .index('by_status', ['status'])
    .index('by_team_date', ['teamId', 'startTime'])
    .index('by_date', ['startTime'])
```

---

## Index Design Patterns

### Single Field Index

```typescript
// For filtering by one field
.index('by_status', ['status'])

// Query
await ctx.db
    .query('games')
    .withIndex('by_status', q => q.eq('status', 'live'))
    .collect();
```

### Compound Index

```typescript
// For filtering by multiple fields
.index('by_team_date', ['teamId', 'startTime'])

// Query: team + date range
await ctx.db
    .query('games')
    .withIndex('by_team_date', q =>
        q.eq('teamId', teamId)
         .gt('startTime', startOfWeek)
    )
    .collect();
```

### Ordering Index

```typescript
// For sorted results
.index('by_wins', ['wins'])

// Query: top teams by wins
await ctx.db
    .query('teams')
    .withIndex('by_wins')
    .order('desc')
    .take(10);
```

### Compound Ordering

```typescript
// Sort by league, then by wins within league
.index('by_league_wins', ['league', 'wins'])

// Query: top AL teams
await ctx.db
    .query('teams')
    .withIndex('by_league_wins', q => q.eq('league', 'AL'))
    .order('desc')
    .take(5);
```

---

## Index Range Expressions

### Equality

```typescript
.withIndex('by_status', q => q.eq('status', 'live'))
```

### Range (Greater/Less Than)

```typescript
.withIndex('by_date', q =>
    q.gt('startTime', yesterday)
     .lt('startTime', tomorrow)
)
```

### Combined

```typescript
// Must follow field order!
.withIndex('by_team_date', q =>
    q.eq('teamId', teamId)      // First: equality
     .gte('startTime', start)   // Then: range
     .lte('startTime', end)
)
```

### Rules

1. **Equality first** - All `.eq()` before ranges
2. **Field order matters** - Follow index field order
3. **One range max** - Only one gt/lt/gte/lte chain
4. **Can't skip fields** - Must use fields in order

```typescript
// Index: ['teamId', 'status', 'startTime']

// Good
q.eq('teamId', id).eq('status', 'live').gt('startTime', date)

// Bad - skips 'status'
q.eq('teamId', id).gt('startTime', date)

// Bad - range before equality
q.gt('startTime', date).eq('status', 'live')
```

---

## Query Optimization

### Use Indexes Over Filters

```typescript
// Fast: Uses index
await ctx.db
    .query('games')
    .withIndex('by_status', q => q.eq('status', 'live'))
    .collect();

// Slow: Scans all documents
await ctx.db
    .query('games')
    .filter(q => q.eq(q.field('status'), 'live'))
    .collect();
```

### Combine Index + Filter

```typescript
// Index narrows down, filter refines
await ctx.db
    .query('games')
    .withIndex('by_status', q => q.eq('status', 'live'))
    .filter(q => q.gt(q.field('homeScore'), 5))
    .collect();
```

### Limit Results

```typescript
// Good: Stops after finding 10
await ctx.db
    .query('games')
    .withIndex('by_date')
    .order('desc')
    .take(10);

// Bad: Loads all then slices
const all = await ctx.db.query('games').collect();
return all.slice(0, 10);
```

### Pagination for Large Sets

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

---

## Common Index Patterns

### Status + Time (Live Dashboard)

```typescript
.index('by_status_time', ['status', 'startTime'])

// Get live games sorted by start time
await ctx.db
    .query('games')
    .withIndex('by_status_time', q => q.eq('status', 'live'))
    .order('asc')
    .collect();
```

### Foreign Key + Time (Team Schedule)

```typescript
.index('by_team_date', ['teamId', 'startTime'])

// Get team's upcoming games
await ctx.db
    .query('games')
    .withIndex('by_team_date', q =>
        q.eq('teamId', teamId)
         .gte('startTime', Date.now())
    )
    .take(10);
```

### Unique Lookup

```typescript
.index('by_external_id', ['externalId'])

// Find by external ID (expect one result)
await ctx.db
    .query('games')
    .withIndex('by_external_id', q => q.eq('externalId', '12345'))
    .unique();
```

### Composite Key

```typescript
// Game between two specific teams on a date
.index('by_matchup', ['homeTeamId', 'awayTeamId', 'startTime'])

await ctx.db
    .query('games')
    .withIndex('by_matchup', q =>
        q.eq('homeTeamId', home)
         .eq('awayTeamId', away)
         .gte('startTime', startOfDay)
         .lt('startTime', endOfDay)
    )
    .first();
```

---

## Performance Tips

### 1. Design Indexes for Queries

```typescript
// If you query by team + status + date...
.index('by_team_status_date', ['teamId', 'status', 'startTime'])

// Not three separate indexes
.index('by_team', ['teamId'])
.index('by_status', ['status'])
.index('by_date', ['startTime'])
```

### 2. Avoid Full Table Scans

```typescript
// Always use .take(), .first(), .unique(), or .paginate()
// for large tables without restrictive index queries

// Bad
await ctx.db.query('plays').collect(); // Could be millions

// Good
await ctx.db
    .query('plays')
    .withIndex('by_game', q => q.eq('gameId', gameId))
    .collect(); // Bounded by game
```

### 3. Batch Related Lookups

```typescript
// Bad: N+1 queries
const games = await ctx.db.query('games').take(50);
for (const game of games) {
    game.homeTeam = await ctx.db.get(game.homeTeamId); // 50 queries!
}

// Good: Batch lookups
const games = await ctx.db.query('games').take(50);
const teamIds = new Set([...games.map(g => g.homeTeamId), ...games.map(g => g.awayTeamId)]);
const teams = await Promise.all([...teamIds].map(id => ctx.db.get(id)));
const teamMap = new Map(teams.filter(Boolean).map(t => [t!._id, t]));
```

### 4. Cache Computed Values

```typescript
// Store precomputed values for expensive calculations
teams: defineTable({
    wins: v.number(),
    losses: v.number(),
    winPct: v.number(), // Precomputed: wins / (wins + losses)
    gamesBack: v.number(), // Precomputed from standings
})

// Update on game completion
await ctx.db.patch(teamId, {
    wins: team.wins + 1,
    winPct: (team.wins + 1) / (team.wins + 1 + team.losses),
});
```

### 5. Use Appropriate Data Types

```typescript
// Good: Numbers for time (indexable, comparable)
startTime: v.number(), // Unix timestamp in ms

// Avoid: Strings for dates (bad for range queries)
startTime: v.string(), // "2024-01-15T19:00:00Z"
```

---

## Index Limits

- **16 fields** per index
- **32 indexes** per table
- `_creationTime` auto-included (counts toward limit)
- `by_id` and `by_creation_time` are reserved

---

## Staged Indexes

For large tables, backfill indexes asynchronously.

```typescript
// Step 1: Add staged index
.index('by_new_field', { fields: ['newField'], staged: true })

// Step 2: Deploy and wait for backfill
// Check dashboard for completion

// Step 3: Remove staged flag
.index('by_new_field', ['newField'])
```

---

## Debugging Queries

### Check Query Performance

```typescript
export const debugQuery = query({
    args: { teamId: v.id('teams') },
    handler: async (ctx, args) => {
        const start = Date.now();

        const games = await ctx.db
            .query('games')
            .withIndex('by_team', q => q.eq('homeTeamId', args.teamId))
            .collect();

        const duration = Date.now() - start;
        console.log(`Query took ${duration}ms, returned ${games.length} results`);

        return games;
    },
});
```

### Convex Dashboard

- View query execution logs
- Check function timing
- Monitor database size
- See index usage
