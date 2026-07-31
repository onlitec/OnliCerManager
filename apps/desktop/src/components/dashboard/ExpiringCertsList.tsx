import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ExpiringCertsList() {
  const { t } = useTranslation();
  const certs: unknown[] = []; // filled in Phase 6

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          {t("dashboard.expiringCerts")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {certs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">{t("common.noResults")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Expiring cert items — Phase 6 */}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
