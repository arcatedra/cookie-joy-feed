import logoAsset from "@/assets/amyrax-logo.jpeg.asset.json";

interface AmyraXLogoProps {
  size?: number;
  showName?: boolean;
  showSymbol?: boolean;
  className?: string;
  /** Ignored — kept for backward compatibility with previous API */
  nameClassName?: string;
}

/**
 * Official AMYRAX brand mark — uses the real uploaded logo image.
 * The image already contains the metallic X + "OMYRAX" wordmark,
 * so we render it as-is to guarantee an identical look everywhere.
 */
export function AmyraXLogo({
  size = 28,
  className = "",
}: AmyraXLogoProps) {
  // The source image is roughly square; render at ~2.6× the requested
  // base size so the wordmark stays readable next to nav text.
  const width = Math.round(size * 2.6);
  const height = Math.round(size * 2.6);

  return (
    <span
      className={`inline-flex items-center ${className}`}
      style={{ height }}
    >
      <img
        src={logoAsset.url}
        alt="AMYRAX"
        width={width}
        height={height}
        className="block h-full w-auto object-contain select-none"
        draggable={false}
      />
    </span>
  );
}

/** Symbol-only variant — same image, no separate SVG */
export function AmyraXSymbol({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={logoAsset.url}
      alt="AMYRAX"
      width={size}
      height={size}
      className={`inline-block object-contain select-none ${className}`}
      draggable={false}
    />
  );
}

export default AmyraXLogo;
