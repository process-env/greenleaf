"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Leaf, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export default function AdminStrainsPage() {
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.strains.list.useQuery({
    search: search || undefined,
  });

  const deleteMutation = trpc.admin.strains.delete.useMutation({
    onSuccess: () => {
      utils.admin.strains.list.invalidate();
      setDeleteId(null);
    },
  });

  const strainToDelete = data?.strains.find((s) => s.id === deleteId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Strains</h1>
          <p className="text-muted-foreground mt-1">
            Manage your strain catalog
          </p>
        </div>
        <Link href="/admin/strains/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Strain
          </Button>
        </Link>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search strains..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 max-w-sm"
        />
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
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>THC %</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeletons
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
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-20 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : data?.strains.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Leaf className="h-8 w-8 mb-2" />
                    <p>No strains found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data?.strains.map((strain) => {
                const inventory = strain.inventory[0];
                return (
                  <motion.tr
                    key={strain.id}
                    variants={staggerItem}
                    className="border-b border-border/50 transition-colors hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="h-10 w-10 rounded bg-muted overflow-hidden">
                        {strain.imageUrl ? (
                          <Image
                            src={strain.imageUrl}
                            alt={strain.name}
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
                    <TableCell className="font-medium">{strain.name}</TableCell>
                    <TableCell>
                      <Badge variant={getStrainTypeVariant(strain.type)}>
                        {strain.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {strain.thcPercent != null ? `${strain.thcPercent}%` : "-"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          inventory && inventory.quantity < 10
                            ? "text-yellow-500"
                            : ""
                        }
                      >
                        {inventory?.quantity ?? 0}g
                      </span>
                    </TableCell>
                    <TableCell>
                      ${inventory?.pricePerGram?.toFixed(2) ?? "0.00"}/g
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/strains/${strain.id}`}>
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(strain.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })
            )}
          </TableBody>
        </Table>
      </motion.div>

      {/* Pagination info */}
      {data && (
        <div className="text-sm text-muted-foreground">
          Showing {data.strains.length} of {data.total} strains
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Strain</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{strainToDelete?.name}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
