import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { stripe, getBaseUrl } from "@/lib/stripe";

export const checkoutRouter = router({
  create: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get cart - check user cart first, then session cart
      let cart = null;

      if (ctx.userId) {
        cart = await ctx.prisma.cart.findUnique({
          where: { userId: ctx.userId },
          include: {
            items: {
              include: {
                strain: {
                  include: { inventory: true },
                },
              },
            },
          },
        });
      }

      // Fall back to session cart (only if anonymous)
      if (!cart) {
        const sessionCart = await ctx.prisma.cart.findUnique({
          where: { sessionId: input.sessionId },
          include: {
            items: {
              include: {
                strain: {
                  include: { inventory: true },
                },
              },
            },
          },
        });

        if (sessionCart && !sessionCart.userId) {
          cart = sessionCart;
        }
      }

      if (!cart || cart.items.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cart is empty",
        });
      }

      // Validate inventory and calculate totals
      const orderItems: {
        strainId: string;
        strainName: string;
        grams: number;
        pricePerGram: number;
        priceCents: number;
      }[] = [];

      for (const item of cart.items) {
        const inventory = item.strain.inventory[0];
        if (!inventory) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `${item.strain.name} is not available`,
          });
        }

        if (inventory.quantity < item.grams) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Insufficient inventory for ${item.strain.name}. Only ${inventory.quantity}g available.`,
          });
        }

        const pricePerGram = inventory.pricePerGram;
        const priceCents = Math.round(item.grams * pricePerGram * 100);

        orderItems.push({
          strainId: item.strainId,
          strainName: item.strain.name,
          grams: item.grams,
          pricePerGram,
          priceCents,
        });
      }

      const totalCents = orderItems.reduce((sum, item) => sum + item.priceCents, 0);

      // Build Stripe line items (quantity must be integer, so fold grams into unit_amount)
      const lineItems = orderItems.map((item) => {
        const cartItem = cart.items.find((ci) => ci.strainId === item.strainId);

        return {
          price_data: {
            currency: "usd" as const,
            product_data: {
              name: item.strainName,
              description: `${item.grams}g @ $${item.pricePerGram.toFixed(2)}/g`,
              images: cartItem?.strain.imageUrl ? [cartItem.strain.imageUrl] : [],
            },
            unit_amount: item.priceCents, // Total price for this line item
          },
          quantity: 1, // Stripe requires integer quantity
        };
      });

      const baseUrl = getBaseUrl();

      // Create Stripe checkout session
      const stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/cart?cancelled=true`,
        metadata: {
          cartId: cart.id,
          cartSessionId: input.sessionId,
        },
      });

      // Create pending order
      await ctx.prisma.order.create({
        data: {
          stripeSessionId: stripeSession.id,
          status: "PENDING",
          totalCents,
          items: {
            create: orderItems,
          },
        },
      });

      return { url: stripeSession.url };
    }),

  verify: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { stripeSessionId: input.sessionId },
        include: {
          items: {
            include: {
              strain: {
                select: {
                  name: true,
                  imageUrl: true,
                  slug: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      return {
        id: order.id,
        status: order.status,
        totalCents: order.totalCents,
        email: order.email,
        items: order.items,
        createdAt: order.createdAt,
      };
    }),
});

export const ordersRouter = router({
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const orders = await ctx.prisma.order.findMany({
        where: {
          status: { in: ["PAID", "FULFILLED"] },
        },
        include: {
          items: {
            include: { strain: true },
          },
        },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: { id: input.cursor },
          skip: 1,
        }),
        orderBy: { createdAt: "desc" },
      });

      let nextCursor: string | undefined;
      if (orders.length > input.limit) {
        const nextItem = orders.pop();
        nextCursor = nextItem?.id;
      }

      return { orders, nextCursor };
    }),

  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.id },
        include: {
          items: {
            include: { strain: true },
          },
        },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      return order;
    }),
});
