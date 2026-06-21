import logoUrl from "@/assets/hazorex-logo-transparent.png";
import symbolUrl from "@/assets/hazorex-symbol-only.png";

const logoAsset = { url: logoUrl };
const symbolAsset = { url: symbolUrl };

interface HazorexLogoProps {
  size?: number;
  className?: string;
  showName?: boolean;
  showSymbol?: boolean;
  nameClassName?: string;
}

/**
 * HAZOREX — logo oficial (imagen real generada a partir del logo subido).
 * Se muestra tal cual, sin contenedor visible, integrado en el header oscuro.
 */
export function HazorexLogo({ size = 40, className = "" }: HazorexLogoProps) {
  return (
    <img
      src={logoAsset.url}
      alt="HAZOREX"
      draggable={false}
      className={`block h-auto w-auto select-none object-contain ${className}`}
      style={{ height: size }}
    />
  );
}

/** Variante símbolo solo (X entrelazada sin texto) — imagen ya editada limpia */
export function HazorexSymbol({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={symbolAsset.url}
      alt="HAZOREX"
      draggable={false}
      className={`block select-none object-contain ${className}`}
      style={{ height: size, width: size }}
    />
  );
}

/**
 * Símbolo solo (X entrelazada) — recorta la imagen para mostrar solo la parte superior
 * donde está el símbolo, ocultando el texto "HAZOREX" de la imagen.
 */
export function HazorexSymbolOnly({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={logoAsset.url}
        alt=""
        draggable={false}
        className="absolute left-1/2 top-0 block select-none"
        style={{
          height: size * 2.2,
          width: "auto",
          transform: "translateX(-50%)",
          objectFit: "cover",
          objectPosition: "top center",
        }}
      />
    </div>
  );
}

export default HazorexLogo;
