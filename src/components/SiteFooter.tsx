import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import hazorexSymbolAsset from "@/assets/hazorex-symbol-gold-transparent.png.asset.json";

const hazorexSymbolUrl = hazorexSymbolAsset.url;

export function SiteFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-[#C8862E]/40 bg-[#1e3a5f] text-white">
      <div className="mx-auto max-w-[1500px] px-4 py-10 md:px-6 md:py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 md:col-span-2">
            <Link to="/" className="flex items-center gap-1.5" aria-label="HAZOREX">
              <img
                src={hazorexSymbolUrl}
                alt=""
                className="h-10 w-auto select-none object-contain"
                draggable={false}
              />
              <span className="text-2xl font-black leading-none tracking-[0.15em] text-[#E6C35C]">
                HAZOREX
              </span>
            </Link>
            <p className="mt-3 max-w-sm font-serif text-sm leading-relaxed text-white/75">
              {t(
                "footer.tagline",
                "Galletas premium con sorteos diarios 100% verificables. Cada compra te da acceso al sorteo del día.",
              )}
            </p>
          </div>

          {/* Tienda */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#E6C35C]">
              {t("footer.shop", "Tienda")}
            </h3>
            <ul className="mt-3 space-y-2 font-serif text-sm">
              <li><Link to="/shop" className="text-white/80 hover:text-[#E6C35C]">{t("footer.allCookies", "Galletas")}</Link></li>
              <li><Link to="/ruleta" className="text-white/80 hover:text-[#E6C35C]">{t("footer.roulette", "Ruleta del día")}</Link></li>
              <li><Link to="/subscribe" className="text-white/80 hover:text-[#E6C35C]">{t("footer.subscribe", "Suscripción")}</Link></li>
              <li><Link to="/explore" className="text-white/80 hover:text-[#E6C35C]">{t("footer.explore", "Explorar")}</Link></li>
            </ul>
          </div>

          {/* Cuenta */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#E6C35C]">
              {t("footer.account", "Cuenta")}
            </h3>
            <ul className="mt-3 space-y-2 font-serif text-sm">
              <li><Link to="/profile" className="text-white/80 hover:text-[#E6C35C]">{t("footer.profile", "Mi perfil")}</Link></li>
              <li><Link to="/historial" className="text-white/80 hover:text-[#E6C35C]">{t("footer.history", "Historial")}</Link></li>
              <li><Link to="/deliveries" className="text-white/80 hover:text-[#E6C35C]">{t("footer.deliveries", "Entregas")}</Link></li>
              <li><Link to="/auth" className="text-white/80 hover:text-[#E6C35C]">{t("footer.signIn", "Iniciar sesión")}</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#E6C35C]">
              {t("footer.legal", "Legal")}
            </h3>
            <ul className="mt-3 space-y-2 font-serif text-sm">
              <li><Link to="/terminos" className="text-white/80 hover:text-[#E6C35C]">{t("footer.terms", "Términos")}</Link></li>
              <li><Link to="/privacidad" className="text-white/80 hover:text-[#E6C35C]">{t("footer.privacy", "Privacidad")}</Link></li>
              <li><Link to="/sweepstakes-rules" className="text-white/80 hover:text-[#E6C35C]">{t("footer.rules", "Reglas del sorteo")}</Link></li>
              <li><Link to="/trust" className="text-white/80 hover:text-[#E6C35C]">{t("footer.trust", "Confianza")}</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 md:flex-row md:items-center">
          <p className="font-serif text-xs text-white/60">
            © {year} HAZOREX. {t("footer.rights", "Todos los derechos reservados.")}
          </p>
          <LanguageSwitcher />
        </div>
      </div>
    </footer>
  );
}
