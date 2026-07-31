import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  ShieldCheck,
  FileKey2,
  Server,
  Settings,
  Puzzle,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
}

export function Sidebar() {
  const { t } = useTranslation();

  const navItems: NavItem[] = [
    { to: "/", icon: LayoutDashboard, label: t("nav.dashboard"), end: true },
    { to: "/ca", icon: ShieldCheck, label: t("nav.ca") },
    { to: "/certificates", icon: FileKey2, label: t("nav.certificates") },
    { to: "/servers", icon: Server, label: t("nav.servers") },
  ];

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border drag-region">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/20">
          <ShieldCheck className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground leading-none">OnliCert</p>
          <p className="text-xs text-muted-foreground mt-0.5">Manager</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end ?? false}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {isActive && <ChevronRight className="h-3 w-3 opacity-60" />}
              </>
            )}
          </NavLink>
        ))}

        {/* Divider */}
        <div className="my-3 border-t border-border" />

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )
          }
        >
          {({ isActive }) => (
            <>
              <Settings className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{t("nav.settings")}</span>
              {isActive && <ChevronRight className="h-3 w-3 opacity-60" />}
            </>
          )}
        </NavLink>
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3">
        <p className="text-xs text-muted-foreground text-center">
          v0.1.0 — Open Source
        </p>
      </div>
    </aside>
  );
}
