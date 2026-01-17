"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { hoverScale, hoverLift, tapScale, transitions } from "@/lib/motion";

type HoverEffect = "scale" | "lift" | "both" | "none";

interface MotionCardProps extends Omit<HTMLMotionProps<"div">, "whileHover" | "whileTap"> {
  children: React.ReactNode;
  hoverEffect?: HoverEffect;
  className?: string;
}

const getHoverAnimation = (effect: HoverEffect) => {
  switch (effect) {
    case "scale":
      return hoverScale;
    case "lift":
      return hoverLift;
    case "both":
      return { ...hoverScale, ...hoverLift };
    case "none":
    default:
      return {};
  }
};

export function MotionCard({
  children,
  hoverEffect = "scale",
  className,
  ...props
}: MotionCardProps) {
  return (
    <motion.div
      whileHover={getHoverAnimation(hoverEffect)}
      whileTap={tapScale}
      transition={transitions.fast}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
