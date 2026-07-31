import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, FileKey2, Search, Star, Trash2, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateCertDialog } from "@/components/certificates/CreateCertDialog";
import { useToast } from "@/hooks/useToast";
import { formatDate, daysUntil } from "@/lib/utils";
import type { Certificate } from "@onlicert/core";

export function CertificatesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [certs, setCerts] = useState<Certificate[]>([]);
  const [, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const fetchCerts = async () => {
    setLoading(true);
    try {
      const list = await window.electron.invoke<Certificate[]>("cert:list", {
        search: search || undefined,
      });
      setCerts(list);
    } catch (err) {
      toast({ title: t("common.error"), description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCerts();
  }, [search]);

  const handleToggleFavorite = async (id: string) => {
    try {
      await window.electron.invoke("cert:favorite", id);
      await fetchCerts();
    } catch (err) {
      toast({ title: t("common.error"), description: String(err), variant: "destructive" });
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Tem certeza que deseja revogar este certificado?")) return;
    try {
      const res = await window.electron.invoke<{ success: boolean; error?: string }>("cert:revoke", id);
      if (res.success) {
        toast({ title: t("common.success"), description: "Certificado revogado com sucesso.", variant: "success" });
        await fetchCerts();
      } else {
        toast({ title: t("common.error"), description: res.error || "Falha ao revogar.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: t("common.error"), description: String(err), variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este certificado?")) return;
    try {
      const res = await window.electron.invoke<{ success: boolean }>("cert:delete", id);
      if (res.success) {
        toast({ title: t("common.success"), description: "Certificado excluído.", variant: "success" });
        await fetchCerts();
      }
    } catch (err) {
      toast({ title: t("common.error"), description: String(err), variant: "destructive" });
    }
  };

  const getStatusBadge = (cert: Certificate) => {
    if (cert.status === "revoked") {
      return <Badge variant="destructive">Revogado</Badge>;
    }
    const days = daysUntil(cert.validTo);
    if (days <= 0) {
      return <Badge variant="destructive">Expirado</Badge>;
    }
    if (days <= 30) {
      return <Badge variant="warning">Expirando em {days}d</Badge>;
    }
    return <Badge variant="success">Ativo ({days}d)</Badge>;
  };

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

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
            className="pl-9"
          />
        </div>
      </div>

      {certs.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20 text-center">
          <FileKey2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">{t("certificates.noCerts")}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Crie seu primeiro certificado digital assinado pela sua CA local.
          </p>
          <Button className="mt-6" onClick={() => { setCreateDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            {t("certificates.create")}
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {certs.map((cert) => (
            <Card key={cert.id} className="transition-all hover:border-primary/50">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => void handleToggleFavorite(cert.id)}
                    className="text-muted-foreground hover:text-amber-400 transition-colors"
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
                      CN: {cert.commonName} • {cert.algorithm} • Válido até {formatDate(cert.validTo)}
                    </p>
                    {cert.san.length > 0 && (
                      <p className="text-[11px] font-mono text-muted-foreground/70 truncate mt-0.5">
                        SAN: {cert.san.join(", ")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {cert.status === "active" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-amber-500"
                      title="Revogar Certificado"
                      onClick={() => void handleRevoke(cert.id)}
                    >
                      <Ban className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    title="Excluir Certificado"
                    onClick={() => void handleDelete(cert.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
