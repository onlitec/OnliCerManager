import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck, Plus, Upload, Download, HardDriveDownload, RotateCcw, KeyRound, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateCADialog } from "@/components/ca/CreateCADialog";
import { useToast } from "@/hooks/useToast";
import { formatDate } from "@/lib/utils";
import type { CertificateAuthority } from "@onlicert/core";

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

  const handleExportCert = async () => {
    if (!ca) return;
    try {
      await navigator.clipboard.writeText(ca.certPem);
      setCopied(true);
      toast({ title: t("common.success"), description: "Certificado público da CA copiado para a área de transferência!", variant: "success" });
      setTimeout(() => { setCopied(false); }, 2000);
    } catch {
      toast({ title: t("common.error"), description: "Falha ao copiar certificado", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("ca.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("ca.subtitle")}</p>
        </div>
        {!ca && !loading && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              {t("ca.import")}
            </Button>
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
              <CardDescription>{ca.algorithm} • Válido até {formatDate(ca.validTo)}</CardDescription>
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
                  <p className="text-xs font-medium text-muted-foreground uppercase">ID da CA</p>
                  <p className="font-mono text-xs text-muted-foreground mt-0.5">{ca.id}</p>
                </div>
              </div>

              {/* PEM Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Certificado Público (PEM)</p>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { void handleExportCert(); }}>
                    {copied ? <Check className="mr-1 h-3.5 w-3.5 text-green-500" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
                    {copied ? "Copiado" : "Copiar PEM"}
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
                <CardTitle className="text-sm font-semibold">Ações da CA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => { void handleExportCert(); }}>
                  <Download className="mr-2 h-4 w-4" />
                  {t("ca.export")}
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm" disabled>
                  <HardDriveDownload className="mr-2 h-4 w-4" />
                  {t("ca.backup")}
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm" disabled>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t("ca.restore")}
                </Button>
                <Button variant="outline" className="w-full justify-start text-muted-foreground" size="sm" disabled>
                  <KeyRound className="mr-2 h-4 w-4" />
                  {t("ca.changePassword")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Empty state */
        <Card className="flex flex-col items-center justify-center py-20 text-center">
          <ShieldCheck className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">{t("ca.noCA")}</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">{t("ca.noCADescription")}</p>
          <div className="flex gap-3 mt-6">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              {t("ca.import")}
            </Button>
            <Button onClick={() => { setCreateDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              {t("ca.create")}
            </Button>
          </div>
        </Card>
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
