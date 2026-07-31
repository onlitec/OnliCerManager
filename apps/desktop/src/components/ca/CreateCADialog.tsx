import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck, Loader2 } from "lucide-react";
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
import type { CAAlgorithm } from "@onlicert/core";

interface CreateCADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCADialog({ open, onOpenChange, onSuccess }: CreateCADialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "Minha CA Raiz Local",
    commonName: "OnliCert Local Root CA",
    organization: "Empresa Local",
    organizationUnit: "TI",
    country: "BR",
    state: "SP",
    locality: "São Paulo",
    email: "ca@local.domain",
    validityDays: "3650", // 10 years
    algorithm: "RSA_4096" as CAAlgorithm,
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.name || !formData.commonName || !formData.password) {
      toast({ title: t("common.error"), description: "Preencha todos os campos obrigatórios.", variant: "destructive" });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({ title: t("common.error"), description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const result = await window.electron.invoke<{ success: boolean; error?: string }>("ca:create", {
        name: formData.name,
        commonName: formData.commonName,
        organization: formData.organization || undefined,
        organizationUnit: formData.organizationUnit || undefined,
        country: formData.country || undefined,
        state: formData.state || undefined,
        locality: formData.locality || undefined,
        email: formData.email || undefined,
        validityDays: parseInt(formData.validityDays, 10),
        algorithm: formData.algorithm,
        password: formData.password,
      });

      if (result.success) {
        toast({ title: t("common.success"), description: "Autoridade Certificadora criada com sucesso!", variant: "success" });
        onOpenChange(false);
        onSuccess();
      } else {
        toast({ title: t("common.error"), description: result.error || "Falha ao criar CA.", variant: "destructive" });
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
            <ShieldCheck className="h-6 w-6 text-primary" />
            {t("ca.create")}
          </DialogTitle>
          <DialogDescription>
            Crie sua Autoridade Certificadora (CA) raiz local. Ela assinará todos os certificados digitais emitidos pelo OnliCert Manager.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4 py-2">
          {/* CA Name & CN */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ca-name">Nome Amigável da CA *</Label>
              <Input
                id="ca-name"
                value={formData.name}
                onChange={(e) => { setFormData({ ...formData, name: e.target.value }); }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ca-cn">{t("ca.form.commonName")} *</Label>
              <Input
                id="ca-cn"
                value={formData.commonName}
                onChange={(e) => { setFormData({ ...formData, commonName: e.target.value }); }}
                required
              />
            </div>
          </div>

          {/* Algorithm & Validity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("ca.form.algorithm")} *</Label>
              <Select
                value={formData.algorithm}
                onValueChange={(val) => { setFormData({ ...formData, algorithm: val as CAAlgorithm }); }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RSA_2048">RSA 2048 bits</SelectItem>
                  <SelectItem value="RSA_4096">RSA 4096 bits (Recomendado)</SelectItem>
                  <SelectItem value="ECC_P256">ECC P-256 (Moderno)</SelectItem>
                  <SelectItem value="ECC_P384">ECC P-384 (Alta Segurança)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ca-days">{t("ca.form.validityDays")} *</Label>
              <Input
                id="ca-days"
                type="number"
                value={formData.validityDays}
                onChange={(e) => { setFormData({ ...formData, validityDays: e.target.value }); }}
                required
              />
            </div>
          </div>

          {/* DN Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ca-org">{t("ca.form.organization")}</Label>
              <Input
                id="ca-org"
                value={formData.organization}
                onChange={(e) => { setFormData({ ...formData, organization: e.target.value }); }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ca-country">{t("ca.form.country")}</Label>
              <Input
                id="ca-country"
                maxLength={2}
                value={formData.country}
                onChange={(e) => { setFormData({ ...formData, country: e.target.value.toUpperCase() }); }}
              />
            </div>
          </div>

          {/* Password Protection */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
            <div className="space-y-2">
              <Label htmlFor="ca-pass">{t("ca.form.password")} *</Label>
              <Input
                id="ca-pass"
                type="password"
                value={formData.password}
                onChange={(e) => { setFormData({ ...formData, password: e.target.value }); }}
                required
                placeholder="Senha mestra da chave CA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ca-confirm-pass">{t("ca.form.confirmPassword")} *</Label>
              <Input
                id="ca-confirm-pass"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => { setFormData({ ...formData, confirmPassword: e.target.value }); }}
                required
                placeholder="Repita a senha"
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); }} disabled={loading}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("ca.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
