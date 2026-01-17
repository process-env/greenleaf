"use client";

import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc/client";
import { StrainCard } from "@/components/strain-card";
import { SkeletonCard } from "@/components/ui/skeleton";
import { staggerContainer, staggerItem } from "@/lib/motion";

export function FeaturedStrains() {
  const { data, isLoading } = trpc.strains.featured.useQuery();

  if (isLoading) {
    return (
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">
          No strains available. Run the seeder to populate the database.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: "-50px" }}
      variants={staggerContainer}
      className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
    >
      {data.map((strain) => (
        <motion.div key={strain.id} variants={staggerItem}>
          <StrainCard strain={strain} />
        </motion.div>
      ))}
    </motion.div>
  );
}
