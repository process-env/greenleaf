"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Package,
  Leaf,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "PAID":
      return "default";
    case "FULFILLED":
      return "secondary";
    case "CANCELLED":
      return "destructive";
    default:
      return "outline";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "PENDING":
      return <Clock className="h-3 w-3" />;
    case "PAID":
      return <CreditCard className="h-3 w-3" />;
    case "FULFILLED":
      return <CheckCircle className="h-3 w-3" />;
    case "CANCELLED":
      return <XCircle className="h-3 w-3" />;
    default:
      return <Package className="h-3 w-3" />;
  }
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = trpc.admin.stats.useQuery();
  const { data: orderStats, isLoading: orderStatsLoading } = trpc.admin.orders.stats.useQuery();
  const { data: topSellers, isLoading: topSellersLoading } = trpc.admin.orders.topSellers.useQuery({ limit: 5 });
  const { data: recentOrders, isLoading: recentOrdersLoading } = trpc.admin.orders.recent.useQuery({ limit: 5 });

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
          value={formatCurrency(stats?.totalRevenue ?? 0)}
          icon={DollarSign}
          description="Total revenue"
          isLoading={isLoading}
        />
      </motion.div>

      {/* Revenue Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Revenue Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orderStatsLoading ? (
              <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Today</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(orderStats?.todayRevenue ?? 0)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(orderStats?.weekRevenue ?? 0)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(orderStats?.monthRevenue ?? 0)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Order Status Breakdown & Low Stock Alert */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Order Status Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Order Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orderStatsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {["PENDING", "PAID", "FULFILLED", "CANCELLED"].map((status) => {
                    const count = orderStats?.statusCounts?.[status] ?? 0;
                    const total = Object.values(orderStats?.statusCounts ?? {}).reduce(
                      (a, b) => a + b,
                      0
                    );
                    const percentage = total > 0 ? (count / total) * 100 : 0;

                    return (
                      <div key={status} className="flex items-center gap-3">
                        <div className="flex items-center gap-2 w-28">
                          {getStatusIcon(status)}
                          <span className="text-sm font-medium">{status}</span>
                        </div>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              status === "CANCELLED"
                                ? "bg-destructive"
                                : status === "FULFILLED"
                                ? "bg-green-500"
                                : status === "PAID"
                                ? "bg-primary"
                                : "bg-yellow-500"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Low Stock Alert */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {stats?.lowStockCount && stats.lowStockCount > 0 ? (
            <Card className="border-yellow-500/50 bg-yellow-500/5 h-full">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <CardTitle className="text-sm font-medium text-yellow-500">
                  Low Stock Alert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {stats.lowStockCount} strain{stats.lowStockCount > 1 ? "s" : ""} running low
                  on inventory (less than 10g).
                </p>
                <Link href="/admin/inventory">
                  <Button variant="outline" size="sm">
                    View Inventory
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-green-500/50 bg-green-500/5 h-full">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <CardTitle className="text-sm font-medium text-green-500">
                  Inventory Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  All strains are well stocked. No items below 10g threshold.
                </p>
                <Link href="/admin/inventory">
                  <Button variant="outline" size="sm">
                    Manage Inventory
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>

      {/* Top Sellers & Recent Orders */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Selling Strains */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Top Sellers
              </CardTitle>
              <Link href="/admin/strains">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {topSellersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : topSellers?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No sales data yet
                </p>
              ) : (
                <div className="space-y-3">
                  {topSellers?.map((item, index) => (
                    <div
                      key={item.strain?.id ?? index}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-lg font-bold text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      {item.strain?.imageUrl ? (
                        <img
                          src={item.strain.imageUrl}
                          alt={item.strain.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Leaf className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {item.strain?.name ?? "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.totalGrams}g sold · {item.orderCount} orders
                        </p>
                      </div>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(item.totalRevenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Recent Orders
              </CardTitle>
              <Link href="/admin/orders">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentOrdersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : recentOrders?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No orders yet
                </p>
              ) : (
                <div className="space-y-2">
                  {recentOrders?.map((order) => (
                    <Link
                      key={order.id}
                      href={`/admin/orders/${order.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            #{order.id.slice(0, 8)}
                          </span>
                          <Badge variant={getStatusVariant(order.status)} className="text-xs">
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {order.email || "No email"} · {order._count.items} items
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(order.totalCents)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
