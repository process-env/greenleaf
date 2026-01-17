"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Leaf, ExternalLink, Plus, Minus } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getCookie, setCookie } from "cookies-next";

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

export default function StrainDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [quantity, setQuantity] = useState(1);
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: strain, isLoading } = trpc.strains.bySlug.useQuery({ slug });
  const { data: similar } = trpc.strains.similarByVector.useQuery(
    { strainId: strain?.id ?? "" },
    { enabled: !!strain?.id }
  );

  const addToCart = trpc.cart.add.useMutation({
    onSuccess: () => {
      toast({
        title: "Added to cart",
        description: `${quantity}g of ${strain?.name} added to your cart`,
      });
      utils.cart.get.invalidate();
      utils.cart.itemCount.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddToCart = () => {
    if (!strain) return;

    let sessionId = getCookie("cart_session") as string;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      setCookie("cart_session", sessionId, { maxAge: 60 * 60 * 24 * 7 });
    }

    addToCart.mutate({
      strainId: strain.id,
      grams: quantity,
      sessionId,
    });
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!strain) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Strain not found</h1>
        <Link href="/strains">
          <Button>Back to catalog</Button>
        </Link>
      </div>
    );
  }

  const inventory = strain.inventory[0];
  const price = inventory?.pricePerGram ?? 0;
  const inStock = inventory && inventory.quantity > 0;

  return (
    <div className="container py-8">
      <Link
        href="/strains"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to catalog
      </Link>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Image */}
        <div className="relative aspect-square rounded-lg bg-muted overflow-hidden">
          {strain.imageUrl ? (
            <Image
              src={strain.imageUrl}
              alt={strain.name}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Leaf className="h-24 w-24 text-muted-foreground/50" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <Badge
              variant={getStrainTypeVariant(strain.type) as "indica" | "sativa" | "hybrid"}
              className="mb-2"
            >
              {strain.type}
            </Badge>
            <h1 className="text-3xl font-bold">{strain.name}</h1>
          </div>

          <div className="flex items-center gap-4 text-sm">
            {strain.thcPercent && (
              <div className="flex items-center gap-1">
                <span className="font-medium">THC:</span>
                <span>{strain.thcPercent}%</span>
              </div>
            )}
            {strain.cbdPercent && strain.cbdPercent > 0.5 && (
              <div className="flex items-center gap-1">
                <span className="font-medium">CBD:</span>
                <span>{strain.cbdPercent}%</span>
              </div>
            )}
          </div>

          {strain.description && (
            <p className="text-muted-foreground">{strain.description}</p>
          )}

          {strain.effects.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Effects</h3>
              <div className="flex flex-wrap gap-2">
                {strain.effects.map((effect) => (
                  <Badge key={effect} variant="secondary">
                    {effect}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {strain.flavors.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Flavors</h3>
              <div className="flex flex-wrap gap-2">
                {strain.flavors.map((flavor) => (
                  <Badge key={flavor} variant="outline">
                    {flavor}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Purchase Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-3xl font-bold">${price.toFixed(2)}</span>
                <span className="text-muted-foreground">/gram</span>
              </div>
              {inStock ? (
                <Badge variant="secondary">{inventory.quantity}g in stock</Badge>
              ) : (
                <Badge variant="destructive">Out of stock</Badge>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center border rounded-md">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center">{quantity}g</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setQuantity(Math.min(inventory?.quantity ?? 28, quantity + 1))
                  }
                  disabled={quantity >= (inventory?.quantity ?? 28)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button
                onClick={handleAddToCart}
                disabled={!inStock || addToCart.isPending}
                className="flex-1"
              >
                Add to Cart - ${(price * quantity).toFixed(2)}
              </Button>
            </div>
          </div>

          {strain.leaflyUrl && (
            <a
              href={strain.leaflyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              View on Leafly
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>

      {/* Similar Strains */}
      {similar && similar.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Similar Strains</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {similar.map((s) => (
              <Card key={s.id}>
                <CardHeader className="pb-2">
                  <Badge
                    variant={getStrainTypeVariant(s.type) as "indica" | "sativa" | "hybrid"}
                    className="w-fit mb-2"
                  >
                    {s.type}
                  </Badge>
                  <CardTitle className="text-lg">{s.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {s.effects.slice(0, 2).map((effect) => (
                      <Badge key={effect} variant="outline" className="text-xs">
                        {effect}
                      </Badge>
                    ))}
                  </div>
                  <Link href={`/strains/${s.slug}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      View Details
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
