"use client";

import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminOrdersPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground mt-1">
          Manage customer orders
        </p>
      </motion.div>

      {/* Placeholder */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <ShoppingCart className="h-12 w-12 mb-4" />
          <p className="text-lg">Order management coming in Sprint 4</p>
          <p className="text-sm">This feature is planned for the next sprint.</p>
        </CardContent>
      </Card>
    </div>
  );
}
