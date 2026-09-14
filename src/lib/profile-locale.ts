import { supabase } from "@/integrations/supabase/client";
import i18n from "i18next";

const SYNCED_KEY = "hazorex_locale_synced";

/**
 * Guarda en el perfil el idioma que la persona está usando en la web,
 * para poder enviarle los avisos (push) en su idioma.
 * Se ejecuta como mucho una vez por sesión y nunca bloquea la interfaz.
 */
export async function syncProfileLocale(): Promise<void> {
  if (typeof window === "undefined") return;
  const lang = (i18n.language || "es").slice(0, 5);
  try {
    if (window.sessionStorage.getItem(SYNCED_KEY) === lang) return;
  } catch {
    /* ignore */
  }

  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return;

    await supabase.from("profiles").update({ locale: lang }).eq("id", userId);

    try {
      window.sessionStorage.setItem(SYNCED_KEY, lang);
    } catch {
      /* ignore */
    }
  } catch {
    /* si falla, no pasa nada: se usa español por defecto */
  }
}
