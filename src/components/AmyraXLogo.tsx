import logoAsset from "@/assets/omyrax-logo.jpeg.asset.json";

interface AmyraXLogoProps {
  size?: number;
  className?: string;
  /** Deprecated — el logo es una imagen fija, esta prop se ignora */
  showName?: boolean;
  showSymbol?: boolean;
  nameClassName?: string;
}

/**
 * OMYRAX — logo oficial (imagen real).
 * Se renderiza dentro de un cuadro obsidiana para preservar
 * el acabado tridimensional plateado de la X y el oro cobrizo
 * del texto OMYRAX sobre cualquier fondo de la UI.
 *
 * Regla: NO modificar ni distorsionar el isotipo.
 */
export function AmyraXLogo({ size = 28, className = "" }: AmyraXLogoProps) {
  // El logo oficial es cuadrado-ish (X grande + OMYRAX). Usamos un contenedor compacto.
  const boxSize = size * 1.6;

  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden rounded-md bg-[#0B0B0F] ring-1 ring-[#C8862E]/40 shadow-[0_2px_10px_-2px_rgba(200,134,46,0.35)] ${className}`}
      style={{ height: boxSize, width: boxSize }}
      aria-label="OMYRAX"
    >
      <img
        src={logoAsset.url}
        alt="OMYRAX"
        draggable={false}
        className="h-full w-full select-none object-contain"
        style={{ padding: 2 }}
      />
    </span>
  );
}

/** Variante solo símbolo (mismo asset, igual de fiel al original) */
export function AmyraXSymbol({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden rounded-md bg-[#0B0B0F] ring-1 ring-[#C8862E]/40 ${className}`}
      style={{ height: size, width: size }}
      aria-label="OMYRAX"
    >
      <img
        src={logoAsset.url}
        alt="OMYRAX"
        draggable={false}
        className="h-full w-full select-none object-contain"
      />
    </span>
  );
}

export default AmyraXLogo;
