# Actions and Scheduling

## Actions Overview

Actions can call external APIs but cannot directly access the database.

### Basic Action

```typescript
// convex/actions/mlbApi.ts
import { action } from '../_generated/server';
import { v } from 'convex/values';

export const fetchLiveScores = action({
    args: {},
    handler: async (ctx) => {
        const response = await fetch(
            'https://statsapi.mlb.com/api/v1/schedule/games/?sportId=1'
        );
        const data = await response.json();
        return data;
    },
});
```

### Action with Database Access

```typescript
import { action, internalMutation } from '../_generated/server';
import { internal } from '../_generated/api';

export const syncLiveScores = action({
    args: {},
    handler: async (ctx) => {
        // Fetch from external API
        const response = await fetch(
            'https://statsapi.mlb.com/api/v1/schedule/games/?sportId=1'
        );
        const data = await response.json();

        // Update database via internal mutation
        const games = data.dates?.[0]?.games ?? [];

        for (const game of games) {
            await ctx.runMutation(internal.games.upsertFromApi, {
                externalId: game.gamePk.toString(),
                homeScore: game.teams.home.score ?? 0,
                awayScore: game.teams.away.score ?? 0,
                status: mapStatus(game.status.abstractGameState),
                inning: game.linescore?.currentInning ?? 0,
            });
        }

        return { synced: games.length };
    },
});

function mapStatus(apiStatus: string): string {
    switch (apiStatus) {
        case 'Live': return 'live';
        case 'Final': return 'final';
        case 'Preview': return 'scheduled';
        default: return 'scheduled';
    }
}
```

### Reading Data in Actions

```typescript
export const enrichAndPost = action({
    args: { gameId: v.id('games') },
    handler: async (ctx, args) => {
        // Read from database via internal query
        const game = await ctx.runQuery(internal.games.getWithTeams, {
            gameId: args.gameId,
        });

        if (!game) throw new Error('Game not found');

        // Post to external service
        await fetch('https://api.twitter.com/2/tweets', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.TWITTER_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: `${game.awayTeam.name} ${game.awayScore} - ${game.homeTeam.name} ${game.homeScore}`,
            }),
        });

        return { posted: true };
    },
});
```

---

## Internal Functions

Only callable from other Convex functions.

### Internal Query

```typescript
import { internalQuery } from './_generated/server';

export const getWithTeams = internalQuery({
    args: { gameId: v.id('games') },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (!game) return null;

        const [homeTeam, awayTeam] = await Promise.all([
            ctx.db.get(game.homeTeamId),
            ctx.db.get(game.awayTeamId),
        ]);

        return { ...game, homeTeam, awayTeam };
    },
});
```

### Internal Mutation

```typescript
import { internalMutation } from './_generated/server';

export const upsertFromApi = internalMutation({
    args: {
        externalId: v.string(),
        homeScore: v.number(),
        awayScore: v.number(),
        status: v.string(),
        inning: v.number(),
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
                inning: args.inning,
            });
            return existing._id;
        }
        // Don't create - only update existing games
        return null;
    },
});
```

### Internal Action

```typescript
import { internalAction } from './_generated/server';

export const sendSlackNotification = internalAction({
    args: {
        message: v.string(),
        channel: v.string(),
    },
    handler: async (ctx, args) => {
        await fetch(process.env.SLACK_WEBHOOK_URL!, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                channel: args.channel,
                text: args.message,
            }),
        });
    },
});
```

---

## Cron Jobs

### Setup

```typescript
// convex/crons.ts
import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Every 30 seconds
crons.interval(
    'sync-live-scores',
    { seconds: 30 },
    internal.actions.mlbApi.syncLiveScores
);

// Every minute
crons.interval(
    'update-standings',
    { minutes: 1 },
    internal.teams.recalculateStandings
);

// Daily at 6 AM UTC
crons.daily(
    'morning-recap',
    { hourUTC: 6, minuteUTC: 0 },
    internal.actions.notifications.sendDailyRecap
);

// Weekly on Monday at midnight UTC
crons.weekly(
    'weekly-cleanup',
    { dayOfWeek: 'monday', hourUTC: 0, minuteUTC: 0 },
    internal.games.archiveOldGames
);

// Monthly on the 1st at midnight UTC
crons.monthly(
    'monthly-stats',
    { day: 1, hourUTC: 0, minuteUTC: 0 },
    internal.stats.generateMonthlyReport
);

// Cron expression (every 5 minutes)
crons.cron(
    'frequent-check',
    '*/5 * * * *',
    internal.health.checkSystems
);

export default crons;
```

### Cron with Arguments

