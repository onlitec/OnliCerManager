import type { IPlugin, IPluginMetadata } from "@onlicert/plugin-interface";

export class PluginRegistry {
  private static instance: PluginRegistry | null = null;
  private plugins = new Map<string, IPlugin>();

  static getInstance(): PluginRegistry {
    this.instance ??= new PluginRegistry();
    return this.instance;
  }

  register(plugin: IPlugin): void {
    this.plugins.set(plugin.metadata.id, plugin);
  }

  get(id: string): IPlugin | undefined {
    return this.plugins.get(id);
  }

  list(): IPluginMetadata[] {
    return Array.from(this.plugins.values()).map((p) => p.metadata);
  }

  getAll(): IPlugin[] {
    return Array.from(this.plugins.values());
  }
}
