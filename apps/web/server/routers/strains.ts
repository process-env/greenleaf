import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { StrainType } from "@greenleaf/db";

export const strainsRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          type: z.nativeEnum(StrainType).optional(),
          effects: z.array(z.string()).optional(),
          minThc: z.number().optional(),
          maxThc: z.number().optional(),
          search: z.string().optional(),
          limit: z.number().min(1).max(100).default(20),
          cursor: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { type, effects, minThc, maxThc, search, limit, cursor } =
        input ?? {};

      const strains = await ctx.prisma.strain.findMany({
        where: {
          ...(type && { type }),
          ...(effects &&
            effects.length > 0 && {
              effects: { hasSome: effects },
            }),
          ...(minThc !== undefined && {
            thcPercent: { gte: minThc },
          }),
          ...(maxThc !== undefined && {
            thcPercent: { lte: maxThc },
          }),
          ...(search && {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }),
        },
        include: {
          inventory: true,
        },
        take: limit + 1,
        ...(cursor && {
          cursor: { id: cursor },
          skip: 1,
        }),
        orderBy: { name: "asc" },
      });

      let nextCursor: string | undefined;
      if (strains.length > limit) {
        const nextItem = strains.pop();
        nextCursor = nextItem?.id;
      }

      return {
        strains,
        nextCursor,
      };
    }),

  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const strain = await ctx.prisma.strain.findUnique({
        where: { slug: input.slug },
        include: {
          inventory: true,
        },
      });

      if (!strain) {
        throw new Error("Strain not found");
      }

      return strain;
    }),

  featured: publicProcedure.query(async ({ ctx }) => {
    const strains = await ctx.prisma.strain.findMany({
      where: {
        inventory: {
          some: {
            quantity: { gt: 0 },
          },
        },
      },
      include: {
        inventory: true,
      },
      take: 6,
      orderBy: { thcPercent: "desc" },
    });

    return strains;
  }),

  search: publicProcedure
    .input(
      z.object({
        query: z.string(),
        limit: z.number().min(1).max(20).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      // Vector similarity search using pgvector
      // First, get embedding for the query
      const strains = await ctx.prisma.$queryRaw<
        Array<{
          id: string;
          slug: string;
          name: string;
          type: string;
          thcPercent: number | null;
          cbdPercent: number | null;
          effects: string[];
          flavors: string[];
          description: string | null;
          imageUrl: string | null;
        }>
      >`
        SELECT id, slug, name, type, "thcPercent", "cbdPercent", effects, flavors, description, "imageUrl"
        FROM "Strain"
        WHERE name ILIKE ${`%${input.query}%`}
           OR description ILIKE ${`%${input.query}%`}
           OR ${input.query} = ANY(effects)
           OR ${input.query} = ANY(flavors)
        LIMIT ${input.limit}
      `;

      return strains;
    }),

  similarByVector: publicProcedure
    .input(
      z.object({
        strainId: z.string(),
        limit: z.number().min(1).max(10).default(4),
      })
    )
    .query(async ({ ctx, input }) => {
      // Find similar strains using vector similarity
      const similar = await ctx.prisma.$queryRaw<
        Array<{
          id: string;
          slug: string;
          name: string;
          type: string;
          thcPercent: number | null;
          effects: string[];
          flavors: string[];
          imageUrl: string | null;
        }>
      >`
        SELECT s.id, s.slug, s.name, s.type, s."thcPercent", s.effects, s.flavors, s."imageUrl"
        FROM "Strain" s
        WHERE s.id != ${input.strainId}
          AND s.embedding IS NOT NULL
        ORDER BY s.embedding <=> (SELECT embedding FROM "Strain" WHERE id = ${input.strainId})
        LIMIT ${input.limit}
      `;

      return similar;
    }),

  effects: publicProcedure.query(async ({ ctx }) => {
    // Get all unique effects
    const strains = await ctx.prisma.strain.findMany({
      select: { effects: true },
    });

    const effectSet = new Set<string>();
    strains.forEach((strain) => {
      strain.effects.forEach((effect) => effectSet.add(effect));
    });

    return Array.from(effectSet).sort();
  }),

  flavors: publicProcedure.query(async ({ ctx }) => {
    // Get all unique flavors
    const strains = await ctx.prisma.strain.findMany({
      select: { flavors: true },
    });

    const flavorSet = new Set<string>();
    strains.forEach((strain) => {
      strain.flavors.forEach((flavor) => flavorSet.add(flavor));
    });

    return Array.from(flavorSet).sort();
  }),
});
