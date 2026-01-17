import Link from "next/link";
import { ArrowRight, Leaf, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeaturedStrains } from "@/components/featured-strains";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-greenleaf-50 to-background py-20 md:py-32">
        <div className="container flex flex-col items-center text-center gap-8">
          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            AI-Powered Recommendations
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Premium Cannabis,
            <br />
            <span className="text-primary">Perfectly Matched</span>
          </h1>

          <p className="max-w-[600px] text-lg text-muted-foreground">
            Discover your perfect strain with our AI budtender. Browse our
            curated selection of premium indica, sativa, and hybrid strains.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/strains">
              <Button size="lg" className="gap-2">
                <Leaf className="h-5 w-5" />
                Browse Strains
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/budtender">
              <Button size="lg" variant="outline" className="gap-2">
                <MessageCircle className="h-5 w-5" />
                Ask AI Budtender
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Strains */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="flex flex-col gap-4 mb-10">
            <h2 className="text-3xl font-bold tracking-tight">
              Featured Strains
            </h2>
            <p className="text-muted-foreground">
              Our most popular and highly-rated cannabis strains
            </p>
          </div>
          <FeaturedStrains />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-muted/50">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col gap-4 p-6 rounded-lg bg-background border">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Leaf className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Curated Selection</h3>
              <p className="text-muted-foreground">
                Hand-picked strains with detailed profiles including effects,
                flavors, and potency levels.
              </p>
            </div>

            <div className="flex flex-col gap-4 p-6 rounded-lg bg-background border">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">AI Budtender</h3>
              <p className="text-muted-foreground">
                Get personalized recommendations from our AI assistant based on
                your preferences and desired effects.
              </p>
            </div>

            <div className="flex flex-col gap-4 p-6 rounded-lg bg-background border">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Vector Search</h3>
              <p className="text-muted-foreground">
                Advanced semantic search powered by AI embeddings finds strains
                that match what you&apos;re looking for.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="rounded-2xl bg-primary p-8 md:p-12 text-center text-primary-foreground">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Not sure what you&apos;re looking for?
            </h2>
            <p className="text-primary-foreground/80 mb-6 max-w-lg mx-auto">
              Our AI budtender can help you find the perfect strain based on
              your desired effects, flavor preferences, and experience level.
            </p>
            <Link href="/budtender">
              <Button
                size="lg"
                variant="secondary"
                className="gap-2"
              >
                <MessageCircle className="h-5 w-5" />
                Chat with AI Budtender
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
