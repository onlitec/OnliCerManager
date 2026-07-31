import { useTranslation } from "react-i18next";
import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RecentEvents() {
  const { t } = useTranslation();
  const events: unknown[] = []; // filled in Phase 9

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Activity className="h-4 w-4 text-primary" />
          {t("dashboard.recentEvents")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">{t("dashboard.noEvents")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Event items — Phase 9 */}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
