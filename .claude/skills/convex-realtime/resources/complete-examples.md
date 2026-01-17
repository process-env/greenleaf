# Complete Examples

## Full MLB Database Implementation

### Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
    teams: defineTable({
        externalId: v.string(),
        name: v.string(),
        city: v.string(),
        abbreviation: v.string(),
        league: v.union(v.literal('AL'), v.literal('NL')),
        division: v.union(v.literal('East'), v.literal('Central'), v.literal('West')),
        wins: v.number(),
        losses: v.number(),
        winPct: v.number(),
        gamesBack: v.number(),
        streak: v.string(),
        logoUrl: v.optional(v.string()),
    })
        .index('by_external_id', ['externalId'])
        .index('by_abbreviation', ['abbreviation'])
        .index('by_division', ['league', 'division', 'winPct']),

    players: defineTable({
        externalId: v.string(),
        teamId: v.id('teams'),
        firstName: v.string(),
        lastName: v.string(),
        number: v.number(),
        position: v.string(),
        bats: v.string(),
        throws: v.string(),
        isActive: v.boolean(),
        stats: v.optional(v.object({
            gamesPlayed: v.number(),
            battingAverage: v.optional(v.number()),
            homeRuns: v.optional(v.number()),
            rbi: v.optional(v.number()),
            era: v.optional(v.number()),
            wins: v.optional(v.number()),
            strikeouts: v.optional(v.number()),
        })),
    })
        .index('by_external_id', ['externalId'])
        .index('by_team', ['teamId'])
        .index('by_team_position', ['teamId', 'position']),

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
            v.literal('final')
        ),
        startTime: v.number(),
        venue: v.string(),
    })
        .index('by_external_id', ['externalId'])
        .index('by_status', ['status', 'startTime'])
        .index('by_date', ['startTime'])
        .index('by_home_team', ['homeTeamId', 'startTime'])
        .index('by_away_team', ['awayTeamId', 'startTime']),
});
```

### Team Queries

```typescript
// convex/teams.ts
import { query, mutation, internalMutation } from './_generated/server';
import { v } from 'convex/values';

export const getAll = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query('teams').collect();
    },
});

export const getByDivision = query({
    args: {
        league: v.union(v.literal('AL'), v.literal('NL')),
        division: v.union(v.literal('East'), v.literal('Central'), v.literal('West')),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('teams')
            .withIndex('by_division', q =>
                q.eq('league', args.league).eq('division', args.division)
            )
            .order('desc')
            .collect();
    },
});

export const getStandings = query({
    args: { league: v.union(v.literal('AL'), v.literal('NL')) },
    handler: async (ctx, args) => {
        const teams = await ctx.db.query('teams').collect();
        const leagueTeams = teams.filter(t => t.league === args.league);

        const divisions = ['East', 'Central', 'West'] as const;
        return divisions.map(division => {
            const divisionTeams = leagueTeams
                .filter(t => t.division === division)
                .sort((a, b) => b.winPct - a.winPct);

            return {
                division,
                teams: divisionTeams,
            };
        });
    },
});

export const recordWin = mutation({
    args: { teamId: v.id('teams') },
    handler: async (ctx, args) => {
        const team = await ctx.db.get(args.teamId);
        if (!team) throw new Error('Team not found');

        const wins = team.wins + 1;
        const winPct = wins / (wins + team.losses);

        await ctx.db.patch(args.teamId, {
            wins,
            winPct: Math.round(winPct * 1000) / 1000,
            streak: updateStreak(team.streak, 'W'),
        });
    },
});

