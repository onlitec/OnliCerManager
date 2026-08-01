import { type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Primary call to action, e.g. a "Create" button. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Shared empty state. Callers are expected to distinguish "you have nothing yet"
 * (onboarding, with a create action) from "your filter matched nothing" (no
 * create action) — showing the onboarding copy over a filtered list misleads
 * users into thinking their data is gone.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Card className={cn("flex flex-col items-center justify-center px-6 py-20 text-center", className)}>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60">
        <Icon className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3>
      {description !== undefined && (
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {action !== undefined && <div className="mt-6 flex gap-3">{action}</div>}
    </Card>
  );
}
