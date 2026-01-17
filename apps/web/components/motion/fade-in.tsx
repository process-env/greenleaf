"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { fadeIn, fadeInUp, fadeInDown, fadeInLeft, fadeInRight, transitions } from "@/lib/motion";

type Direction = "up" | "down" | "left" | "right" | "none";

interface FadeInProps extends Omit<HTMLMotionProps<"div">, "initial" | "animate" | "exit"> {
  children: React.ReactNode;
  direction?: Direction;
  delay?: number;
  duration?: number;
  className?: string;
}

const directionVariants = {
  up: fadeInUp,
  down: fadeInDown,
  left: fadeInLeft,
  right: fadeInRight,
  none: fadeIn,
};

export function FadeIn({
  children,
  direction = "up",
  delay = 0,
  duration = 0.4,
  className,
  ...props
}: FadeInProps) {
  const variants = directionVariants[direction];

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={{
        ...transitions.smooth,
        duration,
        delay,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
