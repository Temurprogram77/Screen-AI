import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  lines?: number;
}

/** Animated placeholder block */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-slate-200 dark:bg-slate-700",
        className
      )}
    />
  );
}

/** Multiple stacked skeleton lines */
export function SkeletonLines({ lines = 3, className }: SkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 && "w-3/4")}
        />
      ))}
    </div>
  );
}

/** Full card skeleton for the metric cards */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3",
        className
      )}
    >
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

/** Table row skeleton */
export function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100 dark:border-slate-800">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}
