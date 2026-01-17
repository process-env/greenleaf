import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Use shimmer animation instead of pulse */
  shimmer?: boolean;
}

function Skeleton({ className, shimmer = true, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted",
        shimmer ? "shimmer" : "animate-pulse",
        className
      )}
      {...props}
    />
  );
}

/** Skeleton specifically sized for text lines */
function SkeletonText({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton
      className={cn("h-4 w-full", className)}
      {...props}
    />
  );
}

/** Skeleton for circular elements like avatars */
function SkeletonCircle({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton
      className={cn("h-10 w-10 rounded-full", className)}
      {...props}
    />
  );
}

/** Skeleton for card layouts */
function SkeletonCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      <Skeleton className="h-48 w-full rounded-lg" />
      <div className="space-y-2">
        <SkeletonText className="w-3/4" />
        <SkeletonText className="w-1/2" />
      </div>
    </div>
  );
}

export { Skeleton, SkeletonText, SkeletonCircle, SkeletonCard };
