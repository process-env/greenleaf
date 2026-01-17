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

interface OrderConfirmationEmailProps {
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

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function OrderConfirmationEmail({ order }: OrderConfirmationEmailProps) {
  const orderId = order.id.slice(0, 8).toUpperCase();

  return (
    <BaseLayout
      preview={`Your GreenLeaf order #${orderId} has been confirmed`}
      heading="Order Confirmed!"
    >
      <Text style={paragraph}>
        Thank you for your order! We&apos;ve received your payment and your order is
        now being processed.
      </Text>

      {/* Order Info */}
      <Section style={infoBox}>
        <Row>
          <Column>
            <Text style={infoLabel}>Order Number</Text>
            <Text style={infoValue}>#{orderId}</Text>
          </Column>
          <Column>
            <Text style={infoLabel}>Order Date</Text>
            <Text style={infoValue}>{formatDate(order.createdAt)}</Text>
          </Column>
        </Row>
      </Section>

      {/* Order Items */}
      <Text style={sectionTitle}>Order Details</Text>
      <Section style={itemsContainer}>
        {order.items.map((item) => (
          <Row key={item.id} style={itemRow}>
            <Column style={itemName}>
              <Text style={itemNameText}>
                {item.strain?.name ?? "Unknown Product"}
              </Text>
              <Text style={itemDetails}>
                {item.grams}g @ {formatCurrency(item.pricePerGram * 100)}/g
              </Text>
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
            <Text style={totalLabelText}>Total</Text>
          </Column>
          <Column style={totalValue}>
            <Text style={totalValueText}>{formatCurrency(order.totalCents)}</Text>
          </Column>
        </Row>
      </Section>

      <Hr style={divider} />

      {/* Next Steps */}
      <Text style={sectionTitle}>What&apos;s Next?</Text>
      <Text style={paragraph}>
        We&apos;ll send you another email when your order is ready for pickup or has
        been shipped. In the meantime, you can track your order status by logging
        into your account.
      </Text>

      <Text style={footerNote}>
        Please keep this email for your records. If you have any questions about
        your order, please don&apos;t hesitate to contact our support team.
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

export default OrderConfirmationEmail;
