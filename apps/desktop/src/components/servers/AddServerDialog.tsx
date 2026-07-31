import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Server,
  Loader2,
  CheckCircle2,
  XCircle,
  Terminal,
  Cpu,
  Globe,
  HardDrive,
  Box,
  Sliders,
  ShieldCheck,
} from "lucide-react";
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
import type { IPluginMetadata, IConfigField } from "@onlicert/plugin-interface";
import { cn } from "@/lib/utils";

interface AddServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

/** Config values are `unknown` (plugin config schema is dynamic); render only known primitives as text. */
function toDisplayString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

const PLUGIN_ICONS: Record<string, React.ElementType> = {
  proxmox: Cpu,
  mikrotik: Globe,
  samba: Server,
  nginx: Globe,
  apache: Globe,
  traefik: Sliders,
  docker: Box,
  truenas: HardDrive,
  linux_generic: Terminal,
  custom_ssh: Terminal,
};

export function AddServerDialog({ open, onOpenChange, onSuccess }: AddServerDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [plugins, setPlugins] = useState<IPluginMetadata[]>([]);
  const [selectedPluginId, setSelectedPluginId] = useState<string>("custom_ssh");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [serverName, setServerName] = useState("Meu Servidor SSH");
  const [configValues, setConfigValues] = useState<Record<string, unknown>>({
    host: "192.168.1.100",
    port: 22,
    authType: "password",
    username: "root",
    password: "",
    privateKey: "",
    passphrase: "",
    certPath: "/etc/ssl/certs/server.crt",
    keyPath: "/etc/ssl/private/server.key",
    caPath: "/etc/ssl/certs/ca.crt",
    reloadCommand: "systemctl reload nginx",
  });

  useEffect(() => {
    const loadPlugins = async () => {
      try {
        const list = await window.electron.invoke<IPluginMetadata[]>("plugin:list");
        setPlugins(list);
        if (list.length > 0) {
          const defaultP = list.find((p) => p.id === "custom_ssh") || list[0];
          if (defaultP) {
            setSelectedPluginId(defaultP.id);
            initPluginDefaults(defaultP);
          }
        }
      } catch {
        // ignore
      }
    };
    void loadPlugins();
  }, [open]);

  const initPluginDefaults = (plugin: IPluginMetadata) => {
    const initialConfig: Record<string, unknown> = {};
    plugin.configSchema.forEach((field) => {
      if (field.defaultValue !== undefined) {
        initialConfig[field.key] = field.defaultValue;
      }
    });

    if (plugin.id === "proxmox") {
      setServerName("Meu Proxmox VE");
      initialConfig.host = "192.168.1.50";
      initialConfig.port = 8006;
      initialConfig.node = "pve";
      initialConfig.tokenId = "root@pam!onlicert";
    } else if (plugin.id === "mikrotik") {
      setServerName("Meu RouterOS MikroTik");
      initialConfig.host = "192.168.88.1";
      initialConfig.port = 443;
    } else if (plugin.id === "nginx") {
      setServerName("Meu Servidor NGINX");
    } else if (plugin.id === "samba") {
      setServerName("Meu Servidor Samba");
    } else if (plugin.id === "custom_ssh") {
      setServerName("Servidor Personalizado SSH");
    } else {
      setServerName(`Meu Servidor ${plugin.name}`);
    }

    setConfigValues(initialConfig);
  };

  const handleSelectPlugin = (pluginId: string) => {
    setSelectedPluginId(pluginId);
    setTestResult(null);
    const p = plugins.find((plug) => plug.id === pluginId);
    if (p) {
      initPluginDefaults(p);
    }
  };

  const currentPlugin = plugins.find((p) => p.id === selectedPluginId);

  const handleConfigChange = (key: string, value: unknown) => {
    setConfigValues((prev) => ({ ...prev, [key]: value }));
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await window.electron.invoke<{ success: boolean; message: string }>(
        "server:test-connection",
        selectedPluginId,
        configValues
      );
      setTestResult(res);
    } catch (err) {
      setTestResult({ success: false, message: String(err) });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!serverName.trim()) {
      toast({ title: t("common.error"), description: "Informe o nome do servidor.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const result = await window.electron.invoke<{ success: boolean; error?: string }>("server:create", {
        name: serverName,
        type: selectedPluginId,
        host: toDisplayString(configValues.host) || "localhost",
        port: configValues.port ? Number(configValues.port) : undefined,
        username: toDisplayString(configValues.username) || toDisplayString(configValues.tokenId) || "root",
        config: configValues,
        isFavorite: false,
      });

      if (result.success) {
        toast({ title: t("common.success"), description: "Servidor cadastrado com sucesso!", variant: "success" });
        onOpenChange(false);
        onSuccess();
      } else {
        toast({ title: t("common.error"), description: result.error || "Falha ao cadastrar servidor.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: t("common.error"), description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const authType = configValues.authType ?? "password";

  const renderFieldInput = (field: IConfigField) => {
    // Hide password if authType is privateKey
    if (field.key === "password" && authType === "privateKey") return null;
    // Hide privateKey & passphrase if authType is password
    if ((field.key === "privateKey" || field.key === "passphrase") && authType === "password") return null;

    const value = configValues[field.key] ?? field.defaultValue ?? "";

    if (field.type === "select" && field.options) {
      return (
        <Select value={toDisplayString(value)} onValueChange={(val) => { handleConfigChange(field.key, val); }}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (field.type === "textarea") {
      return (
        <textarea
          id={`field-${field.key}`}
          rows={3}
          value={toDisplayString(value)}
          onChange={(e) => { handleConfigChange(field.key, e.target.value); }}
          placeholder={field.placeholder}
          required={field.required}
          className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      );
    }

    if (field.type === "boolean") {
      return (
        <Select
          value={value ? "true" : "false"}
          onValueChange={(val) => { handleConfigChange(field.key, val === "true"); }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="false">Não (false)</SelectItem>
            <SelectItem value="true">Sim (true)</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        id={`field-${field.key}`}
        type={field.type === "password" ? "password" : field.type === "number" ? "number" : "text"}
        value={toDisplayString(value)}
        onChange={(e) => { handleConfigChange(field.key, e.target.value); }}
        placeholder={field.placeholder}
        required={field.required}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Server className="h-6 w-6 text-primary" />
            {t("servers.add")}
          </DialogTitle>
          <DialogDescription>
            Selecione uma pré-configuração da biblioteca ou cadastre um servidor personalizado via SSH.
          </DialogDescription>
        </DialogHeader>

        {/* Server Presets Library Gallery */}
        <div className="space-y-2 py-1">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">
            Biblioteca de Servidores & Plugins
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {plugins.map((p) => {
              const IconComponent = PLUGIN_ICONS[p.id] || Server;
              const isSelected = p.id === selectedPluginId;
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => { handleSelectPlugin(p.id); }}
                  className={cn(
                    "flex flex-col items-start gap-1 p-2.5 rounded-lg border text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border text-muted-foreground hover:border-border/80 hover:bg-accent"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <IconComponent className="h-4 w-4 shrink-0" />
                    {isSelected && <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </div>
                  <span className="text-xs font-semibold text-foreground truncate w-full mt-1">
                    {p.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground line-clamp-1">
                    {p.id === "proxmox" || p.id === "mikrotik" ? "API REST" : "SSH / SFTP"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4 pt-2">
          {/* Server Name Input */}
          <div className="space-y-2">
            <Label htmlFor="srv-name">Nome do Servidor *</Label>
            <Input
              id="srv-name"
              value={serverName}
              onChange={(e) => { setServerName(e.target.value); }}
              placeholder="ex: Meu Servidor Web NGINX"
              required
            />
          </div>

          {/* Plugin Info Box */}
          {currentPlugin && (
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">{currentPlugin.name}</span>
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
                  v{currentPlugin.version}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{currentPlugin.description}</p>

              {/* Dynamic Plugin Fields */}
              <div className="grid grid-cols-2 gap-3">
                {currentPlugin.configSchema.map((field) => {
                  const rendered = renderFieldInput(field);
                  if (!rendered) return null;

                  const isFullWidth = field.type === "textarea" || field.key === "reloadCommand";

                  return (
                    <div
                      key={field.key}
                      className={cn("space-y-1.5", isFullWidth && "col-span-2")}
                    >
                      <Label htmlFor={`field-${field.key}`} className="text-xs">
                        {field.label} {field.required && "*"}
                      </Label>
                      {rendered}
                      {field.hint && (
                        <p className="text-[10px] text-muted-foreground">{field.hint}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Test Connection Alert Result */}
          {testResult && (
            <div
              className={`p-3 rounded-lg flex items-center gap-2 text-xs border ${
                testResult.success
                  ? "bg-green-500/10 text-green-500 border-green-500/30"
                  : "bg-destructive/10 text-destructive border-destructive/30"
              }`}
            >
              {testResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}

          <DialogFooter className="pt-4 flex items-center justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleTestConnection()}
              disabled={testing || loading}
            >
              {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("servers.form.testConnection")}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => { onOpenChange(false); }} disabled={loading}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("servers.add")}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
