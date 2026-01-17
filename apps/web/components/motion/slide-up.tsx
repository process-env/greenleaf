"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { transitions } from "@/lib/motion";

interface SlideUpProps extends Omit<HTMLMotionProps<"div">, "initial" | "animate" | "exit"> {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
  className?: string;
}

export function SlideUp({
  children,
  delay = 0,
  duration = 0.5,
  distance = 30,
  className,
  ...props
}: SlideUpProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: distance }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -distance / 2 }}
      transition={{
        ...transitions.elegant,
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
