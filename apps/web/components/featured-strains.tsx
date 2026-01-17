"use client";

import { trpc } from "@/lib/trpc/client";
import { StrainCard } from "@/components/strain-card";
import { Skeleton } from "@/components/ui/skeleton";

export function FeaturedStrains() {
  const { data, isLoading } = trpc.strains.featured.useQuery();

  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[400px] rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-12">
        No strains available. Run the seeder to populate the database.
      </p>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((strain) => (
        <StrainCard key={strain.id} strain={strain} />
      ))}
    </div>
  );
}
