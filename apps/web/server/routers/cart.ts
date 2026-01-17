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
      const sessionCart = await ctx.prisma.cart.findUnique({
        where: { sessionId: ctx.sessionId },
        include: cartInclude,
      });

      // Only use session cart if it's anonymous (prevent cross-user exposure)
      if (sessionCart && !sessionCart.userId) {
        cart = sessionCart;

        // Link anonymous cart to user if they're logged in
        if (ctx.userId) {
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
      if (!inventory) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Strain not available",
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

        // Fall back to session cart (only if anonymous)
        if (!cart) {
          const sessionCart = await tx.cart.findUnique({
            where: { sessionId: input.sessionId },
          });

          // Only use if anonymous (prevent cross-user exposure)
          if (sessionCart && !sessionCart.userId) {
            cart = sessionCart;
          }
        }

        if (!cart) {
          // Create new cart
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

        // Check existing cart item to validate total quantity
        const existingItem = await tx.cartItem.findUnique({
          where: {
            cartId_strainId: {
              cartId: cart.id,
              strainId: input.strainId,
            },
          },
        });

        const existingGrams = existingItem?.grams ?? 0;
        const totalGrams = existingGrams + input.grams;

        // Validate total quantity doesn't exceed inventory
        if (totalGrams > inventory.quantity) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Insufficient inventory. Only ${inventory.quantity}g available${existingGrams > 0 ? ` (${existingGrams}g already in cart)` : ""}.`,
          });
        }

        // Upsert cart item
        await tx.cartItem.upsert({
          where: {
            cartId_strainId: {
              cartId: cart.id,
              strainId: input.strainId,
            },
          },
          update: {
            grams: totalGrams,
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
      // Try to find cart by userId first
      let cart = null;

      if (ctx.userId) {
        cart = await ctx.prisma.cart.findUnique({
          where: { userId: ctx.userId },
        });
      }

      // Fall back to session cart (only if anonymous)
      if (!cart) {
        const sessionCart = await ctx.prisma.cart.findUnique({
          where: { sessionId: input.sessionId },
        });

        // Only clear if anonymous (prevent cross-user exposure)
        if (sessionCart && !sessionCart.userId) {
          cart = sessionCart;
        }
      }

      if (cart) {
        await ctx.prisma.cartItem.deleteMany({
          where: { cartId: cart.id },
        });
      }

      return { success: true };
    }),

  itemCount: publicProcedure.query(async ({ ctx }) => {
    // Try to find cart by userId first
    let cart = null;

    if (ctx.userId) {
      cart = await ctx.prisma.cart.findUnique({
        where: { userId: ctx.userId },
        include: {
          _count: {
            select: { items: true },
          },
        },
      });
    }

    // Fall back to session cart (only if anonymous)
    if (!cart && ctx.sessionId) {
      const sessionCart = await ctx.prisma.cart.findUnique({
        where: { sessionId: ctx.sessionId },
        include: {
          _count: {
            select: { items: true },
          },
        },
      });

      // Only use if anonymous (prevent cross-user exposure)
      if (sessionCart && !sessionCart.userId) {
        cart = sessionCart;
      }
    }

    return cart?._count.items ?? 0;
  }),
});
