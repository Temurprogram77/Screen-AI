import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Return a Tailwind text + background color class based on a 0-100 score */
export function scoreColor(score: number): {
  bg: string;
  text: string;
  border: string;
} {
  if (score >= 80) {
    return {
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
      text: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-200 dark:border-emerald-700",
    };
  }
  if (score >= 50) {
    return {
      bg: "bg-amber-100 dark:bg-amber-900/30",
      text: "text-amber-700 dark:text-amber-300",
      border: "border-amber-200 dark:border-amber-700",
    };
  }
  return {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-700",
  };
}

/** Return Tailwind classes for a recommendation enum value */
export function recommendationColor(rec: string): {
  bg: string;
  text: string;
} {
  switch (rec) {
    case "Strong Match":
      return {
        bg: "bg-emerald-100 dark:bg-emerald-900/30",
        text: "text-emerald-700 dark:text-emerald-300",
      };
    case "Potential Match":
      return {
        bg: "bg-amber-100 dark:bg-amber-900/30",
        text: "text-amber-700 dark:text-amber-300",
      };
    default:
      return {
        bg: "bg-red-100 dark:bg-red-900/30",
        text: "text-red-700 dark:text-red-300",
      };
  }
}

/**
 * Process `items` with `fn` using an in-memory queue with at most `limit` concurrent workers (default: 2),
 * with an artificial throttle delay (default: 500ms) between batches to respect rate limits.
 * Uses Promise.allSettled so a single failure does not fail the batch.
 * Returns an array of PromiseSettledResult in the original order.
 */
export async function batchWithConcurrency<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  limit: number = 2,
  throttleMs: number = 500
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];

  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    const settled = await Promise.allSettled(
      chunk.map((item, j) => fn(item, i + j))
    );
    results.push(...settled);

    // Apply artificial throttle delay between batches if more items remain
    if (i + limit < items.length && throttleMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, throttleMs));
    }
  }

  return results;
}
