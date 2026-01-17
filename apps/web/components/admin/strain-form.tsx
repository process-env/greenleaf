"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";

interface StrainFormData {
  name: string;
  slug: string;
  type: "INDICA" | "SATIVA" | "HYBRID";
  thcPercent: number | null;
  cbdPercent: number | null;
  effects: string[];
  flavors: string[];
  description: string | null;
  imageUrl: string | null;
}

interface StrainFormProps {
  initialData?: StrainFormData & { id: string };
}

const COMMON_EFFECTS = [
  "Relaxed",
  "Happy",
  "Euphoric",
  "Uplifted",
  "Creative",
  "Focused",
  "Energetic",
  "Sleepy",
  "Hungry",
  "Talkative",
];

const COMMON_FLAVORS = [
  "Earthy",
  "Citrus",
  "Pine",
  "Sweet",
  "Berry",
  "Diesel",
  "Pungent",
  "Woody",
  "Tropical",
  "Spicy",
];

export function StrainForm({ initialData }: StrainFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [formData, setFormData] = useState<StrainFormData>({
    name: initialData?.name ?? "",
    slug: initialData?.slug ?? "",
    type: initialData?.type ?? "HYBRID",
    thcPercent: initialData?.thcPercent ?? null,
    cbdPercent: initialData?.cbdPercent ?? null,
    effects: initialData?.effects ?? [],
    flavors: initialData?.flavors ?? [],
    description: initialData?.description ?? "",
    imageUrl: initialData?.imageUrl ?? "",
  });

  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const createMutation = trpc.admin.strains.create.useMutation({
    onSuccess: () => {
      utils.admin.strains.list.invalidate();
      router.push("/admin/strains");
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const updateMutation = trpc.admin.strains.update.useMutation({
    onSuccess: () => {
      utils.admin.strains.list.invalidate();
      router.push("/admin/strains");
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const data = {
      ...formData,
      description: formData.description || null,
      imageUrl: formData.imageUrl || null,
    };

    if (isEditing && initialData) {
      updateMutation.mutate({ id: initialData.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const generateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    setFormData({ ...formData, slug });
  };

  const toggleEffect = (effect: string) => {
    setFormData({
      ...formData,
      effects: formData.effects.includes(effect)
        ? formData.effects.filter((e) => e !== effect)
        : [...formData.effects, effect],
    });
  };

  const toggleFlavor = (flavor: string) => {
    setFormData({
      ...formData,
      flavors: formData.flavors.includes(flavor)
        ? formData.flavors.filter((f) => f !== flavor)
        : [...formData.flavors, flavor],
    });
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {error && (
        <div className="p-4 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Blue Dream"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <div className="flex gap-2">
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  placeholder="e.g., blue-dream"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateSlug}
                >
                  Generate
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: "INDICA" | "SATIVA" | "HYBRID") =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INDICA">Indica</SelectItem>
                  <SelectItem value="SATIVA">Sativa</SelectItem>
                  <SelectItem value="HYBRID">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="thc">THC %</Label>
              <Input
                id="thc"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.thcPercent ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    thcPercent: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                placeholder="e.g., 22.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cbd">CBD %</Label>
              <Input
                id="cbd"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.cbdPercent ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cbdPercent: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                placeholder="e.g., 0.5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input
              id="imageUrl"
              type="url"
              value={formData.imageUrl ?? ""}
              onChange={(e) =>
                setFormData({ ...formData, imageUrl: e.target.value })
              }
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={formData.description ?? ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe the strain..."
              rows={4}
              className="w-full px-3 py-2 text-sm bg-background border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Effects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {COMMON_EFFECTS.map((effect) => (
              <button
                key={effect}
                type="button"
                onClick={() => toggleEffect(effect)}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  formData.effects.includes(effect)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border/50 hover:border-primary/50"
                }`}
              >
                {effect}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Flavors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {COMMON_FLAVORS.map((flavor) => (
              <button
                key={flavor}
                type="button"
                onClick={() => toggleFlavor(flavor)}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  formData.flavors.includes(flavor)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border/50 hover:border-primary/50"
                }`}
              >
                {flavor}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEditing ? "Update Strain" : "Create Strain"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/strains")}
        >
          Cancel
        </Button>
      </div>
    </motion.form>
  );
}
