"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Package, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/utils";
import { deleteCookie } from "cookies-next";
import { useEffect } from "react";

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const { data: order, isLoading, error } = trpc.checkout.verify.useQuery(
    { sessionId: sessionId ?? "" },
    { enabled: !!sessionId }
  );

  // Clear cart cookie on successful checkout
  useEffect(() => {
    if (order?.status === "PAID") {
      deleteCookie("cart_session");
    }
  }, [order?.status]);

  if (!sessionId) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Invalid session</h1>
        <Link href="/">
          <Button>Return to home</Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container py-8 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
          <Skeleton className="h-8 w-64 mx-auto mb-2" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Order not found</h1>
        <p className="text-muted-foreground mb-6">
          We couldn&apos;t find this order. Please contact support if you believe this is an error.
        </p>
        <Link href="/">
          <Button>Return to home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
        <p className="text-muted-foreground">
          Thank you for your order. We&apos;ll send you an email confirmation shortly.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Order Details</CardTitle>
            <Badge
              variant={order.status === "PAID" ? "default" : "secondary"}
            >
              {order.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Order ID: {order.id}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{item.strainName}</p>
                  <p className="text-sm text-muted-foreground">{item.grams}g</p>
                </div>
              </div>
              <span className="font-medium">{formatPrice(item.priceCents)}</span>
            </div>
          ))}

          <Separator />

          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatPrice(order.totalCents)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <Link href="/strains" className="flex-1">
          <Button variant="outline" className="w-full">
            Continue Shopping
          </Button>
        </Link>
        <Link href="/" className="flex-1">
          <Button className="w-full">
            Return Home
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
