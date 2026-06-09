import type { CSSProperties } from "react";

interface ZendaLogoProps {
  size?: number;
  showName?: boolean;
  nameClassName?: string;
  tagline?: string;
  taglineClassName?: string;
  starOnly?: boolean;
  className?: string;
}

/**
 * Elegant ZENDA logo: gold engraved 5-point star + serif wordmark.
 * Inspired by the artisanal navy + gold packaging.
 */
export function ZendaStar({ size = 32, className }: { size?: number; className?: string }) {
  const gradId = `zenda-gold-${size}`;
  const shineId = `zenda-shine-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f7e7a8" />
          <stop offset="35%" stopColor="#d4a83a" />
          <stop offset="65%" stopColor="#b8862a" />
          <stop offset="100%" stopColor="#7a5618" />
        </linearGradient>
        <linearGradient id={shineId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff4c2" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#d4a83a" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {/* Outer star outline */}
      <polygon
        points="50,4 61.8,38.2 97.5,38.2 68.8,59.3 79.6,93.5 50,72.4 20.4,93.5 31.2,59.3 2.5,38.2 38.2,38.2"
        fill={`url(#${gradId})`}
        stroke="#7a5618"
        strokeWidth="0.6"
        strokeLinejoin="miter"
      />
      {/* Faceted highlight - left half of each point catching light */}
      <polygon
        points="50,4 50,50 38.2,38.2"
        fill={`url(#${shineId})`}
      />
      <polygon
        points="50,50 61.8,38.2 97.5,38.2 68.8,59.3"
        fill="#a07520"
        fillOpacity="0.35"
      />
      <polygon
        points="50,50 68.8,59.3 79.6,93.5"
        fill={`url(#${shineId})`}
        opacity="0.55"
      />
      <polygon
        points="50,50 79.6,93.5 50,72.4"
        fill="#a07520"
        fillOpacity="0.4"
      />
      <polygon
        points="50,50 50,72.4 20.4,93.5"
        fill={`url(#${shineId})`}
        opacity="0.5"
      />
      <polygon
        points="50,50 20.4,93.5 31.2,59.3"
        fill="#a07520"
        fillOpacity="0.35"
      />
      <polygon
        points="50,50 31.2,59.3 2.5,38.2"
        fill={`url(#${shineId})`}
        opacity="0.55"
      />
      <polygon
        points="50,50 2.5,38.2 38.2,38.2"
        fill="#a07520"
        fillOpacity="0.4"
      />
    </svg>
  );
}

const serifStyle: CSSProperties = {
  fontFamily: '"Cinzel", "Cormorant Garamond", "Playfair Display", Georgia, serif',
  letterSpacing: "0.32em",
  fontWeight: 600,
};

const taglineStyle: CSSProperties = {
  fontFamily: '"Cinzel", "Cormorant Garamond", Georgia, serif',
  letterSpacing: "0.22em",
  fontWeight: 400,
};

export function ZendaLogo({
  size = 34,
  showName = true,
  nameClassName = "text-lg text-amber-300",
  tagline,
  taglineClassName = "text-[8px] text-amber-200/80",
  className = "",
}: ZendaLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <ZendaStar size={size} />
      {showName && (
        <span className="flex flex-col leading-none">
          <span className={nameClassName} style={serifStyle}>
            ZENDA
          </span>
          {tagline && (
            <span
              className={`mt-1 ${taglineClassName}`}
              style={taglineStyle}
            >
              {tagline}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

export default ZendaLogo;
