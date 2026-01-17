# Mutations and Transactions

## Mutation Basics

### Insert Document

```typescript
import { mutation } from './_generated/server';
import { v } from 'convex/values';

export const createGame = mutation({
    args: {
        homeTeamId: v.id('teams'),
        awayTeamId: v.id('teams'),
        startTime: v.number(),
        venue: v.string(),
    },
    handler: async (ctx, args) => {
        const gameId = await ctx.db.insert('games', {
            homeTeamId: args.homeTeamId,
            awayTeamId: args.awayTeamId,
            homeScore: 0,
            awayScore: 0,
            inning: 0,
            inningHalf: 'top',
            outs: 0,
            status: 'scheduled',
            startTime: args.startTime,
            venue: args.venue,
        });
        return gameId;
    },
});
```

### Patch Document (Partial Update)

```typescript
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

### Replace Document (Full Update)

```typescript
export const replaceTeam = mutation({
    args: {
        teamId: v.id('teams'),
        team: v.object({
            name: v.string(),
            city: v.string(),
            abbreviation: v.string(),
            league: v.union(v.literal('AL'), v.literal('NL')),
            division: v.string(),
            wins: v.number(),
            losses: v.number(),
        }),
    },
    handler: async (ctx, args) => {
        await ctx.db.replace(args.teamId, args.team);
    },
});
```

### Delete Document

```typescript
export const deleteGame = mutation({
    args: { gameId: v.id('games') },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.gameId);
    },
});
```

---

## Validation Patterns

### Check Existence

```typescript
export const startGame = mutation({
    args: { gameId: v.id('games') },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (!game) {
            throw new Error('Game not found');
        }
        if (game.status !== 'scheduled') {
            throw new Error('Game already started or finished');
        }

        await ctx.db.patch(args.gameId, {
            status: 'live',
            inning: 1,
            inningHalf: 'top',
        });
    },
});
```

### Validate References

```typescript
export const createPlayer = mutation({
    args: {
        teamId: v.id('teams'),
        name: v.string(),
        number: v.number(),
        position: v.string(),
    },
    handler: async (ctx, args) => {
        // Verify team exists
        const team = await ctx.db.get(args.teamId);
        if (!team) {
            throw new Error('Team not found');
        }

        // Check for duplicate number
        const existing = await ctx.db
            .query('players')
            .withIndex('by_team', q => q.eq('teamId', args.teamId))
            .filter(q => q.eq(q.field('number'), args.number))
            .first();

        if (existing) {
            throw new Error(`Number ${args.number} is already taken`);
        }

        return await ctx.db.insert('players', {
            teamId: args.teamId,
            name: args.name,
            number: args.number,
            position: args.position,
            isActive: true,
        });
    },
});
```

### Business Logic Validation

```typescript
export const recordPlay = mutation({
    args: {
        gameId: v.id('games'),
        batterId: v.id('players'),
        pitcherId: v.id('players'),
        result: v.string(),
        rbiCount: v.number(),
    },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (!game) throw new Error('Game not found');
        if (game.status !== 'live') throw new Error('Game is not live');

        // Verify players exist
        const [batter, pitcher] = await Promise.all([
            ctx.db.get(args.batterId),
            ctx.db.get(args.pitcherId),
        ]);
        if (!batter) throw new Error('Batter not found');
        if (!pitcher) throw new Error('Pitcher not found');

        // Record the play
        const playNumber = await ctx.db
            .query('plays')
            .withIndex('by_game', q => q.eq('gameId', args.gameId))
            .collect()
            .then(plays => plays.length + 1);

        await ctx.db.insert('plays', {
            gameId: args.gameId,
            inning: game.inning,
            inningHalf: game.inningHalf,
            playNumber,
            batterId: args.batterId,
            pitcherId: args.pitcherId,
            result: args.result,
            rbiCount: args.rbiCount,
            description: `${batter.name}: ${args.result}`,
            timestamp: Date.now(),
        });

        // Update score if RBIs
        if (args.rbiCount > 0) {
            if (game.inningHalf === 'top') {
                await ctx.db.patch(args.gameId, {
                    awayScore: game.awayScore + args.rbiCount,
                });
            } else {
                await ctx.db.patch(args.gameId, {
                    homeScore: game.homeScore + args.rbiCount,
                });
            }
        }
    },
});
```

---

## Transactional Guarantees

### All-or-Nothing

```typescript
export const tradePlayer = mutation({
    args: {
        playerId: v.id('players'),
        newTeamId: v.id('teams'),
    },
    handler: async (ctx, args) => {
        // All of these succeed or none do
        const player = await ctx.db.get(args.playerId);
        if (!player) throw new Error('Player not found');

        const oldTeam = await ctx.db.get(player.teamId);
        const newTeam = await ctx.db.get(args.newTeamId);
        if (!newTeam) throw new Error('New team not found');

        // Update player's team
        await ctx.db.patch(args.playerId, {
            teamId: args.newTeamId,
        });

        // Create trade record
        await ctx.db.insert('trades', {
            playerId: args.playerId,
            fromTeamId: player.teamId,
            toTeamId: args.newTeamId,
            tradeDate: Date.now(),
        });

        // If any operation fails, everything is rolled back
    },
});
```

### Consistent Reads

```typescript
export const updateStandings = mutation({
    args: {},
    handler: async (ctx) => {
        // All reads see the same consistent snapshot
        const teams = await ctx.db.query('teams').collect();

        // Calculate standings
        const alEast = teams.filter(t => t.league === 'AL' && t.division === 'East');
        const sorted = alEast.sort((a, b) =>
            b.wins / (b.wins + b.losses) - a.wins / (a.wins + a.losses)
        );

        // Update games back
        const leader = sorted[0];
        const leaderWinPct = leader.wins / (leader.wins + leader.losses);

        for (const team of sorted) {
            const gamesBack = calculateGamesBack(team, leader);
            await ctx.db.patch(team._id, { gamesBack });
        }
    },
});
```

---

## Upsert Pattern

```typescript
export const upsertGame = mutation({
    args: {
        externalId: v.string(),
        homeTeamId: v.id('teams'),
        awayTeamId: v.id('teams'),
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
            return existing._id;
        } else {
            return await ctx.db.insert('games', {
                externalId: args.externalId,
                homeTeamId: args.homeTeamId,
                awayTeamId: args.awayTeamId,
                homeScore: args.homeScore,
                awayScore: args.awayScore,
                inning: 0,
                inningHalf: 'top',
                outs: 0,
                status: args.status,
                startTime: Date.now(),
                venue: 'TBD',
            });
        }
    },
});
```

---

## Batch Operations

### Bulk Insert

```typescript
export const importPlayers = mutation({
    args: {
        players: v.array(v.object({
            teamId: v.id('teams'),
            name: v.string(),
            number: v.number(),
            position: v.string(),
        })),
    },
    handler: async (ctx, args) => {
        const ids = [];
        for (const player of args.players) {
            const id = await ctx.db.insert('players', {
                ...player,
                isActive: true,
            });
            ids.push(id);
        }
        return ids;
    },
});
```

### Bulk Update

```typescript
export const resetSeasonStats = mutation({
    args: {},
    handler: async (ctx) => {
        const teams = await ctx.db.query('teams').collect();

        for (const team of teams) {
            await ctx.db.patch(team._id, {
                wins: 0,
                losses: 0,
                gamesBack: 0,
                streak: 'W0',
            });
        }

        return { teamsReset: teams.length };
    },
});
```

---

## Internal Mutations

Called only from other Convex functions (not clients).

```typescript
import { internalMutation } from './_generated/server';

