import { NextRequest, NextResponse } from "next/server";
import { render } from "@react-email/components";
import { OrderConfirmationEmail } from "@/components/emails/order-confirmation";
import { OrderShippedEmail } from "@/components/emails/order-shipped";

// Only available in development
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const template = searchParams.get("template") || "order-confirmation";

  // Mock order data for preview
  const mockOrder = {
    id: "abcd1234-5678-90ef-ghij-klmnopqrstuv",
    email: "customer@example.com",
    status: "PAID",
    totalCents: 15000,
    createdAt: new Date(),
    items: [
      {
        id: "item-1",
        grams: 7,
        pricePerGram: 15,
        priceCents: 10500,
        strain: {
          name: "Blue Dream",
          imageUrl: null,
        },
      },
      {
        id: "item-2",
        grams: 3.5,
        pricePerGram: 12,
        priceCents: 4200,
        strain: {
          name: "OG Kush",
          imageUrl: null,
        },
      },
      {
        id: "item-3",
        grams: 1,
        pricePerGram: 3,
        priceCents: 300,
        strain: {
          name: "Deleted Strain",
          imageUrl: null,
        },
      },
    ],
  };

  let html: string;

  switch (template) {
    case "order-shipped":
      html = await render(OrderShippedEmail({ order: mockOrder }));
      break;
    case "order-confirmation":
    default:
      html = await render(OrderConfirmationEmail({ order: mockOrder }));
      break;
  }

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}
