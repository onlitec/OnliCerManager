import { cn } from "@/lib/utils";

/**
 * Placeholder block shown while data is loading. Prefer this over rendering an
 * empty state early — an empty state tells the user they have no data, which is
 * a different (and often wrong) message while a query is still in flight.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-md bg-muted", className)}
      aria-hidden="true"
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-foreground/[0.07] to-transparent" />
    </div>
  );
}
