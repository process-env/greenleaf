"use client";

import { ReactNode } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { pageTransition } from "@/lib/motion";

interface PageTransitionProps extends Omit<HTMLMotionProps<"main">, "initial" | "animate" | "exit" | "variants"> {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className, ...props }: PageTransitionProps) {
  return (
    <motion.main
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransition}
      className={className}
      {...props}
    >
      {children}
    </motion.main>
  );
}
