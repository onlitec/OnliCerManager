import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: "primary" | "success" | "warning" | "destructive" | "muted";
  isText?: boolean;
  trend?: { value: number; label: string };
}

const colorMap = {
  primary: "text-primary bg-primary/10",
  success: "text-green-500 bg-green-500/10",
  warning: "text-amber-500 bg-amber-500/10",
  destructive: "text-destructive bg-destructive/10",
  muted: "text-muted-foreground bg-muted",
};

export function StatCard({ title, value, icon: Icon, color = "primary", isText = false }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:shadow-primary/5">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
              {title}
            </p>
            <p className={cn("font-bold leading-none", isText ? "text-base mt-2" : "text-3xl mt-1")}>
              {value}
            </p>
          </div>
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", colorMap[color])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
      {/* Subtle gradient accent */}
      <div
        className={cn(
          "absolute bottom-0 left-0 h-0.5 w-full opacity-50",
          color === "primary" && "bg-primary",
          color === "success" && "bg-green-500",
          color === "warning" && "bg-amber-500",
          color === "destructive" && "bg-destructive",
          color === "muted" && "bg-muted-foreground"
        )}
      />
    </Card>
  );
}
