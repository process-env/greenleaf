"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/client";
import { StrainCard } from "@/components/strain-card";
import { SkeletonCard } from "@/components/ui/skeleton";
import { StrainType } from "@greenleaf/db";
import { staggerContainer, staggerItem, fadeInUp, transitions } from "@/lib/motion";

export default function StrainsPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<StrainType | "ALL">("ALL");
  const [selectedEffects, setSelectedEffects] = useState<string[]>([]);
  const [thcRange, setThcRange] = useState([0, 30]);
  const [showFilters, setShowFilters] = useState(false);

  const { data: effects } = trpc.strains.effects.useQuery();

  const { data, isLoading } = trpc.strains.list.useQuery({
    type: type === "ALL" ? undefined : type,
    effects: selectedEffects.length > 0 ? selectedEffects : undefined,
    minThc: thcRange[0] > 0 ? thcRange[0] : undefined,
    maxThc: thcRange[1] < 30 ? thcRange[1] : undefined,
    search: search || undefined,
    limit: 50,
  });

  const toggleEffect = (effect: string) => {
    setSelectedEffects((prev) =>
      prev.includes(effect)
        ? prev.filter((e) => e !== effect)
        : [...prev, effect]
    );
  };

  const clearFilters = () => {
    setSearch("");
    setType("ALL");
    setSelectedEffects([]);
    setThcRange([0, 30]);
  };

  const hasActiveFilters =
    type !== "ALL" ||
    selectedEffects.length > 0 ||
    thcRange[0] > 0 ||
    thcRange[1] < 30 ||
    search;

  const activeFilterCount = [
    type !== "ALL",
    selectedEffects.length > 0,
    thcRange[0] > 0 || thcRange[1] < 30,
    !!search,
  ].filter(Boolean).length;

  return (
    <div className="container py-12 md:py-16">
      <motion.div
        initial="initial"
        animate="animate"
        variants={staggerContainer}
        className="flex flex-col gap-8"
      >
        {/* Header */}
        <motion.div variants={staggerItem} className="flex flex-col gap-3">
          <p className="text-sm text-primary font-medium tracking-wide uppercase">
            Our Collection
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            Strain Catalog
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl">
            Explore our curated selection of premium cannabis strains
          </p>
        </motion.div>

        {/* Search and Filter Bar */}
        <motion.div
          variants={staggerItem}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search strains..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-11 bg-card border-border/50"
            />
          </div>
          <Select
            value={type}
            onValueChange={(v) => setType(v as StrainType | "ALL")}
          >
            <SelectTrigger className="w-full sm:w-[160px] h-11 bg-card border-border/50">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="INDICA">Indica</SelectItem>
              <SelectItem value="SATIVA">Sativa</SelectItem>
              <SelectItem value="HYBRID">Hybrid</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={showFilters ? "secondary" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2 h-11"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </motion.div>

        {/* Expanded Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={transitions.smooth}
              className="overflow-hidden"
            >
              <div className="rounded-lg border border-border/50 bg-card p-6 space-y-6">
                {/* Effects Filter */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Effects</Label>
                  <div className="flex flex-wrap gap-2">
                    {effects?.map((effect) => (
                      <Badge
                        key={effect}
                        variant={selectedEffects.includes(effect) ? "default" : "outline"}
                        className="cursor-pointer transition-colors hover:bg-primary/20"
                        onClick={() => toggleEffect(effect)}
                      >
                        {effect}
                        {selectedEffects.includes(effect) && (
                          <X className="h-3 w-3 ml-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* THC Range */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">THC Range</Label>
                    <span className="text-sm text-muted-foreground">
                      {thcRange[0]}% — {thcRange[1]}%
                    </span>
                  </div>
                  <Slider
                    value={thcRange}
                    onValueChange={setThcRange}
                    min={0}
                    max={30}
                    step={1}
                    className="w-full max-w-md"
                  />
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    onClick={clearFilters}
                    className="text-muted-foreground"
                  >
                    Clear all filters
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Count */}
        <motion.div variants={staggerItem}>
          {data && (
            <p className="text-sm text-muted-foreground">
              {data.strains.length} {data.strains.length === 1 ? "strain" : "strains"} found
            </p>
          )}
        </motion.div>

        {/* Strain Grid */}
        {isLoading ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : data?.strains.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <p className="text-muted-foreground mb-4">
              No strains found matching your criteria.
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {data?.strains.map((strain) => (
              <motion.div key={strain.id} variants={staggerItem}>
                <StrainCard strain={strain} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
