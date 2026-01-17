import { Resend } from "resend";
import { OrderConfirmationEmail } from "@/components/emails/order-confirmation";
import { OrderShippedEmail } from "@/components/emails/order-shipped";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "GreenLeaf <orders@greenleaf.com>";

type OrderWithItems = {
  id: string;
  email: string | null;
  status: string;
  totalCents: number;
  createdAt: Date;
  items: Array<{
    id: string;
    grams: number;
    pricePerGram: number;
    priceCents: number;
    strain: {
      name: string;
      imageUrl: string | null;
    } | null;
  }>;
};

export async function sendOrderConfirmation(order: OrderWithItems) {
  if (!order.email) {
    console.warn(`Cannot send order confirmation: no email for order ${order.id}`);
    return null;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: order.email,
      subject: `Order Confirmed #${order.id.slice(0, 8)}`,
      react: OrderConfirmationEmail({ order }),
    });

    if (error) {
      console.error("Failed to send order confirmation:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Error sending order confirmation:", err);
    return null;
  }
}

export async function sendOrderShipped(order: OrderWithItems) {
  if (!order.email) {
    console.warn(`Cannot send shipping notification: no email for order ${order.id}`);
    return null;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: order.email,
      subject: `Your Order Has Shipped #${order.id.slice(0, 8)}`,
      react: OrderShippedEmail({ order }),
    });

    if (error) {
      console.error("Failed to send shipping notification:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Error sending shipping notification:", err);
    return null;
  }
}

export async function sendOrderStatusUpdate(
  order: OrderWithItems,
  previousStatus: string
) {
  // Only send email for specific status transitions
  if (order.status === "FULFILLED" && previousStatus === "PAID") {
    return sendOrderShipped(order);
  }

  // Could add more status transition emails here (cancelled, refunded, etc.)
  return null;
}
