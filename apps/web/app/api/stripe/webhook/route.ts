import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@greenleaf/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      // Update order status to PAID
      await prisma.order.update({
        where: { stripeSessionId: session.id },
        data: {
          status: "PAID",
          email: session.customer_details?.email,
        },
      });

      // Clear the cart
      const cartSessionId = session.metadata?.cartSessionId;
      if (cartSessionId) {
        const cart = await prisma.cart.findUnique({
          where: { sessionId: cartSessionId },
        });

        if (cart) {
          await prisma.cartItem.deleteMany({
            where: { cartId: cart.id },
          });
        }
      }

      // Reduce inventory
      const order = await prisma.order.findUnique({
        where: { stripeSessionId: session.id },
        include: { items: true },
      });

      if (order) {
        for (const item of order.items) {
          await prisma.inventory.updateMany({
            where: { strainId: item.strainId },
            data: {
              quantity: {
                decrement: Math.ceil(item.grams),
              },
            },
          });
        }
      }

      console.log(`Order ${session.id} completed successfully`);
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;

      // Update order status to CANCELLED
      await prisma.order.update({
        where: { stripeSessionId: session.id },
        data: { status: "CANCELLED" },
      });

      console.log(`Order ${session.id} expired`);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