function updateStreak(current: string, result: 'W' | 'L'): string {
    const currentType = current[0];
    const currentCount = parseInt(current.slice(1));

    if (currentType === result) {
        return `${result}${currentCount + 1}`;
    }
    return `${result}1`;
}
```

### Game Queries

```typescript
// convex/games.ts
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const getLive = query({
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

export const getToday = query({
    args: {},
    handler: async (ctx) => {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const games = await ctx.db
            .query('games')
            .withIndex('by_date', q =>
                q.gte('startTime', startOfDay.getTime())
                 .lte('startTime', endOfDay.getTime())
            )
            .collect();

        return Promise.all(
            games.map(async (game) => ({
                ...game,
                homeTeam: await ctx.db.get(game.homeTeamId),
                awayTeam: await ctx.db.get(game.awayTeamId),
            }))
        );
    },
});

export const getTeamSchedule = query({
    args: {
        teamId: v.id('teams'),
        upcoming: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();

        // Home games
        let homeQuery = ctx.db
            .query('games')
            .withIndex('by_home_team', q => q.eq('homeTeamId', args.teamId));

        if (args.upcoming) {
            homeQuery = homeQuery.filter(q => q.gte(q.field('startTime'), now));
        }

        const homeGames = await homeQuery.take(20);

        // Away games
        let awayQuery = ctx.db
            .query('games')
            .withIndex('by_away_team', q => q.eq('awayTeamId', args.teamId));

        if (args.upcoming) {
            awayQuery = awayQuery.filter(q => q.gte(q.field('startTime'), now));
        }

        const awayGames = await awayQuery.take(20);

        // Combine and sort
        const allGames = [...homeGames, ...awayGames].sort(
            (a, b) => a.startTime - b.startTime
        );

        // Enrich with opponent data
        const team = await ctx.db.get(args.teamId);
        return Promise.all(
            allGames.slice(0, 20).map(async (game) => {
                const isHome = game.homeTeamId === args.teamId;
                const opponentId = isHome ? game.awayTeamId : game.homeTeamId;
                const opponent = await ctx.db.get(opponentId);

                return {
                    ...game,
                    isHome,
                    team,
                    opponent,
                };
            })
        );
    },
});

export const updateScore = mutation({
    args: {
        gameId: v.id('games'),
        homeScore: v.number(),
        awayScore: v.number(),
        inning: v.optional(v.number()),
        inningHalf: v.optional(v.union(v.literal('top'), v.literal('bottom'))),
        outs: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const update: Record<string, any> = {
            homeScore: args.homeScore,
            awayScore: args.awayScore,
        };

        if (args.inning !== undefined) update.inning = args.inning;
        if (args.inningHalf !== undefined) update.inningHalf = args.inningHalf;
        if (args.outs !== undefined) update.outs = args.outs;

        await ctx.db.patch(args.gameId, update);
    },
});

export const endGame = mutation({
    args: { gameId: v.id('games') },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (!game) throw new Error('Game not found');

        await ctx.db.patch(args.gameId, { status: 'final' });

        // Update team records
        const winnerId = game.homeScore > game.awayScore ? game.homeTeamId : game.awayTeamId;
        const loserId = game.homeScore > game.awayScore ? game.awayTeamId : game.homeTeamId;

        const winner = await ctx.db.get(winnerId);
        const loser = await ctx.db.get(loserId);

        if (winner) {
            await ctx.db.patch(winnerId, {
                wins: winner.wins + 1,
                winPct: (winner.wins + 1) / (winner.wins + 1 + winner.losses),
            });
        }

        if (loser) {
            await ctx.db.patch(loserId, {
                losses: loser.losses + 1,
                winPct: loser.wins / (loser.wins + loser.losses + 1),
            });
        }
    },
});
```

### External API Sync

```typescript
// convex/actions/mlbSync.ts
import { action } from '../_generated/server';
import { internal } from '../_generated/api';

export const syncLiveScores = action({
    args: {},
    handler: async (ctx) => {
        const response = await fetch(
            'https://statsapi.mlb.com/api/v1/schedule?sportId=1&hydrate=linescore'
        );

        if (!response.ok) {
            console.error(`MLB API error: ${response.status}`);
            return { error: `HTTP ${response.status}`, synced: 0 };
        }

        const data = await response.json();
        let synced = 0;

        for (const date of data.dates ?? []) {
            for (const game of date.games ?? []) {
                try {
                    await ctx.runMutation(internal.games.syncFromApi, {
                        externalId: game.gamePk.toString(),
                        homeScore: game.teams.home.score ?? 0,
                        awayScore: game.teams.away.score ?? 0,
                        status: mapStatus(game.status.abstractGameState),
                        inning: game.linescore?.currentInning ?? 0,
                        inningHalf: game.linescore?.inningState === 'Top' ? 'top' : 'bottom',
                        outs: game.linescore?.outs ?? 0,
                    });
                    synced++;
                } catch (error) {
                    console.error(`Failed to sync game ${game.gamePk}:`, error);
                }
            }
        }

        return { synced };
    },
});

function mapStatus(apiStatus: string): 'scheduled' | 'warmup' | 'live' | 'final' {
    switch (apiStatus) {
        case 'Live':
        case 'In Progress':
            return 'live';
        case 'Final':
            return 'final';
        case 'Warmup':
            return 'warmup';
        default:
            return 'scheduled';
    }
}
```

### Cron Jobs

```typescript
// convex/crons.ts
import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Sync live scores every 30 seconds during game hours
crons.interval(
    'sync-live-scores',
    { seconds: 30 },
    internal.actions.mlbSync.syncLiveScores
);

// Update standings daily at 6 AM UTC
crons.daily(
    'update-standings',
    { hourUTC: 6, minuteUTC: 0 },
    internal.teams.recalculateStandings
);

export default crons;
```

### React Components

```typescript
// components/LiveScoreboard.tsx
'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function LiveScoreboard() {
    const liveGames = useQuery(api.games.getLive);

    if (liveGames === undefined) {
        return <div className="animate-pulse">Loading live games...</div>;
    }

    if (liveGames.length === 0) {
        return <div className="text-gray-500">No live games right now</div>;
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {liveGames.map((game) => (
                <GameCard key={game._id} game={game} />
            ))}
        </div>
    );
}

