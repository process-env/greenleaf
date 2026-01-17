# Schema Design

## Validators Reference

### Primitive Types

```typescript
import { v } from 'convex/values';

v.string()      // String values
v.number()      // Numbers (integers and floats)
v.boolean()     // true or false
v.null()        // Explicit null
v.int64()       // 64-bit integers
v.float64()     // 64-bit floats
v.bytes()       // Binary data (ArrayBuffer)
```

### Document References

```typescript
v.id('tableName')  // Reference to another document

// Example
defineTable({
    teamId: v.id('teams'),        // References teams table
    playerId: v.id('players'),    // References players table
})
```

### Complex Types

```typescript
// Objects
v.object({
    name: v.string(),
    age: v.number(),
})

// Arrays
v.array(v.string())              // Array of strings
v.array(v.id('players'))         // Array of player IDs
v.array(v.object({ ... }))       // Array of objects

// Union types (either/or)
v.union(v.literal('AL'), v.literal('NL'))
v.union(v.string(), v.null())    // String or null

// Literals (exact values)
v.literal('active')
v.literal(42)
v.literal(true)

// Optional (field may be missing)
v.optional(v.string())
v.optional(v.number())

// Any value (avoid if possible)
v.any()

// Record (key-value map)
v.record(v.string(), v.number())  // { [key: string]: number }
```

---

## MLB Database Schema Example

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
    // Teams table
    teams: defineTable({
        name: v.string(),
        city: v.string(),
        abbreviation: v.string(),
        league: v.union(v.literal('AL'), v.literal('NL')),
        division: v.union(
            v.literal('East'),
            v.literal('Central'),
            v.literal('West')
        ),
        wins: v.number(),
        losses: v.number(),
        gamesBack: v.number(),
        streak: v.string(),
        lastTen: v.string(),
        logoUrl: v.optional(v.string()),
        primaryColor: v.optional(v.string()),
        stadium: v.object({
            name: v.string(),
            city: v.string(),
            capacity: v.number(),
        }),
    })
        .index('by_league', ['league'])
        .index('by_division', ['league', 'division'])
        .index('by_abbreviation', ['abbreviation']),

    // Players table
    players: defineTable({
        teamId: v.id('teams'),
        externalId: v.string(),
        firstName: v.string(),
        lastName: v.string(),
        number: v.number(),
        position: v.union(
            v.literal('P'),
            v.literal('C'),
            v.literal('1B'),
            v.literal('2B'),
            v.literal('3B'),
            v.literal('SS'),
            v.literal('LF'),
            v.literal('CF'),
            v.literal('RF'),
            v.literal('DH')
        ),
        bats: v.union(v.literal('L'), v.literal('R'), v.literal('S')),
        throws: v.union(v.literal('L'), v.literal('R')),
        isActive: v.boolean(),
        isAllStar: v.boolean(),
        stats: v.optional(v.object({
            gamesPlayed: v.number(),
            atBats: v.optional(v.number()),
            hits: v.optional(v.number()),
            homeRuns: v.optional(v.number()),
            rbi: v.optional(v.number()),
            battingAverage: v.optional(v.number()),
            inningsPitched: v.optional(v.number()),
            wins: v.optional(v.number()),
            losses: v.optional(v.number()),
            era: v.optional(v.number()),
            strikeouts: v.optional(v.number()),
        })),
    })
        .index('by_team', ['teamId'])
        .index('by_position', ['position'])
        .index('by_external_id', ['externalId']),

    // Games table
    games: defineTable({
        externalId: v.string(),
        homeTeamId: v.id('teams'),
        awayTeamId: v.id('teams'),
        homeScore: v.number(),
        awayScore: v.number(),
        inning: v.number(),
        inningHalf: v.union(v.literal('top'), v.literal('bottom')),
        outs: v.number(),
        status: v.union(
            v.literal('scheduled'),
            v.literal('warmup'),
            v.literal('live'),
            v.literal('delayed'),
            v.literal('final')
        ),
        startTime: v.number(),
        venue: v.string(),
        attendance: v.optional(v.number()),
        weather: v.optional(v.object({
            temp: v.number(),
            condition: v.string(),
        })),
        winningPitcherId: v.optional(v.id('players')),
        losingPitcherId: v.optional(v.id('players')),
        savePitcherId: v.optional(v.id('players')),
    })
        .index('by_external_id', ['externalId'])
        .index('by_status', ['status'])
        .index('by_home_team', ['homeTeamId', 'startTime'])
        .index('by_away_team', ['awayTeamId', 'startTime'])
        .index('by_date', ['startTime']),

    // Play-by-play events
    plays: defineTable({
        gameId: v.id('games'),
        inning: v.number(),
        inningHalf: v.union(v.literal('top'), v.literal('bottom')),
        playNumber: v.number(),
        batterId: v.id('players'),
        pitcherId: v.id('players'),
        result: v.string(),
        description: v.string(),
        rbiCount: v.number(),
        timestamp: v.number(),
    })
        .index('by_game', ['gameId', 'playNumber'])
        .index('by_batter', ['batterId'])
        .index('by_pitcher', ['pitcherId']),
});
```

---

## Relationships

### One-to-Many

```typescript
// Team has many players
players: defineTable({
    teamId: v.id('teams'),  // Foreign key
    name: v.string(),
})

