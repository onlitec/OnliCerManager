import { useTheme } from "@/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import { Moon, Sun, Monitor, Globe } from "lucide-react";
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

  const themeIcon = {
    dark: <Moon className="h-4 w-4" />,
    light: <Sun className="h-4 w-4" />,
    system: <Monitor className="h-4 w-4" />,
  }[theme];

  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-card/50 px-4 drag-region">
      <div className="flex items-center gap-2 no-drag">
        {/* Breadcrumb area (filled by pages in future) */}
      </div>

      <div className="flex items-center gap-1 no-drag">
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
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="mr-2 h-4 w-4" />
              {t("settings.theme.light")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="mr-2 h-4 w-4" />
              {t("settings.theme.dark")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Monitor className="mr-2 h-4 w-4" />
              {t("settings.theme.system")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
