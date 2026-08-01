import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: "primary" | "success" | "warning" | "destructive" | "muted";
  isText?: boolean;
  loading?: boolean;
}

const colorMap = {
  primary: "text-primary bg-primary/10",
  success: "text-green-500 bg-green-500/10",
  warning: "text-amber-500 bg-amber-500/10",
  destructive: "text-destructive bg-destructive/10",
  muted: "text-muted-foreground bg-muted",
};

const accentMap = {
  primary: "bg-primary",
  success: "bg-green-500",
  warning: "bg-amber-500",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  color = "primary",
  isText = false,
  loading = false,
}: StatCardProps) {
  return (
    <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:shadow-primary/5">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0 space-y-1">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {title}
            </p>
            {loading ? (
              <Skeleton className={cn("mt-2", isText ? "h-5 w-24" : "h-8 w-12")} />
            ) : (
              <p
                className={cn(
                  "font-bold leading-none tabular-nums",
                  isText ? "mt-2 text-base" : "mt-1 text-3xl"
                )}
              >
                {value}
              </p>
            )}
          </div>
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              colorMap[color]
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
      {/* Subtle gradient accent */}
      <div className={cn("absolute bottom-0 left-0 h-0.5 w-full opacity-50", accentMap[color])} />
    </Card>
  );
}