// Query players for a team
const players = await ctx.db
    .query('players')
    .withIndex('by_team', q => q.eq('teamId', teamId))
    .collect();
```

### Many-to-Many

```typescript
// Player can be on roster for multiple games
gameRosters: defineTable({
    gameId: v.id('games'),
    playerId: v.id('players'),
    battingOrder: v.optional(v.number()),
    isStarting: v.boolean(),
})
    .index('by_game', ['gameId'])
    .index('by_player', ['playerId'])
```

### Self-Referential

```typescript
// Game between two teams (both reference teams)
games: defineTable({
    homeTeamId: v.id('teams'),
    awayTeamId: v.id('teams'),
})
```

---

## Optional vs Required Fields

```typescript
// Required: Must always be present
name: v.string(),

// Optional: May be missing (undefined)
nickname: v.optional(v.string()),

// Nullable: Must be present, but can be null
retiredNumber: v.union(v.number(), v.null()),
```

### Working with Optional Fields

```typescript
// In mutations
await ctx.db.insert('players', {
    name: 'John Doe',      // Required
    // nickname omitted    // Optional - OK
});

// In queries
const player = await ctx.db.get(playerId);
if (player?.nickname) {
    // Use nickname
}
```

---

## Nested Objects

```typescript
players: defineTable({
    name: v.string(),
    stats: v.object({
        batting: v.object({
            average: v.number(),
            homeRuns: v.number(),
            rbi: v.number(),
        }),
        fielding: v.object({
            putouts: v.number(),
            assists: v.number(),
            errors: v.number(),
        }),
    }),
})

// Access nested fields in queries
.filter(q => q.gt(q.field('stats.batting.homeRuns'), 20))
```

---

## Schema Evolution

### Adding Fields

```typescript
// Safe: Add optional field
players: defineTable({
    name: v.string(),
    nickname: v.optional(v.string()),  // New optional field
})
```

### Making Fields Optional

```typescript
// Before
position: v.string(),

// After (safe)
position: v.optional(v.string()),
```

### Adding Required Fields

```typescript
// Step 1: Add as optional with default
status: v.optional(v.string()),

// Step 2: Backfill existing documents
// (run a migration mutation)

// Step 3: Change to required
status: v.string(),
```

### Removing Fields

```typescript
// Step 1: Make optional
oldField: v.optional(v.string()),

// Step 2: Remove from code usage

// Step 3: Remove from schema
// (Convex ignores extra fields in documents)
```

---

## Best Practices

1. **Use specific types** - Prefer unions over strings for enums
2. **Add indexes early** - Easier than adding later
3. **Keep documents small** - Avoid embedding large arrays
4. **Use references** - Instead of duplicating data
5. **Plan for evolution** - Start with optional fields if unsure
6. **Document relationships** - Use consistent naming (e.g., `teamId`)
