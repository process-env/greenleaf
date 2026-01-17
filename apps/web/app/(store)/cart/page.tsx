"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Trash2, Minus, Plus, Leaf, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";
import { getCookie } from "cookies-next";
import { staggerContainer, staggerItem, fadeInUp, transitions } from "@/lib/motion";

export default function CartPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: cart, isLoading } = trpc.cart.get.useQuery();

  const updateItem = trpc.cart.update.useMutation({
    onSuccess: () => {
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

  const removeItem = trpc.cart.remove.useMutation({
    onSuccess: () => {
      utils.cart.get.invalidate();
      utils.cart.itemCount.invalidate();
      toast({
        title: "Item removed",
        description: "Item has been removed from your cart",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const clearCart = trpc.cart.clear.useMutation({
    onSuccess: () => {
      utils.cart.get.invalidate();
      utils.cart.itemCount.invalidate();
      toast({
        title: "Cart cleared",
        description: "All items have been removed from your cart",
      });
    },
  });

  const createCheckout = trpc.checkout.create.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast({
        title: "Checkout Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCheckout = () => {
    const sessionId = getCookie("cart_session") as string;
    if (!sessionId) {
      toast({
        title: "Error",
        description: "No cart session found",
        variant: "destructive",
      });
      return;
    }
    createCheckout.mutate({ sessionId });
  };

  const handleClearCart = () => {
    const sessionId = getCookie("cart_session") as string;
    if (sessionId) {
      clearCart.mutate({ sessionId });
    }
  };

  if (isLoading) {
    return (
      <div className="container py-12">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transitions.elegant}
        className="container py-24 text-center"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...transitions.elegant, delay: 0.1 }}
          className="h-20 w-20 rounded-full bg-card border border-border/50 flex items-center justify-center mx-auto mb-6"
        >
          <ShoppingCart className="h-10 w-10 text-muted-foreground/50" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transitions.elegant, delay: 0.2 }}
          className="text-2xl font-semibold mb-3"
        >
          Your cart is empty
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transitions.elegant, delay: 0.3 }}
          className="text-muted-foreground mb-8 max-w-sm mx-auto"
        >
          Browse our curated selection and discover your perfect strain
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transitions.elegant, delay: 0.4 }}
        >
          <Link href="/strains">
            <Button size="lg" className="gap-2">
              <Leaf className="h-4 w-4" />
              Browse Collection
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="container py-12">
      <motion.div
        initial="initial"
        animate="animate"
        variants={staggerContainer}
        className="flex flex-col gap-8"
      >
        {/* Header */}
        <motion.div
          variants={staggerItem}
          className="flex items-center justify-between"
        >
          <div>
            <p className="text-sm text-primary font-medium tracking-wide uppercase mb-2">
              Your Selection
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Shopping Cart
            </h1>
          </div>
          <Button
            variant="ghost"
            onClick={handleClearCart}
            className="text-muted-foreground hover:text-destructive"
          >
            Clear cart
          </Button>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <motion.div
            variants={staggerItem}
            className="lg:col-span-2 space-y-4"
          >
            <AnimatePresence mode="popLayout">
              {cart.items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={transitions.smooth}
                >
                  <Card className="border-border/50 hover:border-border transition-colors">
                    <CardContent className="p-5">
                      <div className="flex gap-5">
                        <div className="relative h-24 w-24 rounded-lg bg-card border border-border/50 overflow-hidden flex-shrink-0">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.strainName}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Leaf className="h-8 w-8 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link
                                href={`/strains/${item.strainSlug}`}
                                className="font-semibold hover:text-primary transition-colors"
                              >
                                {item.strainName}
                              </Link>
                              <Badge
                                variant={
                                  item.strainType === "INDICA"
                                    ? "indica"
                                    : item.strainType === "SATIVA"
                                    ? "sativa"
                                    : "hybrid"
                                }
                              >
                                {item.strainType}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem.mutate({ itemId: item.id })}
                              disabled={removeItem.isPending}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <p className="text-sm text-muted-foreground mt-1">
                            ${item.pricePerGram.toFixed(2)}/g
                          </p>

                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center border border-border/50 rounded-lg bg-background">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-l-lg rounded-r-none"
                                onClick={() =>
                                  updateItem.mutate({
                                    itemId: item.id,
                                    grams: Math.max(0.5, item.grams - 0.5),
                                  })
                                }
                                disabled={item.grams <= 0.5 || updateItem.isPending}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-14 text-center text-sm font-medium">
                                {item.grams}g
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-r-lg rounded-l-none"
                                onClick={() =>
                                  updateItem.mutate({
                                    itemId: item.id,
                                    grams: Math.min(28, item.grams + 0.5),
                                  })
                                }
                                disabled={item.grams >= 28 || updateItem.isPending}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <span className="text-lg font-semibold">
                              {formatPrice(item.subtotal)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Order Summary */}
          <motion.div variants={staggerItem}>
            <Card className="sticky top-24 border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Subtotal ({cart.items.length} {cart.items.length === 1 ? "item" : "items"})
                  </span>
                  <span>{formatPrice(cart.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-muted-foreground">At checkout</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="text-muted-foreground">At checkout</span>
                </div>
                <Separator className="bg-border/50" />
                <div className="flex justify-between">
                  <span className="font-semibold">Estimated Total</span>
                  <span className="text-xl font-semibold">{formatPrice(cart.total)}</span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 pt-2">
                <Button
                  size="xl"
                  className="w-full gap-2"
                  onClick={handleCheckout}
                  disabled={createCheckout.isPending}
                >
                  {createCheckout.isPending ? (
                    "Processing..."
                  ) : (
                    <>
                      Proceed to Checkout
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
                <Link href="/strains" className="w-full">
                  <Button variant="outline" className="w-full">
                    Continue Shopping
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
