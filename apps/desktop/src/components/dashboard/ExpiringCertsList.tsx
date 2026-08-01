import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, FileKey2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { daysUntil, formatDate } from "@/lib/utils";
import type { Certificate } from "@onlicert/core";

interface ExpiringCertsListProps {
  certs: Certificate[];
  loading: boolean;
}

export function ExpiringCertsList({ certs, loading }: ExpiringCertsListProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            {t("dashboard.expiringCerts")}
          </CardTitle>
          {certs.length > 0 && (
            <Link
              to="/certificates"
              className="rounded-sm text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("dashboard.viewAll")}
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3" aria-busy="true">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            ))}
          </div>
        ) : certs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="mb-2 h-8 w-8 text-green-500/40" />
            <p className="text-sm text-muted-foreground">{t("dashboard.noExpiringCerts")}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {certs.map((cert) => {
              const days = daysUntil(cert.validTo);
              const expired = days <= 0;
              return (
                <Link
                  key={cert.id}
                  to="/certificates"
                  className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      expired ? "bg-destructive/10" : "bg-amber-500/10"
                    }`}
                  >
                    <FileKey2
                      className={`h-4 w-4 ${expired ? "text-destructive" : "text-amber-500"}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{cert.name}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {cert.commonName} • {formatDate(cert.validTo)}
                    </p>
                  </div>
                  <Badge variant={expired ? "destructive" : "warning"} className="shrink-0">
                    {expired
                      ? t("dashboard.expiredDaysAgo", { count: Math.abs(days) })
                      : t("dashboard.expiresInDays", { count: days })}
                  </Badge>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