function GameCard({ game }: { game: any }) {
    return (
        <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-semibold">{game.awayTeam?.abbreviation}</span>
                    <span className="text-2xl font-bold">{game.awayScore}</span>
                </div>
                <div className="text-sm text-gray-500">
                    {game.inningHalf === 'top' ? '▲' : '▼'} {game.inning}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{game.homeScore}</span>
                    <span className="font-semibold">{game.homeTeam?.abbreviation}</span>
                </div>
            </div>
            <div className="mt-2 text-center text-xs text-gray-400">
                {game.outs} out{game.outs !== 1 ? 's' : ''}
            </div>
        </div>
    );
}
```

```typescript
// components/Standings.tsx
'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function Standings({ league }: { league: 'AL' | 'NL' }) {
    const standings = useQuery(api.teams.getStandings, { league });

    if (standings === undefined) {
        return <div className="animate-pulse">Loading standings...</div>;
    }

    return (
        <div className="space-y-6">
            {standings.map(({ division, teams }) => (
                <div key={division}>
                    <h3 className="font-bold text-lg mb-2">{league} {division}</h3>
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-sm text-gray-500">
                                <th>Team</th>
                                <th>W</th>
                                <th>L</th>
                                <th>PCT</th>
                                <th>GB</th>
                                <th>STRK</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teams.map((team) => (
                                <tr key={team._id} className="border-t">
                                    <td className="py-2 font-medium">{team.name}</td>
                                    <td>{team.wins}</td>
                                    <td>{team.losses}</td>
                                    <td>{team.winPct.toFixed(3)}</td>
                                    <td>{team.gamesBack}</td>
                                    <td>{team.streak}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );
}
```

```typescript
// components/TeamSchedule.tsx
'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

export function TeamSchedule({ teamId }: { teamId: Id<'teams'> }) {
    const schedule = useQuery(api.games.getTeamSchedule, {
        teamId,
        upcoming: true,
    });

    if (schedule === undefined) {
        return <div className="animate-pulse">Loading schedule...</div>;
    }

    return (
        <div className="space-y-2">
            {schedule.map((game) => (
                <div
                    key={game._id}
                    className="flex items-center justify-between rounded border p-3"
                >
                    <div>
                        <span className="text-sm text-gray-500">
                            {game.isHome ? 'vs' : '@'}
                        </span>{' '}
                        <span className="font-medium">{game.opponent?.name}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                        {new Date(game.startTime).toLocaleDateString()}
                    </div>
                    {game.status === 'final' && (
                        <div className="font-bold">
                            {game.isHome
                                ? `${game.homeScore}-${game.awayScore}`
                                : `${game.awayScore}-${game.homeScore}`}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
```
