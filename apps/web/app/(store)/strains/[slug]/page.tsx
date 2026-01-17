"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Leaf, ExternalLink, Plus, Minus, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getCookie, setCookie } from "cookies-next";
import { staggerContainer, staggerItem, fadeInUp, transitions } from "@/lib/motion";

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
      <div className="container py-12">
        <Skeleton className="h-6 w-32 mb-8" />
        <div className="grid lg:grid-cols-2 gap-12">
          <Skeleton className="aspect-square rounded-xl" />
          <div className="space-y-6">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!strain) {
    return (
      <div className="container py-24 text-center">
        <h1 className="text-2xl font-semibold mb-4">Strain not found</h1>
        <p className="text-muted-foreground mb-6">
          The strain you're looking for doesn't exist or has been removed.
        </p>
        <Link href="/strains">
          <Button>Back to collection</Button>
        </Link>
      </div>
    );
  }

  const inventory = strain.inventory[0];
  const price = inventory?.pricePerGram ?? 0;
  const inStock = inventory && inventory.quantity > 0;

  return (
    <div className="container py-12">
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={transitions.smooth}
      >
        <Link
          href="/strains"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to collection
        </Link>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
        {/* Image */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transitions.elegant, delay: 0.1 }}
          className="relative aspect-square rounded-xl bg-card border border-border/50 overflow-hidden"
        >
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
              <Leaf className="h-24 w-24 text-muted-foreground/20" />
            </div>
          )}
        </motion.div>

        {/* Details */}
        <motion.div
          initial="initial"
          animate="animate"
          variants={staggerContainer}
          className="flex flex-col gap-6"
        >
          {/* Type & Name */}
          <motion.div variants={staggerItem} className="space-y-3">
            <Badge variant={getStrainTypeVariant(strain.type)}>
              {strain.type}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
              {strain.name}
            </h1>
          </motion.div>

          {/* THC/CBD */}
          <motion.div variants={staggerItem} className="flex items-center gap-6">
            {strain.thcPercent && (
              <div>
                <span className="text-2xl font-semibold">{strain.thcPercent}%</span>
                <span className="text-sm text-muted-foreground ml-1">THC</span>
              </div>
            )}
            {strain.cbdPercent && strain.cbdPercent > 0.5 && (
              <div>
                <span className="text-2xl font-semibold">{strain.cbdPercent}%</span>
                <span className="text-sm text-muted-foreground ml-1">CBD</span>
              </div>
            )}
          </motion.div>

          {/* Description */}
          {strain.description && (
            <motion.p
              variants={staggerItem}
              className="text-muted-foreground leading-relaxed"
            >
              {strain.description}
            </motion.p>
          )}

          {/* Effects */}
          {strain.effects.length > 0 && (
            <motion.div variants={staggerItem} className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Effects
              </h3>
              <div className="flex flex-wrap gap-2">
                {strain.effects.map((effect) => (
                  <Badge key={effect} variant="effect">
                    {effect}
                  </Badge>
                ))}
              </div>
            </motion.div>
          )}

          {/* Flavors */}
          {strain.flavors.length > 0 && (
            <motion.div variants={staggerItem} className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Flavors
              </h3>
              <div className="flex flex-wrap gap-2">
                {strain.flavors.map((flavor) => (
                  <Badge key={flavor} variant="outline">
                    {flavor}
                  </Badge>
                ))}
              </div>
            </motion.div>
          )}

          {/* Divider */}
          <motion.div
            variants={staggerItem}
            className="border-t border-border/50"
          />

          {/* Purchase Section */}
          <motion.div variants={staggerItem} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-3xl font-semibold">${price.toFixed(2)}</span>
                <span className="text-muted-foreground ml-1">/gram</span>
              </div>
              {inStock ? (
                <Badge variant="success">{inventory.quantity}g available</Badge>
              ) : (
                <Badge variant="destructive">Out of stock</Badge>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* Quantity selector */}
              <div className="flex items-center border border-border/50 rounded-lg bg-card">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 rounded-l-lg rounded-r-none"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-16 text-center font-medium">{quantity}g</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 rounded-r-lg rounded-l-none"
                  onClick={() =>
                    setQuantity(Math.min(inventory?.quantity ?? 28, quantity + 1))
                  }
                  disabled={quantity >= (inventory?.quantity ?? 28)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Add to cart button */}
              <Button
                size="xl"
                onClick={handleAddToCart}
                disabled={!inStock || addToCart.isPending}
                className="flex-1 gap-2"
              >
                <ShoppingBag className="h-5 w-5" />
                Add to Cart — ${(price * quantity).toFixed(2)}
              </Button>
            </div>
          </motion.div>

          {/* Leafly link */}
          {strain.leaflyUrl && (
            <motion.div variants={staggerItem}>
              <a
                href={strain.leaflyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View on Leafly
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Similar Strains */}
      {similar && similar.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ ...transitions.elegant, delay: 0.2 }}
          className="mt-24"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-sm text-primary font-medium tracking-wide uppercase mb-2">
                You might also like
              </p>
              <h2 className="text-3xl font-semibold tracking-tight">
                Similar Strains
              </h2>
            </div>
            <Link href="/strains">
              <Button variant="ghost">View all</Button>
            </Link>
          </div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {similar.map((s) => (
              <motion.div key={s.id} variants={staggerItem}>
                <Link href={`/strains/${s.slug}`}>
                  <Card className="group cursor-pointer hover:border-border transition-colors">
                    <CardContent className="p-5">
                      <Badge
                        variant={getStrainTypeVariant(s.type)}
                        className="mb-3"
                      >
                        {s.type}
                      </Badge>
                      <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                        {s.name}
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {s.effects.slice(0, 2).map((effect) => (
                          <Badge key={effect} variant="effect" className="text-xs">
                            {effect}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
