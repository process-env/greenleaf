"use client";

import { ReactNode } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { staggerContainer, staggerContainerFast, staggerContainerSlow, staggerItem, staggerItemScale } from "@/lib/motion";

type Speed = "fast" | "normal" | "slow";
type ItemVariant = "slide" | "scale";

interface StaggerContainerProps extends Omit<HTMLMotionProps<"div">, "initial" | "animate" | "exit" | "variants"> {
  children: ReactNode;
  speed?: Speed;
  className?: string;
  delay?: number;
}

const speedVariants = {
  fast: staggerContainerFast,
  normal: staggerContainer,
  slow: staggerContainerSlow,
};

export function StaggerContainer({
  children,
  speed = "normal",
  className,
  delay,
  ...props
}: StaggerContainerProps) {
  const variants = speedVariants[speed];

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      {...(delay !== undefined && { transition: { delayChildren: delay } })}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps extends Omit<HTMLMotionProps<"div">, "initial" | "animate" | "exit" | "variants"> {
  children: ReactNode;
  variant?: ItemVariant;
  className?: string;
}

const itemVariants = {
  slide: staggerItem,
  scale: staggerItemScale,
};

export function StaggerItem({
  children,
  variant = "slide",
  className,
  ...props
}: StaggerItemProps) {
  const variants = itemVariants[variant];

  return (
    <motion.div
      variants={variants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
