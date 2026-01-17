"use client";

import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { StrainType } from "@greenleaf/db";

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

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold">Strain Catalog</h1>
          <p className="text-muted-foreground">
            Browse our selection of premium cannabis strains
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search strains..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={type}
            onValueChange={(v) => setType(v as StrainType | "ALL")}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Strain type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="INDICA">Indica</SelectItem>
              <SelectItem value="SATIVA">Sativa</SelectItem>
              <SelectItem value="HYBRID">Hybrid</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1">
                Active
              </Badge>
            )}
          </Button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="rounded-lg border p-4 space-y-6">
            {/* Effects Filter */}
            <div className="space-y-3">
              <Label>Effects</Label>
              <div className="flex flex-wrap gap-2">
                {effects?.map((effect) => (
                  <Badge
                    key={effect}
                    variant={
                      selectedEffects.includes(effect) ? "default" : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => toggleEffect(effect)}
                  >
                    {effect}
                  </Badge>
                ))}
              </div>
            </div>

            {/* THC Range */}
            <div className="space-y-3">
              <Label>
                THC Range: {thcRange[0]}% - {thcRange[1]}%
              </Label>
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
              <Button variant="ghost" onClick={clearFilters}>
                Clear all filters
              </Button>
            )}
          </div>
        )}

        {/* Results Count */}
        {data && (
          <p className="text-sm text-muted-foreground">
            Showing {data.strains.length} strains
          </p>
        )}

        {/* Strain Grid */}
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[400px] rounded-lg" />
            ))}
          </div>
        ) : data?.strains.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No strains found matching your criteria.
            </p>
            {hasActiveFilters && (
              <Button variant="link" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data?.strains.map((strain) => (
              <StrainCard key={strain.id} strain={strain} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
