import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const cartRouter = router({
  get: publicProcedure.query(async ({ ctx }) => {
    const cartInclude = {
      items: {
        include: {
          strain: {
            include: {
              inventory: true,
            },
          },
        },
      },
    };

    // Try to find cart by userId first (if logged in)
    let cart = null;

    if (ctx.userId) {
      cart = await ctx.prisma.cart.findUnique({
        where: { userId: ctx.userId },
        include: cartInclude,
      });
    }

    // Fall back to session cart if no user cart found
    if (!cart && ctx.sessionId) {
      cart = await ctx.prisma.cart.findUnique({
        where: { sessionId: ctx.sessionId },
        include: cartInclude,
      });

      // Link anonymous cart to user if they're logged in (within transaction)
      if (cart && ctx.userId && !cart.userId) {
        try {
          await ctx.prisma.cart.update({
            where: { id: cart.id },
            data: { userId: ctx.userId },
          });
        } catch {
          // If linking fails (e.g., user already has a cart), ignore
          // The user's existing cart will be used on next request
        }
      }
    }

    if (!cart) {
      return { items: [], total: 0 };
    }

    const items = cart.items.map((item) => {
      const pricePerGram = item.strain.inventory[0]?.pricePerGram ?? 0;
      return {
        id: item.id,
        strainId: item.strainId,
        strainName: item.strain.name,
        strainSlug: item.strain.slug,
        strainType: item.strain.type,
        imageUrl: item.strain.imageUrl,
        grams: item.grams,
        pricePerGram,
        subtotal: Math.round(item.grams * pricePerGram * 100),
      };
    });

    const total = items.reduce((sum, item) => sum + item.subtotal, 0);

    return { items, total };
  }),

  add: publicProcedure
    .input(
      z.object({
        strainId: z.string(),
        grams: z.number().min(0.5).max(28),
        sessionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify strain exists and has inventory
      const strain = await ctx.prisma.strain.findUnique({
        where: { id: input.strainId },
        include: { inventory: true },
      });

      if (!strain) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Strain not found",
        });
      }

      const inventory = strain.inventory[0];
      if (!inventory || inventory.quantity < input.grams) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient inventory",
        });
      }

      // Use transaction to prevent race conditions
      await ctx.prisma.$transaction(async (tx) => {
        // Get or create cart atomically
        let cart = null;

        // Check user cart first if logged in
        if (ctx.userId) {
          cart = await tx.cart.findUnique({
            where: { userId: ctx.userId },
          });
        }

        // Fall back to session cart
        if (!cart) {
          cart = await tx.cart.findUnique({
            where: { sessionId: input.sessionId },
          });
        }

        if (!cart) {
          // Create new cart with upsert to handle race conditions
          cart = await tx.cart.upsert({
            where: { sessionId: input.sessionId },
            update: ctx.userId ? { userId: ctx.userId } : {},
            create: {
              sessionId: input.sessionId,
              userId: ctx.userId,
            },
          });
        } else if (ctx.userId && !cart.userId) {
          // Link anonymous cart to user
          cart = await tx.cart.update({
            where: { id: cart.id },
            data: { userId: ctx.userId },
          });
        }

        // Upsert cart item to handle concurrent adds
        await tx.cartItem.upsert({
          where: {
            cartId_strainId: {
              cartId: cart.id,
              strainId: input.strainId,
            },
          },
          update: {
            grams: { increment: input.grams },
          },
          create: {
            cartId: cart.id,
            strainId: input.strainId,
            grams: input.grams,
          },
        });
      });

      return { success: true };
    }),

  update: publicProcedure
    .input(
      z.object({
        itemId: z.string(),
        grams: z.number().min(0.5).max(28),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.cartItem.findUnique({
        where: { id: input.itemId },
        include: {
          strain: {
            include: { inventory: true },
          },
        },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cart item not found",
        });
      }

      const inventory = item.strain.inventory[0];
      if (!inventory || inventory.quantity < input.grams) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient inventory",
        });
      }

      await ctx.prisma.cartItem.update({
        where: { id: input.itemId },
        data: { grams: input.grams },
      });

      return { success: true };
    }),

  remove: publicProcedure
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.cartItem.delete({
        where: { id: input.itemId },
      });

      return { success: true };
    }),

  clear: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Try to find cart by userId first, then sessionId
      let cart = null;

      if (ctx.userId) {
        cart = await ctx.prisma.cart.findFirst({
          where: { userId: ctx.userId },
        });
      }

      if (!cart) {
        cart = await ctx.prisma.cart.findUnique({
          where: { sessionId: input.sessionId },
        });
      }

      if (cart) {
        await ctx.prisma.cartItem.deleteMany({
          where: { cartId: cart.id },
        });
      }

      return { success: true };
    }),

  itemCount: publicProcedure.query(async ({ ctx }) => {
    // Try to find cart by userId first, then sessionId
    let cart = null;

    if (ctx.userId) {
      cart = await ctx.prisma.cart.findFirst({
        where: { userId: ctx.userId },
        include: {
          _count: {
            select: { items: true },
          },
        },
      });
    }

    if (!cart && ctx.sessionId) {
      cart = await ctx.prisma.cart.findUnique({
        where: { sessionId: ctx.sessionId },
        include: {
          _count: {
            select: { items: true },
          },
        },
      });
    }

    return cart?._count.items ?? 0;
  }),
});
