import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@/styles/globals.css";
import { TRPCProvider } from "@/lib/trpc/provider";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "GreenLeaf Dispensary",
  description:
    "Premium cannabis products with AI-powered recommendations. Browse our curated selection of strains and get personalized suggestions from our AI budtender.",
  keywords: ["cannabis", "dispensary", "strains", "indica", "sativa", "hybrid"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <TRPCProvider>
          {children}
          <Toaster />
        </TRPCProvider>
      </body>
    </html>
  );
}
