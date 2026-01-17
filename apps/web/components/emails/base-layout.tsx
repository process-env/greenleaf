import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface BaseLayoutProps {
  preview: string;
  heading: string;
  children: React.ReactNode;
}

export function BaseLayout({ preview, heading, children }: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logo}>GreenLeaf</Heading>
            <Text style={tagline}>Premium Cannabis Dispensary</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading style={title}>{heading}</Heading>
            {children}
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Questions? Contact us at{" "}
              <Link href="mailto:support@greenleaf.com" style={link}>
                support@greenleaf.com
              </Link>
            </Text>
            <Text style={footerText}>
              GreenLeaf Dispensary | 420 Cannabis Way, Boulder, CO 80302
            </Text>
            <Text style={footerCopyright}>
              © {new Date().getFullYear()} GreenLeaf. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const header = {
  padding: "32px 48px",
  backgroundColor: "#16a34a",
  textAlign: "center" as const,
};

const logo = {
  color: "#ffffff",
  fontSize: "32px",
  fontWeight: "bold",
  margin: "0 0 8px",
};

const tagline = {
  color: "#dcfce7",
  fontSize: "14px",
  margin: "0",
};

const content = {
  padding: "32px 48px",
};

const title = {
  color: "#1f2937",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "32px",
  margin: "0 0 24px",
};

const footer = {
  padding: "32px 48px",
  borderTop: "1px solid #e5e7eb",
};

const footerText = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "0 0 8px",
  textAlign: "center" as const,
};

const footerCopyright = {
  color: "#9ca3af",
  fontSize: "11px",
  lineHeight: "16px",
  margin: "16px 0 0",
  textAlign: "center" as const,
};

const link = {
  color: "#16a34a",
  textDecoration: "underline",
};
