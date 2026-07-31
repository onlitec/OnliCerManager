import { useTranslation } from "react-i18next";
import { Moon, Sun, Monitor, Globe, ShieldCheck, Info, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/providers/ThemeProvider";
import i18n from "@/i18n";
import { cn } from "@/lib/utils";

export function SettingsPage() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

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

  const themes = [
    { value: "light" as const, label: t("settings.theme.light"), icon: Sun },
    { value: "dark" as const, label: t("settings.theme.dark"), icon: Moon },
    { value: "system" as const, label: t("settings.theme.system"), icon: Monitor },
  ];

  const languages = [
    { code: "pt-BR", label: "🇧🇷 Português (BR)" },
    { code: "en-US", label: "🇺🇸 English (US)" },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.subtitle")}</p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.sections.appearance")}</CardTitle>
          <CardDescription>{t("settings.theme.label")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {themes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => { setTheme(value); }}
                className={cn(
                  "flex flex-1 flex-col items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-all",
                  theme === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-border/80 hover:bg-accent"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.sections.language")}</CardTitle>
          <CardDescription>{t("settings.language.label")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {languages.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => void i18n.changeLanguage(code)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-all",
                  i18n.language === code
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-border/80 hover:bg-accent"
                )}
              >
                <Globe className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            {t("settings.sections.about")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">OnliCert Manager</p>
              <p className="text-xs text-muted-foreground">{t("common.version")} 0.1.0 — MIT License</p>
            </div>
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground">
            Open Source certificate management with local CA support. Powered by OpenSSL.
          </p>
          <div className="flex gap-3 pt-1">
            <Button variant="default" size="sm" className="flex-1 gap-2" onClick={() => { void handleOpenPdfManual(); }}>
              <FileText className="h-4 w-4" />
              {t("help.userManual")}
            </Button>
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <a href="https://github.com/onlicert/manager" target="_blank" rel="noopener noreferrer">
                GitHub Repository
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
