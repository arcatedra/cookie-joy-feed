import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en/translation.json";
import es from "@/locales/es/translation.json";
import pt from "@/locales/pt/translation.json";
import de from "@/locales/de/translation.json";
import fil from "@/locales/fil/translation.json";

export const SUPPORTED_LANGS = ["en", "es", "pt", "de", "fil"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];
const STORAGE_KEY = "origen.lang";

const resources = {
  en: { translation: en },
  es: { translation: es },
  pt: { translation: pt },
  de: { translation: de },
  fil: { translation: fil },
};

export const LANG_META: Record<Lang, { label: string; nativeName: string; flag: string; locale: string }> = {
  en: { label: "EN", nativeName: "English", flag: "🇺🇸", locale: "en-US" },
  es: { label: "ES", nativeName: "Español", flag: "🇪🇸", locale: "es-ES" },
  pt: { label: "PT", nativeName: "Português (Brasil)", flag: "🇧🇷", locale: "pt-BR" },
  de: { label: "DE", nativeName: "Deutsch", flag: "🇩🇪", locale: "de-DE" },
  fil: { label: "FIL", nativeName: "Filipino", flag: "🇵🇭", locale: "fil-PH" },
};

function isSupported(value: string | null | undefined): value is Lang {
  return !!value && (SUPPORTED_LANGS as readonly string[]).includes(value);
}

function detectInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isSupported(stored)) return stored;
  } catch {
    /* ignore */
  }
  return "en";
}

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: "en", // SSR-stable; switched on the client after hydration
      fallbackLng: "en",
      initAsync: false,
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });
}

// Keep server/client bundles fresh after hot updates so SSR never renders raw keys.
SUPPORTED_LANGS.forEach((lang) => {
  i18n.addResourceBundle(lang, "translation", resources[lang].translation, true, true);
});

/** Call from a useEffect after hydration to switch to the user's preferred language. */
export function syncClientLanguage() {
  if (typeof window === "undefined") return;
  const preferred = detectInitialLang();
  if (preferred !== i18n.language) {
    void i18n.changeLanguage(preferred);
    try {
      document.documentElement.lang = preferred;
    } catch {
      /* ignore */
    }
  }
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
  const key = (lang ?? i18n.language ?? "en").slice(0, 3);
  const match = (Object.keys(LANG_META) as Lang[]).find((l) => key.startsWith(l));
  return match ? LANG_META[match].locale : "en-US";
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
