"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { StrainForm } from "@/components/admin/strain-form";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";

export default function EditStrainPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: strain, isLoading, error } = trpc.admin.strains.get.useQuery({ id });

  // Handle error or not-found state
  if (error || (!isLoading && !strain)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p className="text-lg">Strain not found</p>
        <Link
          href="/admin/strains"
          className="mt-4 text-primary hover:underline"
        >
          Back to Strains
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link
          href="/admin/strains"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Strains
        </Link>
        {isLoading ? (
          <Skeleton className="h-9 w-64" />
        ) : (
          <h1 className="text-3xl font-bold tracking-tight">
            Edit {strain?.name}
          </h1>
        )}
        <p className="text-muted-foreground mt-1">
          Update strain information
        </p>
      </motion.div>

      {/* Form */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : strain ? (
        <StrainForm initialData={strain} />
      ) : null}
    </div>
  );
}
