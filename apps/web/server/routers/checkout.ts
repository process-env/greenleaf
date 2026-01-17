import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

export const checkoutRouter = router({
  create: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get cart with items
      const cart = await ctx.prisma.cart.findUnique({
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

      if (!cart || cart.items.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cart is empty",
        });
      }

      // Build line items for Stripe
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
        cart.items.map((item) => {
          const pricePerGram = item.strain.inventory[0]?.pricePerGram ?? 0;
          const unitAmount = Math.round(pricePerGram * 100);

          return {
            price_data: {
              currency: "usd",
              product_data: {
                name: item.strain.name,
                description: `${item.strain.type} - ${item.grams}g`,
                images: item.strain.imageUrl ? [item.strain.imageUrl] : [],
              },
              unit_amount: unitAmount,
            },
            quantity: item.grams,
          };
        });

      // Calculate total
      const totalCents = cart.items.reduce((sum, item) => {
        const pricePerGram = item.strain.inventory[0]?.pricePerGram ?? 0;
        return sum + Math.round(item.grams * pricePerGram * 100);
      }, 0);

      // Create Stripe checkout session
      const stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cart`,
        metadata: {
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
            create: cart.items.map((item) => {
              const pricePerGram = item.strain.inventory[0]?.pricePerGram ?? 0;
              return {
                strainId: item.strainId,
                strainName: item.strain.name,
                grams: item.grams,
                priceCents: Math.round(item.grams * pricePerGram * 100),
              };
            }),
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

      return {
        id: order.id,
        status: order.status,
        totalCents: order.totalCents,
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
