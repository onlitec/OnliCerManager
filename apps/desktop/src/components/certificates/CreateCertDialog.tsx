import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileKey2, Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import { isIpAddress } from "@onlicert/core";
import type { CertificateType, CertificateAlgorithm } from "@onlicert/core";

interface CreateCertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCertDialog({ open, onOpenChange, onSuccess }: CreateCertDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [sanInput, setSanInput] = useState("");
  // Empty, not pre-filled with examples: placeholder values that look like real
  // input get submitted by accident, producing certificates for hosts nobody
  // owns. The example text lives in the fields' placeholders instead.
  const [sanList, setSanList] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    type: "server" as CertificateType,
    commonName: "",
    validityDays: "365",
    algorithm: "RSA_2048" as CertificateAlgorithm,
    organization: "",
    caPassword: "",
  });

  const handleAddSAN = () => {
    if (!sanInput.trim()) return;
    const value = sanInput.trim();
    const formatted = value.includes(":") ? value : `DNS:${value}`;
    if (!sanList.includes(formatted)) {
      setSanList([...sanList, formatted]);
    }
    setSanInput("");
  };

  const handleRemoveSAN = (index: number) => {
    setSanList(sanList.filter((_, i) => i !== index));
  };

  // Mirrors ensureCommonNameInSANs on the domain side, purely so the user can
  // see what the certificate will actually contain before issuing it.
  const commonName = formData.commonName.trim();
  const implicitCommonNameSAN =
    commonName.length > 0 &&
    !sanList.some((s) => s.slice(s.indexOf(":") + 1).toLowerCase() === commonName.toLowerCase())
      ? `${isIpAddress(commonName) ? "IP" : "DNS"}:${commonName}`
      : null;

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.name || !formData.commonName || !formData.caPassword) {
      toast({ title: t("common.error"), description: "Preencha os campos obrigatórios, incluindo a senha da CA.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const result = await window.electron.invoke<{ success: boolean; error?: string }>("cert:create", {
        name: formData.name,
        type: formData.type,
        commonName: formData.commonName,
        san: sanList,
        validityDays: parseInt(formData.validityDays, 10),
        algorithm: formData.algorithm,
        organization: formData.organization || undefined,
      }, formData.caPassword);

      if (result.success) {
        toast({ title: t("common.success"), description: "Certificado digital emitido com sucesso!", variant: "success" });
        onOpenChange(false);
        onSuccess();
      } else {
        toast({ title: t("common.error"), description: result.error || "Falha ao emitir certificado.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: t("common.error"), description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileKey2 className="h-6 w-6 text-primary" />
            {t("certificates.create")}
          </DialogTitle>
          <DialogDescription>
            Emita um novo certificado assinado pela sua CA local para servidores, serviços ou clientes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4 py-2">
          {/* Friendly Name & Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cert-name">{t("certificates.form.name")} *</Label>
              <Input
                id="cert-name"
                value={formData.name}
                onChange={(e) => { setFormData({ ...formData, name: e.target.value }); }}
                placeholder="Servidor Web App"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t("certificates.form.type")} *</Label>
              <Select
                value={formData.type}
                onValueChange={(val) => { setFormData({ ...formData, type: val as CertificateType }); }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="server">Servidor (Web/TLS)</SelectItem>
                  <SelectItem value="client">Cliente (Autenticação)</SelectItem>
                  <SelectItem value="web_server">Servidor Web Completo</SelectItem>
                  <SelectItem value="vpn">VPN (OpenVPN/IPsec)</SelectItem>
                  <SelectItem value="code_signing">Assinatura de Código</SelectItem>
                  <SelectItem value="email">Proteção de E-mail (S/MIME)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Common Name & Algorithm */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cert-cn">{t("certificates.form.commonName")} *</Label>
              <Input
                id="cert-cn"
                value={formData.commonName}
                onChange={(e) => { setFormData({ ...formData, commonName: e.target.value }); }}
                placeholder="app.empresa.local ou 192.168.1.10"
                required
              />
              <p className="text-[11px] leading-snug text-muted-foreground">
                {t("certificates.form.commonNameHint")}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t("certificates.form.algorithm")} *</Label>
              <Select
                value={formData.algorithm}
                onValueChange={(val) => { setFormData({ ...formData, algorithm: val as CertificateAlgorithm }); }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RSA_2048">RSA 2048 bits</SelectItem>
                  <SelectItem value="RSA_4096">RSA 4096 bits</SelectItem>
                  <SelectItem value="ECC_P256">ECC P-256 (Recomendado)</SelectItem>
                  <SelectItem value="ECC_P384">ECC P-384</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Validity Days */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cert-days">{t("certificates.form.validity")} *</Label>
              <Input
                id="cert-days"
                type="number"
                value={formData.validityDays}
                onChange={(e) => { setFormData({ ...formData, validityDays: e.target.value }); }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ca-pass-optional">Senha da CA *</Label>
              <Input
                id="ca-pass-optional"
                type="password"
                value={formData.caPassword}
                onChange={(e) => { setFormData({ ...formData, caPassword: e.target.value }); }}
                placeholder="Senha mestra da chave CA"
                required
              />
            </div>
          </div>

          {/* SAN List */}
          <div className="space-y-2 pt-2 border-t border-border">
            <Label>{t("certificates.form.san")}</Label>
            <div className="flex gap-2">
              <Input
                value={sanInput}
                onChange={(e) => { setSanInput(e.target.value); }}
                placeholder="ex: app.local ou IP:192.168.1.50"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSAN();
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={handleAddSAN}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {/* The CN is added server-side; show it here so the effective list
                  the certificate will carry is visible before issuing. */}
              {implicitCommonNameSAN !== null && (
                <span
                  className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-xs text-primary"
                  title={t("certificates.form.commonNameHint")}
                >
                  {implicitCommonNameSAN}
                </span>
              )}
              {sanList.map((san, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-xs font-mono text-foreground border border-border"
                >
                  {san}
                  <button
                    type="button"
                    onClick={() => { handleRemoveSAN(index); }}
                    className="text-muted-foreground hover:text-destructive ml-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); }} disabled={loading}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("certificates.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
