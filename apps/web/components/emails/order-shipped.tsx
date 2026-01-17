import {
  Column,
  Hr,
  Row,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";

interface OrderItem {
  id: string;
  grams: number;
  pricePerGram: number;
  priceCents: number;
  strain: {
    name: string;
    imageUrl: string | null;
  } | null;
}

interface OrderShippedEmailProps {
  order: {
    id: string;
    email: string | null;
    totalCents: number;
    createdAt: Date;
    items: OrderItem[];
  };
}

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function OrderShippedEmail({ order }: OrderShippedEmailProps) {
  const orderId = order.id.slice(0, 8).toUpperCase();

  return (
    <BaseLayout
      preview={`Your GreenLeaf order #${orderId} has shipped!`}
      heading="Your Order Has Shipped!"
    >
      <Text style={paragraph}>
        Great news! Your order is on its way. We&apos;ve carefully packaged your
        items and they&apos;re now ready for delivery.
      </Text>

      {/* Order Info */}
      <Section style={infoBox}>
        <Row>
          <Column>
            <Text style={infoLabel}>Order Number</Text>
            <Text style={infoValue}>#{orderId}</Text>
          </Column>
          <Column>
            <Text style={infoLabel}>Status</Text>
            <Text style={statusBadge}>Fulfilled</Text>
          </Column>
        </Row>
      </Section>

      {/* Shipping Info */}
      <Section style={shippingBox}>
        <Text style={shippingTitle}>Shipping Information</Text>
        <Text style={shippingText}>
          Your order has been fulfilled and is ready for pickup or delivery.
          If you selected delivery, expect your package within 1-3 business days.
        </Text>
      </Section>

      {/* Order Items */}
      <Text style={sectionTitle}>Items in Your Order</Text>
      <Section style={itemsContainer}>
        {order.items.map((item) => (
          <Row key={item.id} style={itemRow}>
            <Column style={itemName}>
              <Text style={itemNameText}>
                {item.strain?.name ?? "Unknown Product"}
              </Text>
              <Text style={itemDetails}>{item.grams}g</Text>
            </Column>
            <Column style={itemPrice}>
              <Text style={itemPriceText}>{formatCurrency(item.priceCents)}</Text>
            </Column>
          </Row>
        ))}
      </Section>

      <Hr style={divider} />

      {/* Order Total */}
      <Section style={totalSection}>
        <Row>
          <Column style={totalLabel}>
            <Text style={totalLabelText}>Order Total</Text>
          </Column>
          <Column style={totalValue}>
            <Text style={totalValueText}>{formatCurrency(order.totalCents)}</Text>
          </Column>
        </Row>
      </Section>

      <Hr style={divider} />

      {/* Important Notes */}
      <Text style={sectionTitle}>Important Information</Text>
      <Text style={paragraph}>
        Please have a valid ID ready when receiving your order. All cannabis
        products must be signed for by an adult 21 years of age or older.
      </Text>

      <Text style={footerNote}>
        Thank you for choosing GreenLeaf! We hope you enjoy your products.
        If you have any questions or concerns, please contact our support team.
      </Text>
    </BaseLayout>
  );
}

const paragraph = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const infoBox = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "16px",
  margin: "24px 0",
};

const infoLabel = {
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: "500",
  margin: "0 0 4px",
  textTransform: "uppercase" as const,
};

const infoValue = {
  color: "#111827",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0",
};

const statusBadge = {
  backgroundColor: "#dcfce7",
  color: "#16a34a",
  fontSize: "14px",
  fontWeight: "600",
  padding: "4px 12px",
  borderRadius: "9999px",
  display: "inline-block",
  margin: "0",
};

const shippingBox = {
  backgroundColor: "#ecfdf5",
  border: "1px solid #a7f3d0",
  borderRadius: "8px",
  padding: "16px",
  margin: "24px 0",
};

const shippingTitle = {
  color: "#065f46",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0 0 8px",
};

const shippingText = {
  color: "#047857",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0",
};

const sectionTitle = {
  color: "#111827",
  fontSize: "16px",
  fontWeight: "600",
  margin: "24px 0 12px",
};

const itemsContainer = {
  margin: "0 0 16px",
};

const itemRow = {
  borderBottom: "1px solid #f3f4f6",
  padding: "12px 0",
};

const itemName = {
  width: "70%",
};

const itemNameText = {
  color: "#111827",
  fontSize: "14px",
  fontWeight: "500",
  margin: "0 0 4px",
};

const itemDetails = {
  color: "#6b7280",
  fontSize: "12px",
  margin: "0",
};

const itemPrice = {
  width: "30%",
  textAlign: "right" as const,
};

const itemPriceText = {
  color: "#111827",
  fontSize: "14px",
  fontWeight: "500",
  margin: "0",
};

const divider = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const totalSection = {
  margin: "0",
};

const totalLabel = {
  width: "70%",
};

const totalLabelText = {
  color: "#111827",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0",
};

const totalValue = {
  width: "30%",
  textAlign: "right" as const,
};

const totalValueText = {
  color: "#16a34a",
  fontSize: "20px",
  fontWeight: "700",
  margin: "0",
};

const footerNote = {
  color: "#9ca3af",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "24px 0 0",
  fontStyle: "italic",
};

export default OrderShippedEmail;
