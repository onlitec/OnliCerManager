import { useTheme } from "@/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Moon, Sun, Monitor, Globe, HelpCircle, FileText, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import i18n from "@/i18n";

export function Titlebar() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();

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
      <div className="flex items-center gap-2 no-drag">
        {/* Breadcrumb area */}
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
