import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Server, Search, Trash2, Send, X, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AddServerDialog } from "@/components/servers/AddServerDialog";
import { DeployCertDialog } from "@/components/servers/DeployCertDialog";
import { useToast } from "@/hooks/useToast";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useConfirm } from "@/providers/ConfirmProvider";
import type { Server as ServerEntity } from "@onlicert/core";

const DEFAULT_PORTS: Record<string, number> = { proxmox: 8006, mikrotik: 8729 };

export function ServersPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [servers, setServers] = useState<ServerEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<ServerEntity | null>(null);

  const debouncedSearch = useDebouncedValue(search);

  // The server list is small and has no server-side search, so fetch once and
  // filter in memory rather than re-querying SQLite on every keystroke.
  const fetchServers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await window.electron.invoke<ServerEntity[]>("server:list");
      setServers(list);
    } catch (err) {
      toast({ title: t("common.error"), description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    void fetchServers();
  }, [fetchServers]);

  const visibleServers = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) return servers;
    return servers.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.host.toLowerCase().includes(query) ||
        s.type.toLowerCase().includes(query)
    );
  }, [servers, debouncedSearch]);

  const handleDelete = async (server: ServerEntity) => {
    const confirmed = await confirm({
      title: t("servers.confirmDelete.title"),
      description: t("servers.confirmDelete.description", { name: server.name }),
      confirmLabel: t("servers.confirmDelete.action"),
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      const res = await window.electron.invoke<{ success: boolean }>("server:delete", server.id);
      if (res.success) {
        toast({ title: t("common.success"), description: t("servers.deleteSuccess"), variant: "success" });
        await fetchServers();
      }
    } catch (err) {
      toast({ title: t("common.error"), description: String(err), variant: "destructive" });
    }
  };

  const isFiltering = debouncedSearch.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("servers.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("servers.subtitle")}</p>
        </div>
        <Button size="sm" onClick={() => { setAddDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          {t("servers.add")}
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
            className="pl-9 pr-9"
            aria-label={t("common.search")}
          />
          {search.length > 0 && (
            <button
              type="button"
              onClick={() => { setSearch(""); }}
              aria-label={t("common.clearSearch")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-busy="true" aria-label={t("common.loading")}>
          {[0, 1].map((i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-3 p-4">
                <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-44" />
                </div>
                <Skeleton className="h-8 w-24 shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : visibleServers.length === 0 ? (
        isFiltering ? (
          <EmptyState
            icon={SearchX}
            title={t("common.noResultsFor", { query: debouncedSearch })}
            description={t("common.noResultsHint")}
            action={
              <Button variant="outline" onClick={() => { setSearch(""); }}>
                <X className="mr-2 h-4 w-4" />
                {t("common.clearSearch")}
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Server}
            title={t("servers.noServers")}
            description={t("servers.noServersDescription")}
            action={
              <Button onClick={() => { setAddDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                {t("servers.add")}
              </Button>
            }
          />
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {visibleServers.map((srv) => (
            <Card key={srv.id} className="transition-colors hover:border-primary/50">
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
                      {srv.host}:{srv.port ?? DEFAULT_PORTS[srv.type] ?? 443}
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
                    {t("servers.deployShort")}
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label={t("servers.delete")}
                        onClick={() => void handleDelete(srv)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("servers.delete")}</TooltipContent>
                  </Tooltip>
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
