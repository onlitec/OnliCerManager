import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Server, Loader2, CheckCircle2, XCircle } from "lucide-react";
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
import type { IPluginMetadata } from "@onlicert/plugin-interface";

interface AddServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddServerDialog({ open, onOpenChange, onSuccess }: AddServerDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [plugins, setPlugins] = useState<IPluginMetadata[]>([]);
  const [selectedPluginId, setSelectedPluginId] = useState<string>("proxmox");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [serverName, setServerName] = useState("Meu Proxmox VE");
  const [configValues, setConfigValues] = useState<Record<string, any>>({
    host: "192.168.1.50",
    port: 8006,
    node: "pve",
    tokenId: "root@pam!onlicert",
    secret: "",
    verifySsl: false,
  });

  useEffect(() => {
    const loadPlugins = async () => {
      try {
        const list = await window.electron.invoke<IPluginMetadata[]>("plugin:list");
        setPlugins(list);
        if (list.length > 0 && list[0]) {
          setSelectedPluginId(list[0].id);
        }
      } catch {
        // ignore
      }
    };
    void loadPlugins();
  }, []);

  const currentPlugin = plugins.find((p) => p.id === selectedPluginId);

  const handleConfigChange = (key: string, value: any) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
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
        host: configValues["host"] || "localhost",
        port: configValues["port"] ? Number(configValues["port"]) : undefined,
        username: configValues["username"] || configValues["tokenId"] || undefined,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Server className="h-6 w-6 text-primary" />
            {t("servers.add")}
          </DialogTitle>
          <DialogDescription>
            Conecte um servidor de destino (Proxmox VE, MikroTik RouterOS) para implantação automática de certificados.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Server Name & Plugin Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="srv-name">{t("servers.form.name")} *</Label>
              <Input
                id="srv-name"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t("servers.form.type")} *</Label>
              <Select
                value={selectedPluginId}
                onValueChange={(val) => {
                  setSelectedPluginId(val);
                  setTestResult(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plugins.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Plugin Dynamic Fields */}
          {currentPlugin && (
            <div className="space-y-3 pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">{currentPlugin.description}</p>
              <div className="grid grid-cols-2 gap-4">
                {currentPlugin.configSchema.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label htmlFor={`field-${field.key}`}>
                      {field.label} {field.required && "*"}
                    </Label>
                    <Input
                      id={`field-${field.key}`}
                      type={field.type === "password" ? "password" : field.type === "number" ? "number" : "text"}
                      value={configValues[field.key] ?? field.defaultValue ?? ""}
                      onChange={(e) => handleConfigChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test connection result */}
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
            <Button type="button" variant="secondary" onClick={() => void handleTestConnection()} disabled={testing || loading}>
              {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("servers.form.testConnection")}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
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
