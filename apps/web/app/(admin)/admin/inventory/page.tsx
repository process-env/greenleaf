"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Package, Leaf, AlertTriangle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { staggerContainer, staggerItem } from "@/lib/motion";

function getStrainTypeVariant(type: string): "indica" | "sativa" | "hybrid" {
  switch (type) {
    case "INDICA":
      return "indica";
    case "SATIVA":
      return "sativa";
    case "HYBRID":
      return "hybrid";
    default:
      return "hybrid";
  }
}

interface EditingState {
  id: string;
  field: "quantity" | "price";
  value: string;
}

export default function AdminInventoryPage() {
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [editing, setEditing] = useState<EditingState | null>(null);

  const utils = trpc.useUtils();
  const { data: inventory, isLoading } = trpc.admin.inventory.list.useQuery({
    lowStockOnly,
  });

  const updateMutation = trpc.admin.inventory.update.useMutation({
    onSuccess: () => {
      utils.admin.inventory.list.invalidate();
      utils.admin.stats.invalidate();
      setEditing(null);
    },
  });

  const handleSave = (strainId: string) => {
    if (!editing) return;

    const numValue = parseFloat(editing.value);
    if (isNaN(numValue) || numValue < 0) return;

    updateMutation.mutate({
      strainId,
      ...(editing.field === "quantity" ? { quantity: numValue } : { pricePerGram: numValue }),
    });
  };

  const lowStockCount = inventory?.filter((i) => i.quantity < 10).length ?? 0;
  const totalStock = inventory?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground mt-1">
          Manage stock levels and pricing
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid gap-4 md:grid-cols-2"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Stock
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{totalStock}g</div>
            )}
          </CardContent>
        </Card>

        <Card className={lowStockCount > 0 ? "border-yellow-500/50 bg-yellow-500/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className={`text-sm font-medium ${lowStockCount > 0 ? "text-yellow-500" : "text-muted-foreground"}`}>
              Low Stock Items
            </CardTitle>
            <AlertTriangle className={`h-4 w-4 ${lowStockCount > 0 ? "text-yellow-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className={`text-2xl font-bold ${lowStockCount > 0 ? "text-yellow-500" : ""}`}>
                {lowStockCount}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Filter */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="flex items-center gap-2"
      >
        <Checkbox
          id="lowStock"
          checked={lowStockOnly}
          onCheckedChange={(checked) => setLowStockOnly(checked === true)}
        />
        <label
          htmlFor="lowStock"
          className="text-sm text-muted-foreground cursor-pointer"
        >
          Show only low stock items (&lt;10g)
        </label>
      </motion.div>

      {/* Table */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="border rounded-lg"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Image</TableHead>
              <TableHead>Strain</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Stock (g)</TableHead>
              <TableHead>Price ($/g)</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-10 w-10 rounded" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                </TableRow>
              ))
            ) : inventory?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Package className="h-8 w-8 mb-2" />
                    <p>No inventory found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              inventory?.map((item) => {
                const isLowStock = item.quantity < 10;
                const isEditingQuantity = editing?.id === item.strainId && editing.field === "quantity";
                const isEditingPrice = editing?.id === item.strainId && editing.field === "price";

                return (
                  <motion.tr
                    key={item.id}
                    variants={staggerItem}
                    className="border-b border-border/50 transition-colors hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="h-10 w-10 rounded bg-muted overflow-hidden">
                        {item.strain.imageUrl ? (
                          <Image
                            src={item.strain.imageUrl}
                            alt={item.strain.name}
                            width={40}
                            height={40}
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Leaf className="h-4 w-4 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.strain.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStrainTypeVariant(item.strain.type)}>
                        {item.strain.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isEditingQuantity ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={editing.value}
                            onChange={(e) =>
                              setEditing({ ...editing, value: e.target.value })
                            }
                            className="w-20 h-8"
                            min="0"
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleSave(item.strainId)}
                            disabled={updateMutation.isPending}
                          >
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditing(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            setEditing({
                              id: item.strainId,
                              field: "quantity",
                              value: item.quantity.toString(),
                            })
                          }
                          className={`hover:underline ${isLowStock ? "text-yellow-500" : ""}`}
                        >
                          {item.quantity}
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditingPrice ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={editing.value}
                            onChange={(e) =>
                              setEditing({ ...editing, value: e.target.value })
                            }
                            className="w-20 h-8"
                            min="0"
                            step="0.01"
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleSave(item.strainId)}
                            disabled={updateMutation.isPending}
                          >
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditing(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            setEditing({
                              id: item.strainId,
                              field: "price",
                              value: item.pricePerGram.toString(),
                            })
                          }
                          className="hover:underline"
                        >
                          ${item.pricePerGram.toFixed(2)}
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      {isLowStock ? (
                        <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-500 border-green-500/50">
                          In Stock
                        </Badge>
                      )}
                    </TableCell>
                  </motion.tr>
                );
              })
            )}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
}
