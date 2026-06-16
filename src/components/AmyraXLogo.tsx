import logoAsset from "@/assets/amyrax-logo-official.png.asset.json";

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

/** Variante símbolo (misma imagen, recortada al cuadrado superior si se quiere) */
export function AmyraXSymbol({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={logoAsset.url}
      alt="AMYRAX"
      draggable={false}
      className={`block select-none object-contain ${className}`}
      style={{ height: size, width: size }}
    />
  );
}

export default AmyraXLogo;
