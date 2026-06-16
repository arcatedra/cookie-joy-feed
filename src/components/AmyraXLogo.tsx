import logoUrl from "@/assets/amyrax-logo-transparent.png";
import symbolUrl from "@/assets/amyrax-symbol-only.png";

const logoAsset = { url: logoUrl };
const symbolAsset = { url: symbolUrl };

interface AmyraXLogoProps {
  size?: number;
  className?: string;
  showName?: boolean;
  showSymbol?: boolean;
  nameClassName?: string;
}

/**
 * AMYRAX — logo oficial (imagen real subida por el usuario).
 * Se muestra tal cual, sin contenedor visible, integrado en el header oscuro.
 */
export function AmyraXLogo({ size = 40, className = "" }: AmyraXLogoProps) {
  return (
    <img
      src={logoAsset.url}
      alt="AMYRAX"
      draggable={false}
      className={`block h-auto w-auto select-none object-contain ${className}`}
      style={{ height: size }}
    />
  );
}

/** Variante símbolo solo (Y+X sin texto) — imagen ya editada limpia */
export function AmyraXSymbol({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={symbolAsset.url}
      alt="AMYRAX"
      draggable={false}
      className={`block select-none object-contain ${className}`}
      style={{ height: size, width: size }}
    />
  );
}

/**
 * Símbolo solo (Y+X) — recorta la imagen para mostrar solo la parte superior
 * donde está el símbolo, ocultando el texto "AMYRAX" de la imagen.
 */
export function AmyraXSymbolOnly({
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

export default AmyraXLogo;
