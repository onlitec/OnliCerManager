import { useTranslation } from "react-i18next";
import {
  FileText,
  ShieldCheck,
  FileKey2,
  Server,
  BookOpen,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function HelpPage() {
  const { t } = useTranslation();

  const handleOpenPdfManual = async () => {
    try {
      if (window.electron) {
        await window.electron.invoke("help:open-manual");
      } else {
        window.open("/manual_onlicert_manager.pdf", "_blank");
      }
    } catch (error) {
      console.error("Error opening manual PDF:", error);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-accent/10 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <BookOpen className="h-4 w-4" />
              <span>Documentação Oficial</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {t("help.title")}
            </h1>
            <p className="text-muted-foreground max-w-xl text-sm">
              {t("help.description")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              onClick={() => { void handleOpenPdfManual(); }}
              className="shadow-md gap-2 font-medium"
            >
              <FileText className="h-5 w-5" />
              {t("help.openPdf")}
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Start Guide Cards */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          {t("help.quickStart")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-3 text-primary">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">1. Criar CA Raiz</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Configure sua Autoridade Certificadora local com algoritmos RSA (2048/4096) ou ECC (P-256/P-384). Defina uma senha mestra segura.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-3 text-primary">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileKey2 className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">2. Emitir Certificados</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Emita certificados SSL/TLS para servidores web, clientes, VPN e code signing. Defina múltiplos SANs (DNS e IP) e exporte em PEM, CRT ou PFX.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-3 text-primary">
              <div className="p-2 rounded-lg bg-primary/10">
                <Server className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">3. Implantação 1-Clique</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Conecte servidores Proxmox VE, MikroTik RouterOS ou NGINX e instale certificados automaticamente via API REST ou SSH.
            </p>
          </div>
        </div>
      </div>

      {/* Manual Topics Overview */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Conteúdo do Manual em PDF
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-accent/40">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground">Arquitetura Zero-Cloud:</span>
              <p className="text-muted-foreground mt-0.5">Armazenamento local SQLite e criptografia AES-256-GCM + scrypt de chaves privadas.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-accent/40">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground">Instalação da CA nos Navegadores:</span>
              <p className="text-muted-foreground mt-0.5">Passo a passo para confiar na CA no Windows, Linux, Chrome e Firefox sem avisos de erro.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-accent/40">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground">Automação Proxmox e MikroTik:</span>
              <p className="text-muted-foreground mt-0.5">Configuração de tokens de API e certificados customizados via plugins dedicados.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-accent/40">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground">Backup e Recuperação:</span>
              <p className="text-muted-foreground mt-0.5">Cópia de segurança da CA e restabelecimento do ambiente em caso de troca de máquina.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
