import logoImage from "@/assets/amyrax-logo-new.png";

interface AmyraXLogoProps {
  size?: number;
  showName?: boolean;
  showSymbol?: boolean;
  className?: string;
  /** Ignored — kept for backward compatibility with previous API */
  nameClassName?: string;
}

/**
 * Official AMYRAX brand mark — updated with terracotta/copper palette
 * that matches the site's design tokens (#4A3525 brown/terracotta).
 * Transparent PNG works on any background: dark blue navbar, cream pages,
 * white cards, etc.
 */
export function AmyraXLogo({
  size = 28,
  className = "",
}: AmyraXLogoProps) {
  // The source image is landscape (~2:1); render at ~2.6× the requested
  // base size so the wordmark stays readable next to nav text.
  const width = Math.round(size * 2.6);
  const height = Math.round(size * 1.1);

  return (
    <span
      className={`inline-flex items-center ${className}`}
      style={{ height }}
    >
      <img
        src={logoImage}
        alt="AMYRAX"
        width={width}
        height={height}
        className="block h-full w-auto object-contain select-none"
        draggable={false}
      />
    </span>
  );
}

/** Symbol-only variant — same image, cropped feel via sizing */
export function AmyraXSymbol({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={logoImage}
      alt="AMYRAX"
      width={size}
      height={size}
      className={`inline-block object-contain select-none ${className}`}
      draggable={false}
    />
  );
}

export default AmyraXLogo;
