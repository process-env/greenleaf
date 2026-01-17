"use client";

import Link from "next/link";
import { ArrowRight, Leaf, MessageCircle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FeaturedStrains } from "@/components/featured-strains";
import { fadeInUp, staggerContainer, staggerItem, transitions } from "@/lib/motion";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section - Minimal, bold typography */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-card/50" />

        {/* Subtle ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />

        <motion.div
          className="container relative z-10 flex flex-col items-center text-center gap-8 py-20"
          initial="initial"
          animate="animate"
          variants={staggerContainer}
        >
          {/* Subtle badge */}
          <motion.div
            variants={staggerItem}
            className="flex items-center gap-2 rounded-full border border-border/50 bg-card/50 backdrop-blur-sm px-4 py-2 text-sm text-muted-foreground"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <span>AI-Powered Recommendations</span>
          </motion.div>

          {/* Main headline - Large, elegant typography */}
          <motion.h1
            variants={staggerItem}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold tracking-tight text-balance"
          >
            Premium Cannabis
            <br />
            <span className="text-gold">Curated for You</span>
          </motion.h1>

          {/* Subtitle - Refined, minimal */}
          <motion.p
            variants={staggerItem}
            className="max-w-[540px] text-lg md:text-xl text-muted-foreground leading-relaxed"
          >
            Discover exceptional strains with our AI-powered budtender.
            A refined selection for the discerning connoisseur.
          </motion.p>

          {/* CTA buttons - Clean, minimal */}
          <motion.div
            variants={staggerItem}
            className="flex flex-col sm:flex-row gap-4 mt-4"
          >
            <Link href="/strains">
              <Button size="xl" className="gap-3 group">
                <Leaf className="h-5 w-5" />
                Explore Collection
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/budtender">
              <Button size="xl" variant="outline" className="gap-3">
                <MessageCircle className="h-5 w-5" />
                Meet the AI Budtender
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-6 h-10 border border-border/50 rounded-full flex items-start justify-center p-2"
          >
            <div className="w-1 h-2 bg-muted-foreground/50 rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* Featured Strains - Clean section */}
      <section className="py-24 md:py-32">
        <div className="container">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="flex flex-col gap-4 mb-16"
          >
            <motion.p variants={staggerItem} className="text-sm text-primary font-medium tracking-wide uppercase">
              Our Collection
            </motion.p>
            <motion.h2 variants={staggerItem} className="text-4xl md:text-5xl font-semibold tracking-tight">
              Featured Strains
            </motion.h2>
            <motion.p variants={staggerItem} className="text-muted-foreground text-lg max-w-xl">
              Hand-selected premium cannabis for an elevated experience
            </motion.p>
          </motion.div>
          <FeaturedStrains />

          {/* View all link */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, ...transitions.smooth }}
            className="flex justify-center mt-12"
          >
            <Link href="/strains">
              <Button variant="ghost" size="lg" className="gap-2 group">
                View Full Collection
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Section - Minimal grid */}
      <section className="py-24 md:py-32 border-t border-border/50">
        <div className="container">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid gap-12 md:gap-8 md:grid-cols-3"
          >
            {[
              {
                icon: Leaf,
                title: "Curated Selection",
                description: "Each strain is carefully selected for quality, potency, and unique characteristics."
              },
              {
                icon: MessageCircle,
                title: "AI Budtender",
                description: "Get personalized recommendations based on your preferences and desired effects."
              },
              {
                icon: Sparkles,
                title: "Semantic Search",
                description: "Find exactly what you're looking for with our AI-powered search technology."
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={staggerItem}
                className="flex flex-col gap-4"
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl font-semibold tracking-tight">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section - Elegant, minimal */}
      <section className="py-24 md:py-32">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={transitions.elegant}
            className="relative rounded-2xl border border-border/50 bg-card p-12 md:p-16 text-center overflow-hidden"
          >
            {/* Ambient glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
                Not sure where to start?
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
                Our AI budtender is here to guide you to your perfect strain
                based on your preferences and desired experience.
              </p>
              <Link href="/budtender">
                <Button size="xl" className="gap-3">
                  <MessageCircle className="h-5 w-5" />
                  Start a Conversation
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer note - Minimal */}
      <section className="py-8 border-t border-border/50">
        <div className="container">
          <p className="text-center text-xs text-muted-foreground/60">
            Must be 21+ to purchase. Please consume responsibly.
          </p>
        </div>
      </section>
    </div>
  );
}
