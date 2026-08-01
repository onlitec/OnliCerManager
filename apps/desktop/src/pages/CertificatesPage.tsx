import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, FileKey2, Search, Star, Trash2, Ban, Download, X, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CreateCertDialog } from "@/components/certificates/CreateCertDialog";
import { useToast } from "@/hooks/useToast";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useConfirm } from "@/providers/ConfirmProvider";
import { formatDate, daysUntil } from "@/lib/utils";
import type { Certificate } from "@onlicert/core";

interface SaveFileResult {
  success: boolean;
  filePath?: string;
  canceled?: boolean;
  error?: string;
}

export function CertificatesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search);

  const fetchCerts = useCallback(async () => {
    setLoading(true);
    try {
      const list = await window.electron.invoke<Certificate[]>("cert:list", {
        search: debouncedSearch || undefined,
      });
      setCerts(list);
    } catch (err) {
      toast({ title: t("common.error"), description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, t, toast]);

  useEffect(() => {
    void fetchCerts();
  }, [fetchCerts]);

  const handleToggleFavorite = async (id: string) => {
    try {
      await window.electron.invoke("cert:favorite", id);
      await fetchCerts();
    } catch (err) {
      toast({ title: t("common.error"), description: String(err), variant: "destructive" });
    }
  };

  const handleRevoke = async (cert: Certificate) => {
    const confirmed = await confirm({
      title: t("certificates.confirmRevoke.title"),
      description: t("certificates.confirmRevoke.description", { name: cert.name }),
      confirmLabel: t("certificates.confirmRevoke.action"),
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      const res = await window.electron.invoke<{ success: boolean; error?: string }>("cert:revoke", cert.id);
      if (res.success) {
        toast({ title: t("common.success"), description: t("certificates.revokeSuccess"), variant: "success" });
        await fetchCerts();
      } else {
        toast({
          title: t("common.error"),
          description: res.error ?? t("certificates.revokeError"),
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({ title: t("common.error"), description: String(err), variant: "destructive" });
    }
  };

  const handleDelete = async (cert: Certificate) => {
    const confirmed = await confirm({
      title: t("certificates.confirmDelete.title"),
      description: t("certificates.confirmDelete.description", { name: cert.name }),
      confirmLabel: t("certificates.confirmDelete.action"),
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      const res = await window.electron.invoke<{ success: boolean }>("cert:delete", cert.id);
      if (res.success) {
        toast({ title: t("common.success"), description: t("certificates.deleteSuccess"), variant: "success" });
        await fetchCerts();
      }
    } catch (err) {
      toast({ title: t("common.error"), description: String(err), variant: "destructive" });
    }
  };

  const handleExport = async (cert: Certificate) => {
    try {
      const res = await window.electron.invoke<SaveFileResult>("cert:export-file", cert.id);
      if (res.canceled === true) return;
      if (res.success) {
        toast({
          title: t("common.success"),
          description: t("certificates.exportSuccess", { path: res.filePath }),
          variant: "success",
        });
      } else {
        toast({ title: t("common.error"), description: res.error ?? "", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: t("common.error"), description: String(err), variant: "destructive" });
    }
  };

  const getStatusBadge = (cert: Certificate) => {
    if (cert.status === "revoked") {
      return <Badge variant="destructive">{t("certificates.status.revoked")}</Badge>;
    }
    const days = daysUntil(cert.validTo);
    if (days <= 0) {
      return <Badge variant="destructive">{t("certificates.status.expired")}</Badge>;
    }
    if (days <= 30) {
      return <Badge variant="warning">{t("certificates.expiringInDays", { count: days })}</Badge>;
    }
    return <Badge variant="success">{t("certificates.activeForDays", { count: days })}</Badge>;
  };

  const isFiltering = debouncedSearch.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("certificates.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("certificates.subtitle")}</p>
        </div>
        <Button size="sm" onClick={() => { setCreateDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          {t("certificates.create")}
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
            className="pl-9 pr-9"
            aria-label={t("common.search")}
          />
          {search.length > 0 && (
            <button
              type="button"
              onClick={() => { setSearch(""); }}
              aria-label={t("common.clearSearch")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {!loading && certs.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {t("certificates.count", { count: certs.length })}
          </p>
        )}
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label={t("common.loading")}>
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-3 p-4">
                <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-72" />
                </div>
                <Skeleton className="h-8 w-16 shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : certs.length === 0 ? (
        isFiltering ? (
          <EmptyState
            icon={SearchX}
            title={t("common.noResultsFor", { query: debouncedSearch })}
            description={t("common.noResultsHint")}
            action={
              <Button variant="outline" onClick={() => { setSearch(""); }}>
                <X className="mr-2 h-4 w-4" />
                {t("common.clearSearch")}
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={FileKey2}
            title={t("certificates.noCerts")}
            description={t("certificates.noCertsDescription")}
            action={
              <Button onClick={() => { setCreateDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                {t("certificates.create")}
              </Button>
            }
          />
        )
      ) : (
        <div className="space-y-3">
          {certs.map((cert) => (
            <Card key={cert.id} className="transition-colors hover:border-primary/50">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => void handleToggleFavorite(cert.id)}
                    aria-label={cert.isFavorite ? t("certificates.unfavorite") : t("certificates.favorite")}
                    aria-pressed={cert.isFavorite}
                    className="rounded-sm text-muted-foreground transition-colors hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Star className={`h-4 w-4 ${cert.isFavorite ? "fill-amber-400 text-amber-400" : ""}`} />
                  </button>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FileKey2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{cert.name}</p>
                      {getStatusBadge(cert)}
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {cert.type}
                      </Badge>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground truncate mt-0.5">
                      CN: {cert.commonName} • {cert.algorithm} •{" "}
                      {t("certificates.validUntil", { date: formatDate(cert.validTo) })}
                    </p>
                    {cert.san.length > 0 && (
                      <p className="text-[11px] font-mono text-muted-foreground/70 truncate mt-0.5">
                        SAN: {cert.san.join(", ")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        aria-label={t("common.export")}
                        onClick={() => void handleExport(cert)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("common.export")}</TooltipContent>
                  </Tooltip>

                  {cert.status === "active" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-amber-500"
                          aria-label={t("certificates.revoke")}
                          onClick={() => void handleRevoke(cert)}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t("certificates.revoke")}</TooltipContent>
                    </Tooltip>
                  )}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label={t("certificates.delete")}
                        onClick={() => void handleDelete(cert)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("certificates.delete")}</TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Creation Dialog */}
      <CreateCertDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => void fetchCerts()}
      />
    </div>
  );
}