```typescript
// Crons can't take dynamic arguments
// Use the mutation/action to determine what to do

export const syncAllTeams = internalAction({
    args: {},
    handler: async (ctx) => {
        const teams = await ctx.runQuery(internal.teams.getAllIds);

        for (const teamId of teams) {
            await ctx.runMutation(internal.teams.syncStats, { teamId });
        }
    },
});
```

---

## Scheduled Functions

Schedule functions to run at a future time.

### Schedule After Delay

```typescript
export const startGame = mutation({
    args: { gameId: v.id('games') },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.gameId, { status: 'live' });

        // Schedule game end check in 4 hours
        await ctx.scheduler.runAfter(
            4 * 60 * 60 * 1000, // milliseconds
            internal.games.checkGameEnd,
            { gameId: args.gameId }
        );
    },
});
```

### Schedule At Specific Time

```typescript
export const scheduleGame = mutation({
    args: {
        gameId: v.id('games'),
        startTime: v.number(), // Unix timestamp
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.gameId, {
            startTime: args.startTime,
            status: 'scheduled',
        });

        // Schedule game start
        await ctx.scheduler.runAt(
            args.startTime,
            internal.games.autoStartGame,
            { gameId: args.gameId }
        );
    },
});
```

### Cancel Scheduled Function

```typescript
export const cancelScheduledStart = mutation({
    args: { scheduledId: v.id('_scheduled_functions') },
    handler: async (ctx, args) => {
        await ctx.scheduler.cancel(args.scheduledId);
    },
});
```

### Query Scheduled Functions

```typescript
export const getPendingScheduled = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.system
            .query('_scheduled_functions')
            .filter(q => q.eq(q.field('state.kind'), 'pending'))
            .collect();
    },
});
```

---

## Action Best Practices

### Retry Logic

```typescript
export const fetchWithRetry = action({
    args: { url: v.string() },
    handler: async (ctx, args) => {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const response = await fetch(args.url);
                if (response.ok) {
                    return await response.json();
                }
                throw new Error(`HTTP ${response.status}`);
            } catch (error) {
                lastError = error as Error;
                // Exponential backoff
                await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
            }
        }

        throw lastError;
    },
});
```

### Rate Limiting External Calls

```typescript
export const batchSync = action({
    args: { teamIds: v.array(v.id('teams')) },
    handler: async (ctx, args) => {
        const results = [];

        for (const teamId of args.teamIds) {
            // Rate limit: 1 request per second
            await new Promise(r => setTimeout(r, 1000));

            const data = await fetchTeamData(teamId);
            await ctx.runMutation(internal.teams.updateFromApi, {
                teamId,
                data,
            });
            results.push({ teamId, success: true });
        }

        return results;
    },
});
```

### Error Handling

```typescript
export const safeSyncScores = action({
    args: {},
    handler: async (ctx) => {
        try {
            const response = await fetch(MLB_API_URL);

            if (!response.ok) {
                // Log but don't throw - cron should continue
                console.error(`MLB API error: ${response.status}`);
                return { error: `HTTP ${response.status}`, synced: 0 };
            }

            const data = await response.json();
            let synced = 0;

            for (const game of data.dates?.[0]?.games ?? []) {
                try {
                    await ctx.runMutation(internal.games.upsertFromApi, {
                        externalId: game.gamePk.toString(),
                        homeScore: game.teams.home.score ?? 0,
                        awayScore: game.teams.away.score ?? 0,
                        status: mapStatus(game.status.abstractGameState),
                    });
                    synced++;
                } catch (error) {
                    console.error(`Failed to sync game ${game.gamePk}:`, error);
                }
            }

            return { synced };
        } catch (error) {
            console.error('Sync failed:', error);
            return { error: String(error), synced: 0 };
        }
    },
});
```

---

## Node.js Runtime

For NPM packages that need Node.js APIs.

```typescript
// convex/actions/nodeAction.ts
'use node';

import { action } from '../_generated/server';
import nodemailer from 'nodemailer';

export const sendEmail = action({
    args: {
        to: v.string(),
        subject: v.string(),
        body: v.string(),
    },
    handler: async (ctx, args) => {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: 587,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        await transporter.sendMail({
            from: '"MLB Updates" <updates@example.com>',
            to: args.to,
            subject: args.subject,
            html: args.body,
        });

        return { sent: true };
    },
});
```

---

## Environment Variables

```bash
# Set via Convex dashboard or CLI
npx convex env set MLB_API_KEY "your-api-key"
npx convex env set SLACK_WEBHOOK_URL "https://hooks.slack.com/..."
```

```typescript
// Access in actions
export const callApi = action({
    args: {},
    handler: async (ctx) => {
        const apiKey = process.env.MLB_API_KEY;
        // Use apiKey...
    },
});
```
