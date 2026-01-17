import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

// Validation schemas
const strainCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  type: z.enum(["INDICA", "SATIVA", "HYBRID"]),
  thcPercent: z.number().min(0).max(100).nullable(),
  cbdPercent: z.number().min(0).max(100).nullable(),
  effects: z.array(z.string()),
  flavors: z.array(z.string()),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
});

const strainUpdateSchema = strainCreateSchema.partial().extend({
  id: z.string(),
});

const inventoryUpdateSchema = z.object({
  strainId: z.string(),
  quantity: z.number().min(0).optional(),
  pricePerGram: z.number().min(0).optional(),
});

export const adminRouter = router({
  // Dashboard stats
  stats: adminProcedure.query(async ({ ctx }) => {
    const [totalStrains, inventoryStats, orderStats, lowStockCount] = await Promise.all([
      ctx.prisma.strain.count(),
      ctx.prisma.inventory.aggregate({
        _sum: { quantity: true },
      }),
      ctx.prisma.order.aggregate({
        _count: true,
        _sum: { totalCents: true },
      }),
      ctx.prisma.inventory.count({
        where: { quantity: { lt: 10 } },
      }),
    ]);

    return {
      totalStrains,
      totalInventory: inventoryStats._sum.quantity ?? 0,
      totalOrders: orderStats._count,
      totalRevenue: orderStats._sum.totalCents ?? 0,
      lowStockCount,
    };
  }),

  // Strain CRUD
  strains: router({
    list: adminProcedure
      .input(
        z.object({
          page: z.number().min(1).default(1),
          perPage: z.number().min(1).max(100).default(20),
          search: z.string().optional(),
          type: z.enum(["INDICA", "SATIVA", "HYBRID"]).optional(),
        }).optional()
      )
      .query(async ({ ctx, input }) => {
        const page = input?.page ?? 1;
        const perPage = input?.perPage ?? 20;
        const skip = (page - 1) * perPage;

        const where = {
          ...(input?.search && {
            name: { contains: input.search, mode: "insensitive" as const },
          }),
          ...(input?.type && { type: input.type }),
        };

        const [strains, total] = await Promise.all([
          ctx.prisma.strain.findMany({
            where,
            skip,
            take: perPage,
            orderBy: { name: "asc" },
            include: {
              inventory: true,
            },
          }),
          ctx.prisma.strain.count({ where }),
        ]);

        return {
          strains,
          total,
          pages: Math.ceil(total / perPage),
          page,
        };
      }),

    get: adminProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const strain = await ctx.prisma.strain.findUnique({
          where: { id: input.id },
          include: { inventory: true },
        });

        if (!strain) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Strain not found",
          });
        }

        return strain;
      }),

    create: adminProcedure
      .input(strainCreateSchema)
      .mutation(async ({ ctx, input }) => {
        // Check for duplicate slug
        const existing = await ctx.prisma.strain.findUnique({
          where: { slug: input.slug },
        });

        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A strain with this slug already exists",
          });
        }

        const strain = await ctx.prisma.strain.create({
          data: input,
        });

        // Create initial inventory record
        await ctx.prisma.inventory.create({
          data: {
            strainId: strain.id,
            quantity: 0,
            pricePerGram: 0,
          },
        });

        return strain;
      }),

    update: adminProcedure
      .input(strainUpdateSchema)
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;

        // Check slug uniqueness if changing
        if (data.slug) {
          const existing = await ctx.prisma.strain.findFirst({
            where: {
              slug: data.slug,
              NOT: { id },
            },
          });

          if (existing) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "A strain with this slug already exists",
            });
          }
        }

        return ctx.prisma.strain.update({
          where: { id },
          data,
        });
      }),

    delete: adminProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return ctx.prisma.strain.delete({
          where: { id: input.id },
        });
      }),
  }),

  // Inventory management
  inventory: router({
    list: adminProcedure
      .input(
        z.object({
          lowStockOnly: z.boolean().optional(),
        }).optional()
      )
      .query(async ({ ctx, input }) => {
        const where = input?.lowStockOnly
          ? { quantity: { lt: 10 } }
          : {};

        return ctx.prisma.inventory.findMany({
          where,
          include: {
            strain: {
              select: {
                id: true,
                name: true,
                slug: true,
                type: true,
                imageUrl: true,
              },
            },
          },
          orderBy: { strain: { name: "asc" } },
        });
      }),

    update: adminProcedure
      .input(inventoryUpdateSchema)
      .mutation(async ({ ctx, input }) => {
        const { strainId, ...data } = input;

        return ctx.prisma.inventory.upsert({
          where: { strainId },
          update: data,
          create: {
            strainId,
            quantity: data.quantity ?? 0,
            pricePerGram: data.pricePerGram ?? 0,
          },
        });
      }),

    bulkUpdate: adminProcedure
      .input(z.array(inventoryUpdateSchema))
      .mutation(async ({ ctx, input }) => {
        const results = await ctx.prisma.$transaction(
          input.map((item) =>
            ctx.prisma.inventory.upsert({
              where: { strainId: item.strainId },
              update: {
                ...(item.quantity !== undefined && { quantity: item.quantity }),
                ...(item.pricePerGram !== undefined && { pricePerGram: item.pricePerGram }),
              },
              create: {
                strainId: item.strainId,
                quantity: item.quantity ?? 0,
                pricePerGram: item.pricePerGram ?? 0,
              },
            })
          )
        );

        return { updated: results.length };
      }),
  }),
});
