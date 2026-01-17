"use client";

import Link from "next/link";
import Image from "next/image";
import { Leaf, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hoverScale, hoverLift, tapScale, transitions } from "@/lib/motion";
import type { Strain, Inventory } from "@greenleaf/db";

interface StrainCardProps {
  strain: Strain & { inventory: Inventory[] };
}

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

export function StrainCard({ strain }: StrainCardProps) {
  const inventory = strain.inventory[0];
  const price = inventory?.pricePerGram ?? 0;
  const inStock = inventory && inventory.quantity > 0;

  return (
    <Link href={`/strains/${strain.slug}`} className="block h-full">
      <motion.div
        whileHover={{ ...hoverScale, y: -4 }}
        whileTap={tapScale}
        transition={transitions.fast}
        className="h-full"
      >
        <Card className="overflow-hidden flex flex-col h-full group cursor-pointer hover:border-border">
          {/* Image container */}
          <div className="relative aspect-[4/3] bg-muted overflow-hidden">
            {strain.imageUrl ? (
              <Image
                src={strain.imageUrl}
                alt={strain.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-card">
                <Leaf className="h-12 w-12 text-muted-foreground/30" />
              </div>
            )}

            {/* Type badge - top right */}
            <Badge
              variant={getStrainTypeVariant(strain.type)}
              className="absolute top-4 right-4"
            >
              {strain.type}
            </Badge>

            {/* Hover overlay with arrow */}
            <div className="absolute inset-0 bg-background/0 group-hover:bg-background/10 transition-colors duration-300 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileHover={{ opacity: 1, scale: 1 }}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              >
                <div className="h-12 w-12 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
              </motion.div>
            </div>
          </div>

          {/* Content */}
          <CardContent className="flex-1 p-5">
            {/* Name and THC */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <h3 className="font-semibold text-lg leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                {strain.name}
              </h3>
              {strain.thcPercent && (
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  {strain.thcPercent}% THC
                </span>
              )}
            </div>

            {/* Effects */}
            {strain.effects.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {strain.effects.slice(0, 3).map((effect) => (
                  <Badge key={effect} variant="effect" className="text-xs">
                    {effect}
                  </Badge>
                ))}
              </div>
            )}

            {/* Description */}
            {strain.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {strain.description}
              </p>
            )}
          </CardContent>

          {/* Footer */}
          <CardFooter className="p-5 pt-0 flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-semibold">${price.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground">/g</span>
            </div>

            {!inStock && (
              <Badge variant="outline" className="text-muted-foreground">
                Out of Stock
              </Badge>
            )}
          </CardFooter>
        </Card>
      </motion.div>
    </Link>
  );
}
