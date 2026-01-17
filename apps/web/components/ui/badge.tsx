import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  // Premium badge: pill shape, subtle styling, smooth transitions
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        // Default: Subtle gold
        default:
          "bg-primary/10 text-primary border border-primary/20",
        // Secondary: Neutral
        secondary:
          "bg-secondary text-secondary-foreground border border-border/50",
        // Destructive: Subtle red
        destructive:
          "bg-destructive/10 text-destructive border border-destructive/20",
        // Outline: Border only
        outline:
          "border border-border text-muted-foreground",
        // Strain type badges - refined for dark theme
        indica:
          "bg-purple-500/10 text-purple-400 border border-purple-500/20",
        sativa:
          "bg-amber-500/10 text-amber-400 border border-amber-500/20",
        hybrid:
          "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
        // Effect badges - muted, sophisticated
        effect:
          "bg-muted text-muted-foreground border border-border/50",
        // Success
        success:
          "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
