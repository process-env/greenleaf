"use client";

import Link from "next/link";
import Image from "next/image";
import { Leaf } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Strain, Inventory } from "@greenleaf/db";

interface StrainCardProps {
  strain: Strain & { inventory: Inventory[] };
}

function getStrainTypeVariant(type: string) {
  switch (type) {
    case "INDICA":
      return "indica";
    case "SATIVA":
      return "sativa";
    case "HYBRID":
      return "hybrid";
    default:
      return "secondary";
  }
}

export function StrainCard({ strain }: StrainCardProps) {
  const inventory = strain.inventory[0];
  const price = inventory?.pricePerGram ?? 0;
  const inStock = inventory && inventory.quantity > 0;

  return (
    <Card className="overflow-hidden flex flex-col h-full">
      <div className="relative aspect-square bg-muted">
        {strain.imageUrl ? (
          <Image
            src={strain.imageUrl}
            alt={strain.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Leaf className="h-16 w-16 text-muted-foreground/50" />
          </div>
        )}
        <Badge
          variant={getStrainTypeVariant(strain.type) as "indica" | "sativa" | "hybrid"}
          className="absolute top-3 right-3"
        >
          {strain.type}
        </Badge>
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="line-clamp-1">{strain.name}</CardTitle>
        <CardDescription className="flex items-center gap-2">
          {strain.thcPercent && (
            <span className="text-xs font-medium">
              THC: {strain.thcPercent}%
            </span>
          )}
          {strain.cbdPercent && strain.cbdPercent > 0.5 && (
            <span className="text-xs font-medium">
              CBD: {strain.cbdPercent}%
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pb-2">
        {strain.effects.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {strain.effects.slice(0, 3).map((effect) => (
              <Badge key={effect} variant="outline" className="text-xs">
                {effect}
              </Badge>
            ))}
          </div>
        )}
        {strain.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {strain.description}
          </p>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-2">
        <div>
          <span className="text-lg font-bold">${price.toFixed(2)}</span>
          <span className="text-sm text-muted-foreground">/g</span>
        </div>
        <Link href={`/strains/${strain.slug}`}>
          <Button size="sm" disabled={!inStock}>
            {inStock ? "View Details" : "Out of Stock"}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
