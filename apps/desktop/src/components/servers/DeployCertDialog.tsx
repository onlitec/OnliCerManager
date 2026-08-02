import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Send, Loader2, CheckCircle2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import type { Certificate, Server } from "@onlicert/core";

interface DeployCertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server?: Server | null;
}

export function DeployCertDialog({ open, onOpenChange, server }: DeployCertDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [certs, setCerts] = useState<Certificate[]>([]);
  const [selectedCertId, setSelectedCertId] = useState<string>("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    const loadCerts = async () => {
      try {
        const list = await window.electron.invoke<Certificate[]>("cert:list", { status: "active" });
        setCerts(list);
        if (list.length > 0 && list[0]) {
          setSelectedCertId(list[0].id);
        }
      } catch {
        // ignore
      }
    };
    void loadCerts();
  }, [open]);

  const handleDeploy = async () => {
    if (!server || !selectedCertId) return;
    if (!password) {
      toast({
        title: t("common.error"),
        description: t("servers.deploy.passwordRequired"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Only the id and the password cross IPC: the main process reads the
      // certificate and decrypts its private key, so key material never reaches
      // the renderer.
      const res = await window.electron.invoke<{ success: boolean; message: string }>(
        "server:deploy",
        server.id,
        selectedCertId,
        password
      );

      setResult(res);

      if (res.success) {
        toast({ title: t("common.success"), description: res.message, variant: "success" });
      } else {
        toast({ title: t("common.error"), description: res.message, variant: "destructive" });
      }
    } catch (err) {
      setResult({ success: false, message: String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Send className="h-5 w-5 text-primary" />
            Implantar Certificado
          </DialogTitle>
          <DialogDescription>
            Selecione o certificado para instalar automaticamente no servidor <strong>{server?.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Certificado Digital Ativo</Label>
            <Select value={selectedCertId} onValueChange={setSelectedCertId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um certificado" />
              </SelectTrigger>
              <SelectContent>
                {certs.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.commonName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deploy-password">{t("servers.deploy.password")} *</Label>
            <Input
              id="deploy-password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); }}
              placeholder={t("servers.deploy.passwordPlaceholder")}
              autoComplete="off"
            />
            <p className="text-[11px] leading-snug text-muted-foreground">
              {t("servers.deploy.passwordHint")}
            </p>
          </div>

          {result && (
            <div
              className={`p-3 rounded-lg flex items-start gap-2 text-xs border ${
                result.success
                  ? "bg-green-500/10 text-green-500 border-green-500/30"
                  : "bg-destructive/10 text-destructive border-destructive/30"
              }`}
            >
              {result.success ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
              <span>{result.message}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); }} disabled={loading}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => void handleDeploy()} disabled={loading || !selectedCertId}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Implantar Agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
