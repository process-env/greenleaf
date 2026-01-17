"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { StrainForm } from "@/components/admin/strain-form";

export default function NewStrainPage() {
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
        <h1 className="text-3xl font-bold tracking-tight">Add New Strain</h1>
        <p className="text-muted-foreground mt-1">
          Create a new strain in your catalog
        </p>
      </motion.div>

      {/* Form */}
      <StrainForm />
    </div>
  );
}
