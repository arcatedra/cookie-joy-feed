interface ZendaLogoProps {
  size?: number;
  showName?: boolean;
  showTagline?: boolean;
  nameClassName?: string;
  taglineClassName?: string;
  starClassName?: string;
  layout?: "horizontal" | "vertical";
  className?: string;
}

/**
 * ZENDA logo — elegant gold-foil star + serif wordmark, ORIGEN-inspired.
 */
export function ZendaStar({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="zenda-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f7e7a8" />
          <stop offset="45%" stopColor="#d4a84a" />
          <stop offset="100%" stopColor="#7a5618" />
        </linearGradient>
        <linearGradient id="zenda-gold-shine" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fff4c2" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#e8c769" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#8a6420" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {/* 5-point star with faceted highlights */}
      <polygon
        points="50,6 61,38 95,38 67,58 78,92 50,72 22,92 33,58 5,38 39,38"
        fill="url(#zenda-gold)"
        stroke="#5a3f12"
        strokeWidth="1"
        strokeLinejoin="miter"
      />
      <polygon
        points="50,6 61,38 50,50 39,38"
        fill="url(#zenda-gold-shine)"
        opacity="0.85"
      />
      <polygon
        points="50,50 67,58 50,72 33,58"
        fill="#fff4c2"
        opacity="0.25"
      />
    </svg>
  );
}

export function ZendaLogo({
  size = 34,
  showName = true,
  showTagline = false,
  nameClassName = "text-lg font-bold tracking-[0.18em] text-amber-400",
  taglineClassName = "text-[8px] tracking-[0.25em] text-amber-300/80",
  starClassName,
  layout = "horizontal",
  className = "",
}: ZendaLogoProps) {
  const serifStack = "'Cinzel', 'Cormorant Garamond', 'Playfair Display', Georgia, serif";

  if (layout === "vertical") {
    return (
      <span className={`inline-flex flex-col items-center gap-1 ${className}`}>
        <ZendaStar size={size} className={starClassName} />
        {showName && (
          <span className={nameClassName} style={{ fontFamily: serifStack }}>
            ZENDA
          </span>
        )}
        {showTagline && (
          <span className="flex flex-col items-center leading-tight">
            <span className={taglineClassName} style={{ fontFamily: serifStack, fontStyle: "italic" }}>
              ALIMENTOS ARTESANALES DE CALIDAD
            </span>
            <span className={taglineClassName} style={{ fontFamily: serifStack, fontStyle: "italic" }}>
              PANADERÍA REFINADA CO.
            </span>
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <ZendaStar size={size} className={starClassName} />
      <span className="flex flex-col leading-none">
        {showName && (
          <span className={nameClassName} style={{ fontFamily: serifStack }}>
            ZENDA
          </span>
        )}
        {showTagline && (
          <span className={`${taglineClassName} mt-0.5`} style={{ fontFamily: serifStack, fontStyle: "italic" }}>
            ALIMENTOS ARTESANALES
          </span>
        )}
      </span>
    </span>
  );
}

export default ZendaLogo;
