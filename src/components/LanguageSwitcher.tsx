import { useTranslation } from "react-i18next";
import { Check, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LANG_META, SUPPORTED_LANGS, setLanguage, type Lang } from "@/i18n";

interface Props {
  className?: string;
  variant?: "light" | "dark";
}

export function LanguageSwitcher({ className = "", variant = "dark" }: Props) {
  const { i18n, t } = useTranslation();
  const raw = (i18n.language ?? "en").toLowerCase();
  const current = ((SUPPORTED_LANGS as readonly string[]).find((l) =>
    raw.startsWith(l),
  ) ?? "en") as Lang;
  const meta = LANG_META[current];

  const triggerLight =
    "bg-primary/10 text-primary hover:bg-primary/15 border-primary/20";
  const triggerDark =
    "bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 border-primary-foreground/20";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("language.switchTo")}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
          variant === "dark" ? triggerDark : triggerLight
        } ${className}`}
      >
        <Globe className="h-3.5 w-3.5" aria-hidden />
        <span>{meta.label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[12rem]">
        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
          {t("language.switchTo")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SUPPORTED_LANGS.map((lang) => {
          const m = LANG_META[lang];
          const active = lang === current;
          return (
            <DropdownMenuItem
              key={lang}
              onSelect={() => {
                if (!active) setLanguage(lang);
              }}
              aria-pressed={active}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="flex items-center gap-2">
                <span aria-hidden className="text-base leading-none">
                  {m.flag}
                </span>
                <span className="font-medium">{m.nativeName}</span>
                <span className="text-xs text-muted-foreground">{m.label}</span>
              </span>
              {active ? (
                <Check className="h-4 w-4 text-primary" aria-hidden />
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
