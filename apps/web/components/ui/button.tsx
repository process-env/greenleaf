import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary: Gold accent, minimal style
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
        // Destructive: Subtle red
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 active:bg-destructive/30",
        // Outline: Subtle border, no fill
        outline:
          "border border-border bg-transparent hover:bg-accent hover:border-accent-foreground/20 active:bg-accent/80",
        // Secondary: Subtle fill
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/60",
        // Ghost: No background until hover
        ghost:
          "hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        // Link: Underline style
        link: "text-primary underline-offset-4 hover:underline",
        // Premium: Gold outline, elegant
        premium:
          "border border-primary/50 text-primary hover:bg-primary/10 hover:border-primary active:bg-primary/20",
      },
      size: {
        default: "h-10 px-5 py-2 rounded-md",
        sm: "h-9 px-4 rounded-md text-xs",
        lg: "h-12 px-8 rounded-md text-base",
        xl: "h-14 px-10 rounded-md text-base font-semibold",
        icon: "h-10 w-10 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
