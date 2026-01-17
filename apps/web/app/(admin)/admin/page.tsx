"use client";

import { motion } from "framer-motion";
import { Package, Leaf, ShoppingCart, DollarSign, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { staggerContainer, staggerItem } from "@/lib/motion";

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  isLoading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  isLoading?: boolean;
}) {
  return (
    <motion.div variants={staggerItem}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="text-2xl font-bold">{value}</div>
              {description && (
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = trpc.admin.stats.useQuery();

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back. Here&apos;s your store overview.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          title="Total Strains"
          value={stats?.totalStrains ?? 0}
          icon={Leaf}
          description="Active products in catalog"
          isLoading={isLoading}
        />
        <StatCard
          title="Total Inventory"
          value={`${stats?.totalInventory ?? 0}g`}
          icon={Package}
          description="Grams in stock"
          isLoading={isLoading}
        />
        <StatCard
          title="Total Orders"
          value={stats?.totalOrders ?? 0}
          icon={ShoppingCart}
          description="All time orders"
          isLoading={isLoading}
        />
        <StatCard
          title="Revenue"
          value={`$${((stats?.totalRevenue ?? 0) / 100).toFixed(2)}`}
          icon={DollarSign}
          description="Total revenue"
          isLoading={isLoading}
        />
      </motion.div>

      {/* Low Stock Alert */}
      {stats?.lowStockCount && stats.lowStockCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <CardTitle className="text-sm font-medium text-yellow-500">
                Low Stock Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {stats.lowStockCount} strain{stats.lowStockCount > 1 ? "s" : ""} running low on inventory.
                <a
                  href="/admin/inventory"
                  className="ml-1 text-primary hover:underline"
                >
                  View inventory
                </a>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
