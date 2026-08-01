import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck, FileKey2, Server, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentCertificates } from "@/components/dashboard/RecentCertificates";
import { ExpiringCertsList } from "@/components/dashboard/ExpiringCertsList";
import { useToast } from "@/hooks/useToast";
import { daysUntil } from "@/lib/utils";
import type { Certificate, CertificateAuthority, Server as ServerEntity } from "@onlicert/core";

const EXPIRY_WINDOW_DAYS = 30;
const PANEL_ITEM_LIMIT = 5;

interface CertStats {
  total: number;
  expiringSoon: number;
  expired: number;
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [activeCA, setActiveCA] = useState<CertificateAuthority | null>(null);
  const [stats, setStats] = useState<CertStats>({ total: 0, expiringSoon: 0, expired: 0 });
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [serverCount, setServerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        // Fetched together so one slow query doesn't serialise behind another.
        const [ca, certStats, certList, servers] = await Promise.all([
          window.electron.invoke<CertificateAuthority | null>("ca:get"),
          window.electron.invoke<CertStats>("cert:stats"),
          window.electron.invoke<Certificate[]>("cert:list"),
          window.electron.invoke<ServerEntity[]>("server:list"),
        ]);

        setActiveCA(ca);
        setStats(certStats);
        setCerts(certList);
        setServerCount(servers.length);
      } catch (err) {
        toast({ title: t("common.error"), description: String(err), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    void loadDashboardData();
  }, [t, toast]);

  // Soonest-to-expire first, so the most urgent renewal is at the top.
  const expiringCerts = useMemo(
    () =>
      certs
        .filter((c) => c.status !== "revoked" && daysUntil(c.validTo) <= EXPIRY_WINDOW_DAYS)
        .sort((a, b) => a.validTo - b.validTo)
        .slice(0, PANEL_ITEM_LIMIT),
    [certs]
  );

  const recentCerts = useMemo(
    () => [...certs].sort((a, b) => b.createdAt - a.createdAt).slice(0, PANEL_ITEM_LIMIT),
    [certs]
  );

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
          loading={loading}
        />
        <StatCard
          title={t("dashboard.stats.totalServers")}
          value={serverCount}
          icon={Server}
          color="primary"
          loading={loading}
        />
        <StatCard
          title={t("dashboard.stats.expiringSoon")}
          value={stats.expiringSoon}
          icon={AlertTriangle}
          color={stats.expiringSoon > 0 ? "warning" : "primary"}
          loading={loading}
        />
        <StatCard
          title={t("dashboard.stats.caStatus")}
          value={activeCA ? t("dashboard.caStatus.active") : t("dashboard.caStatus.none")}
          icon={ShieldCheck}
          color={activeCA ? "success" : "muted"}
          isText
          loading={loading}
        />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentCertificates certs={recentCerts} loading={loading} />
        <ExpiringCertsList certs={expiringCerts} loading={loading} />
      </div>
    </div>
  );
}
