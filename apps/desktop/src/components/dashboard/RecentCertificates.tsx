import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Activity, FileKey2, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import type { Certificate } from "@onlicert/core";

interface RecentCertificatesProps {
  certs: Certificate[];
  loading: boolean;
}

/**
 * Shows the most recently issued certificates.
 *
 * This replaces an earlier "Recent Events" panel that was wired to an event log
 * that was never implemented, so it always rendered its empty state.
 */
export function RecentCertificates({ certs, loading }: RecentCertificatesProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-primary" />
            {t("dashboard.recentCerts")}
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
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : certs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileKey2 className="mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">{t("dashboard.noRecentCerts")}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {certs.map((cert) => (
              <Link
                key={cert.id}
                to="/certificates"
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FileKey2 className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                    {cert.name}
                    {cert.isFavorite && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
                  </p>
                  <p className="truncate font-mono text-xs text-muted-foreground">{cert.commonName}</p>
                </div>
                <p className="shrink-0 text-xs text-muted-foreground">{formatDate(cert.createdAt)}</p>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
