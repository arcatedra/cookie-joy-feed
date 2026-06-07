import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en/translation.json";
import es from "@/locales/es/translation.json";

export const SUPPORTED_LANGS = ["en", "es"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];
const STORAGE_KEY = "oys.lang";

function detectInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "es") return stored;
  } catch {
    /* ignore */
  }
  const nav = window.navigator?.language?.toLowerCase() ?? "";
  if (nav.startsWith("es")) return "es";
  return "en";
}

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        es: { translation: es },
      },
      lng: detectInitialLang(),
      fallbackLng: "en",
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });
}

export function setLanguage(lang: Lang) {
  i18n.changeLanguage(lang);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch {
      /* ignore */
    }
  }
}

export function getLocale(lang?: string): string {
  return (lang ?? i18n.language ?? "en").startsWith("es") ? "es-ES" : "en-US";
}

export function formatPrice(value: number, lang?: string): string {
  return new Intl.NumberFormat(getLocale(lang), {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function formatNumber(value: number, lang?: string): string {
  return new Intl.NumberFormat(getLocale(lang)).format(value);
}

export function formatDate(
  date: Date,
  opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" },
  lang?: string,
): string {
  return new Intl.DateTimeFormat(getLocale(lang), opts).format(date);
}

export default i18n;
