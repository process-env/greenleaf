import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@repo/db";
import { sendOrderConfirmation } from "@/lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutExpired(session);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment failed for PaymentIntent: ${paymentIntent.id}`);
        // Could notify customer or take other action
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook handler error: ${message}`);
    return NextResponse.json(
      { error: `Webhook handler failed: ${message}` },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const stripeSessionId = session.id;
  const customerEmail = session.customer_details?.email;
  const cartId = session.metadata?.cartId;

  // Find the order
  const order = await prisma.order.findUnique({
    where: { stripeSessionId },
    include: {
      items: {
        include: {
          strain: {
            select: {
              name: true,
              imageUrl: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    console.error(`Order not found for session: ${stripeSessionId}`);
    return;
  }

  // Skip if already processed (idempotency)
  if (order.status !== "PENDING") {
    console.log(`Order ${order.id} already processed, skipping`);
    return;
  }

  // Update order status and email in a transaction
  await prisma.$transaction(async (tx) => {
    // Update order to PAID
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        email: customerEmail,
      },
    });

    // Deduct inventory for each item (with negative quantity protection)
    for (const item of order.items) {
      if (item.strainId) {
        const gramsToDeduct = Math.ceil(item.grams);

        // Only decrement if sufficient quantity exists
        const result = await tx.inventory.updateMany({
          where: {
            strainId: item.strainId,
            quantity: { gte: gramsToDeduct },
          },
          data: {
            quantity: {
              decrement: gramsToDeduct,
            },
          },
        });

        // Log warning if inventory couldn't be deducted (already depleted)
        if (result.count === 0) {
          console.warn(
            `Insufficient inventory for strain ${item.strainId}, order ${order.id}. ` +
            `Requested: ${gramsToDeduct}g. Order will still be marked as paid.`
          );
        }
      }
    }

    // Clear the cart if we have a cartId
    if (cartId) {
      await tx.cartItem.deleteMany({
        where: { cartId },
      });
    }
  });

  // Send order confirmation email
  const updatedOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: {
      items: {
        include: {
          strain: {
            select: {
              name: true,
              imageUrl: true,
            },
          },
        },
      },
    },
  });

  if (updatedOrder) {
    await sendOrderConfirmation(updatedOrder);
  }

  console.log(`Order ${order.id} completed successfully`);
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const stripeSessionId = session.id;

  // Find and cancel the pending order
  const order = await prisma.order.findUnique({
    where: { stripeSessionId },
  });

  if (order && order.status === "PENDING") {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });

    console.log(`Order ${order.id} cancelled due to expired session`);
  }
}