export const updateFromExternalApi = internalMutation({
    args: {
        externalId: v.string(),
        homeScore: v.number(),
        awayScore: v.number(),
    },
    handler: async (ctx, args) => {
        const game = await ctx.db
            .query('games')
            .withIndex('by_external_id', q => q.eq('externalId', args.externalId))
            .first();

        if (game) {
            await ctx.db.patch(game._id, {
                homeScore: args.homeScore,
                awayScore: args.awayScore,
            });
        }
    },
});
```

---

## React Integration

### Basic Usage

```typescript
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

function ScoreButton({ gameId }: { gameId: Id<'games'> }) {
    const updateScore = useMutation(api.games.updateScore);

    const handleClick = async () => {
        await updateScore({
            gameId,
            homeScore: 5,
            awayScore: 3,
        });
        // UI updates automatically via subscriptions!
    };

    return <button onClick={handleClick}>Update Score</button>;
}
```

### With Loading State

```typescript
function CreateGameForm() {
    const createGame = useMutation(api.games.create);
    const [isPending, setIsPending] = useState(false);

    const handleSubmit = async (data: GameData) => {
        setIsPending(true);
        try {
            const gameId = await createGame(data);
            console.log('Created game:', gameId);
        } catch (error) {
            console.error('Failed:', error);
        } finally {
            setIsPending(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* form fields */}
            <button disabled={isPending}>
                {isPending ? 'Creating...' : 'Create Game'}
            </button>
        </form>
    );
}
```

### Optimistic Updates

```typescript
import { useMutation, useOptimisticUpdate } from 'convex/react';

function LikeButton({ gameId, likes }: { gameId: Id<'games'>; likes: number }) {
    const addLike = useMutation(api.games.addLike);

    // Optimistic: Update UI immediately
    const handleLike = async () => {
        await addLike({ gameId });
    };

    return (
        <button onClick={handleLike}>
            {likes} Likes
        </button>
    );
}
```

---

## Best Practices

1. **Validate early** - Check existence before updates
2. **Use typed validators** - Catch errors at compile time
3. **Keep mutations focused** - One logical operation per mutation
4. **Return useful data** - IDs, updated counts, etc.
5. **Handle errors** - Throw descriptive errors
6. **Use internal mutations** - For action-called logic
