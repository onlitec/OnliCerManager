import { useEffect, useState } from "react";
import { useTheme } from "@/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Moon, Sun, Monitor, Globe, HelpCircle, FileText, Info, ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CertificateAuthority } from "@onlicert/core";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import i18n from "@/i18n";

/** Route path → i18n key for the nav label shown in the titlebar. */
const ROUTE_TITLES: Record<string, string> = {
  "/": "nav.dashboard",
  "/ca": "nav.ca",
  "/certificates": "nav.certificates",
  "/servers": "nav.servers",
  "/settings": "nav.settings",
  "/help": "nav.help",
};

export function Titlebar() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [ca, setCa] = useState<CertificateAuthority | null>(null);

  // Refreshed on navigation so creating a CA updates the indicator without a restart.
  useEffect(() => {
    const loadCA = async () => {
      try {
        setCa(await window.electron.invoke<CertificateAuthority | null>("ca:get"));
      } catch {
        setCa(null);
      }
    };
    void loadCA();
  }, [location.pathname]);

  const titleKey = ROUTE_TITLES[location.pathname];

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

  const themeIcon = {
    dark: <Moon className="h-4 w-4" />,
    light: <Sun className="h-4 w-4" />,
    system: <Monitor className="h-4 w-4" />,
  }[theme];

  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-card/50 px-4 drag-region">
      {/* Current location + CA health, so both are visible from every page */}
      <div className="flex min-w-0 items-center gap-3 no-drag">
        {titleKey !== undefined && (
          <span className="truncate text-sm font-medium text-foreground">{t(titleKey)}</span>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => { void navigate("/ca"); }}
              className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                ca
                  ? "border-green-500/30 bg-green-500/10 text-green-500 hover:bg-green-500/20"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
              }`}
            >
              {ca ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
              <span className="max-w-[180px] truncate">
                {ca ? ca.commonName : t("dashboard.caStatus.none")}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {ca ? t("ca.title") : t("errors.caRequired")}
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex items-center gap-1 no-drag">
        {/* Help Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title={t("help.title")}>
              <HelpCircle className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { void handleOpenPdfManual(); }}>
              <FileText className="mr-2 h-4 w-4 text-primary" />
              {t("help.userManual")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { void navigate("/help"); }}>
              <Info className="mr-2 h-4 w-4 text-muted-foreground" />
              {t("help.title")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Language toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Language / Idioma">
              <Globe className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => void i18n.changeLanguage("pt-BR")}>
              🇧🇷 Português (BR)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void i18n.changeLanguage("en-US")}>
              🇺🇸 English (US)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" title={t("settings.theme.label")}>
              {themeIcon}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setTheme("light"); }}>
              <Sun className="mr-2 h-4 w-4" />
              {t("settings.theme.light")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setTheme("dark"); }}>
              <Moon className="mr-2 h-4 w-4" />
              {t("settings.theme.dark")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setTheme("system"); }}>
              <Monitor className="mr-2 h-4 w-4" />
              {t("settings.theme.system")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
