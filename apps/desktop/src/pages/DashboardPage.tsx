import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck, FileKey2, Server, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentEvents } from "@/components/dashboard/RecentEvents";
import { ExpiringCertsList } from "@/components/dashboard/ExpiringCertsList";
import type { CertificateAuthority } from "@onlicert/core";

export function DashboardPage() {
  const { t } = useTranslation();

  const [activeCA, setActiveCA] = useState<CertificateAuthority | null>(null);
  const [stats, setStats] = useState({ total: 0, expiringSoon: 0, expired: 0 });
  const [, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const ca = await window.electron.invoke<CertificateAuthority | null>("ca:get");
        setActiveCA(ca);

        const certStats = await window.electron.invoke<{ total: number; expiringSoon: number; expired: number }>("cert:stats");
        if (certStats) {
          setStats(certStats);
        }
      } catch {
        // ignore fallback
      } finally {
        setLoading(false);
      }
    };

    void loadDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("dashboard.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t("dashboard.stats.totalCerts")}
          value={stats.total}
          icon={FileKey2}
          color="primary"
        />
        <StatCard
          title={t("dashboard.stats.totalServers")}
          value={0}
          icon={Server}
          color="primary"
        />
        <StatCard
          title={t("dashboard.stats.expiringSoon")}
          value={stats.expiringSoon}
          icon={AlertTriangle}
          color={stats.expiringSoon > 0 ? "warning" : "primary"}
        />
        <StatCard
          title={t("dashboard.stats.caStatus")}
          value={activeCA ? t("dashboard.caStatus.active") : t("dashboard.caStatus.none")}
          icon={ShieldCheck}
          color={activeCA ? "success" : "muted"}
          isText
        />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentEvents />
        <ExpiringCertsList />
      </div>
    </div>
  );
}
