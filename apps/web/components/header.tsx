"use client";

import Link from "next/link";
import { ShoppingCart, Leaf, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";

export function Header() {
  const { data: itemCount } = trpc.cart.itemCount.useQuery();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Leaf className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold text-primary">GreenLeaf</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/strains"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Strains
          </Link>
          <Link
            href="/budtender"
            className="text-sm font-medium transition-colors hover:text-primary flex items-center gap-1"
          >
            <MessageCircle className="h-4 w-4" />
            AI Budtender
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/budtender">
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <MessageCircle className="h-4 w-4 mr-2" />
              Ask AI
            </Button>
          </Link>
          <Link href="/cart" className="relative">
            <Button variant="ghost" size="icon">
              <ShoppingCart className="h-5 w-5" />
              {itemCount && itemCount > 0 && (
                <Badge
                  variant="default"
                  className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {itemCount}
                </Badge>
              )}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
