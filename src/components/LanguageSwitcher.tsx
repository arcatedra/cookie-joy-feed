import { useTranslation } from "react-i18next";
import { setLanguage, type Lang } from "@/i18n";

interface Props {
  className?: string;
  variant?: "light" | "dark";
}

export function LanguageSwitcher({ className = "", variant = "dark" }: Props) {
  const { i18n, t } = useTranslation();
  const current = (i18n.language?.startsWith("es") ? "es" : "en") as Lang;

  const baseBtn =
    "px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors";
  const activeCls =
    variant === "dark"
      ? "bg-primary-foreground text-primary"
      : "bg-primary text-primary-foreground";
  const inactiveCls =
    variant === "dark"
      ? "text-primary-foreground/60 hover:text-primary-foreground"
      : "text-primary/60 hover:text-primary";

  const change = (l: Lang) => {
    if (l !== current) setLanguage(l);
  };

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-lg ${
        variant === "dark" ? "bg-primary-foreground/10" : "bg-primary/10"
      } p-0.5 ${className}`}
      role="group"
      aria-label={t("language.switchTo")}
    >
      <button
        type="button"
        onClick={() => change("es")}
        aria-label={t("language.spanish")}
        aria-pressed={current === "es"}
        className={`${baseBtn} ${current === "es" ? activeCls : inactiveCls}`}
      >
        ES
      </button>
      <span className={variant === "dark" ? "text-primary-foreground/30" : "text-primary/30"}>
        |
      </span>
      <button
        type="button"
        onClick={() => change("en")}
        aria-label={t("language.english")}
        aria-pressed={current === "en"}
        className={`${baseBtn} ${current === "en" ? activeCls : inactiveCls}`}
      >
        EN
      </button>
    </div>
  );
}
