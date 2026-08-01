import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ShieldCheck,
  Plus,
  Upload,
  Download,
  HardDriveDownload,
  RotateCcw,
  KeyRound,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CreateCADialog } from "@/components/ca/CreateCADialog";
import { useToast } from "@/hooks/useToast";
import { formatDate } from "@/lib/utils";
import type { CertificateAuthority } from "@onlicert/core";

interface SaveFileResult {
  success: boolean;
  filePath?: string;
  canceled?: boolean;
  error?: string;
}

export function CAPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [ca, setCa] = useState<CertificateAuthority | null>(null);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchCA = async () => {
    setLoading(true);
    try {
      const activeCA = await window.electron.invoke<CertificateAuthority | null>("ca:get");
      setCa(activeCA);
    } catch (err) {
      toast({ title: t("common.error"), description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCA();
  }, []);

  const handleCopyPem = async () => {
    if (!ca) return;
    try {
      await navigator.clipboard.writeText(ca.certPem);
      setCopied(true);
      toast({ title: t("common.success"), description: t("ca.copySuccess"), variant: "success" });
      setTimeout(() => { setCopied(false); }, 2000);
    } catch {
      toast({ title: t("common.error"), description: t("ca.copyError"), variant: "destructive" });
    }
  };

  // Saves the CA's public certificate as a .crt file. This is the file admins
  // install on client machines, so it's a real file export, not a clipboard copy.
  const handleExportToFile = async () => {
    if (!ca) return;
    try {
      const res = await window.electron.invoke<SaveFileResult>("ca:export-file");
      if (res.canceled === true) return;
      if (res.success) {
        toast({
          title: t("common.success"),
          description: t("ca.exportSuccess", { path: res.filePath }),
          variant: "success",
        });
      } else {
        toast({ title: t("common.error"), description: res.error ?? "", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: t("common.error"), description: String(err), variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label={t("common.loading")}>
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-56" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("ca.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("ca.subtitle")}</p>
        </div>
        {!ca && (
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                {/* span wrapper: a disabled button emits no pointer events, so
                    the tooltip would never open without it */}
                <span tabIndex={0}>
                  <Button variant="outline" size="sm" disabled>
                    <Upload className="mr-2 h-4 w-4" />
                    {t("ca.import")}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{t("ca.featureUnavailable")}</TooltipContent>
            </Tooltip>
            <Button size="sm" onClick={() => { setCreateDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              {t("ca.create")}
            </Button>
          </div>
        )}
      </div>

      {ca ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* CA info card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  {ca.name}
                </CardTitle>
                <Badge variant="outline" className="border-green-500/30 text-green-500 bg-green-500/10">
                  {t("dashboard.caStatus.active")}
                </Badge>
              </div>
              <CardDescription>
                {ca.algorithm} • {t("ca.validUntil", { date: formatDate(ca.validTo) })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">{t("ca.form.commonName")}</p>
                  <p className="font-semibold text-foreground mt-0.5">{ca.commonName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">{t("ca.form.organization")}</p>
                  <p className="font-semibold text-foreground mt-0.5">{ca.organization || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">{t("ca.form.algorithm")}</p>
                  <p className="font-semibold text-foreground mt-0.5">{ca.algorithm}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">{t("ca.caId")}</p>
                  <p className="font-mono text-xs text-muted-foreground mt-0.5">{ca.id}</p>
                </div>
              </div>

              {/* PEM Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase">{t("ca.publicCert")}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => { void handleCopyPem(); }}
                  >
                    {copied ? (
                      <Check className="mr-1 h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="mr-1 h-3.5 w-3.5" />
                    )}
                    {copied ? t("ca.copied") : t("ca.copyPem")}
                  </Button>
                </div>
                <pre className="p-3 bg-muted rounded-lg text-[11px] font-mono text-muted-foreground overflow-x-auto max-h-40 select-all border border-border">
                  {ca.certPem}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Action sidebar */}
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">{t("ca.actions")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="default"
                  className="w-full justify-start"
                  size="sm"
                  onClick={() => { void handleExportToFile(); }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t("ca.export")}
                </Button>
                <p className="px-0.5 pb-1 text-[11px] leading-snug text-muted-foreground">
                  {t("ca.exportHint")}
                </p>

                {/* Not implemented yet — kept visible so the roadmap is discoverable,
                    but disabled and labelled so they don't read as broken. */}
                {[
                  { icon: HardDriveDownload, label: t("ca.backup") },
                  { icon: RotateCcw, label: t("ca.restore") },
                  { icon: KeyRound, label: t("ca.changePassword") },
                ].map(({ icon: Icon, label }) => (
                  <Tooltip key={label}>
                    <TooltipTrigger asChild>
                      <span tabIndex={0} className="block">
                        <Button variant="outline" className="w-full justify-start" size="sm" disabled>
                          <Icon className="mr-2 h-4 w-4" />
                          {label}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{t("ca.featureUnavailable")}</TooltipContent>
                  </Tooltip>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={ShieldCheck}
          title={t("ca.noCA")}
          description={t("ca.noCADescription")}
          action={
            <Button onClick={() => { setCreateDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              {t("ca.create")}
            </Button>
          }
        />
      )}

      {/* Creation Dialog */}
      <CreateCADialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => void fetchCA()}
      />
    </div>
  );
}
