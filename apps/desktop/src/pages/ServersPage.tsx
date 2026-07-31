import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Server, Search, Trash2, Send, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddServerDialog } from "@/components/servers/AddServerDialog";
import { DeployCertDialog } from "@/components/servers/DeployCertDialog";
import { useToast } from "@/hooks/useToast";
import type { Server as ServerEntity } from "@onlicert/core";

export function ServersPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [servers, setServers] = useState<ServerEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<ServerEntity | null>(null);

  const fetchServers = async () => {
    setLoading(true);
    try {
      const list = await window.electron.invoke<ServerEntity[]>("server:list");
      setServers(list.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.host.includes(search)));
    } catch (err) {
      toast({ title: t("common.error"), description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchServers();
  }, [search]);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este servidor?")) return;
    try {
      const res = await window.electron.invoke<{ success: boolean }>("server:delete", id);
      if (res.success) {
        toast({ title: t("common.success"), description: "Servidor excluído.", variant: "success" });
        await fetchServers();
      }
    } catch (err) {
      toast({ title: t("common.error"), description: String(err), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("servers.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("servers.subtitle")}</p>
        </div>
        <Button size="sm" onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("servers.add")}
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {servers.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20 text-center">
          <Server className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">{t("servers.noServers")}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre seu primeiro servidor Proxmox VE ou MikroTik para implantação automática.
          </p>
          <Button className="mt-6" onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("servers.add")}
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {servers.map((srv) => (
            <Card key={srv.id} className="transition-all hover:border-primary/50">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Server className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{srv.name}</p>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {srv.type}
                      </Badge>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground truncate mt-0.5">
                      Host: {srv.host}:{srv.port ?? (srv.type === "proxmox" ? 8006 : 443)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      setSelectedServer(srv);
                      setDeployDialogOpen(true);
                    }}
                  >
                    <Send className="mr-1.5 h-3.5 w-3.5 text-primary" />
                    Implantar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    title="Excluir Servidor"
                    onClick={() => void handleDelete(srv.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <AddServerDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => void fetchServers()}
      />

      {/* Deploy Dialog */}
      <DeployCertDialog
        open={deployDialogOpen}
        onOpenChange={setDeployDialogOpen}
        server={selectedServer}
      />
    </div>
  );
}
