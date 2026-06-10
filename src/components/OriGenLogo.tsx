interface OriGenLogoProps {
  /** Font size of the wordmark in px */
  size?: number;
  showName?: boolean;
  showTagline?: boolean;
  nameClassName?: string;
  taglineClassName?: string;
  className?: string;
}

/**
 * OriGen logo — gold crown perched on the "O" of an elegant serif "Origen"
 * wordmark, matching the brand reference (gold O + crown, navy "rigen").
 */
export function OriGenCrown({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size * 0.75}
      viewBox="0 0 120 90"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="origen-crown-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d9b45c" />
          <stop offset="50%" stopColor="#b3873e" />
          <stop offset="100%" stopColor="#8a6420" />
        </linearGradient>
      </defs>
      {/* tip balls */}
      <circle cx="14" cy="18" r="7" fill="url(#origen-crown-gold)" />
      <circle cx="60" cy="10" r="7" fill="url(#origen-crown-gold)" />
      <circle cx="106" cy="18" r="7" fill="url(#origen-crown-gold)" />
      {/* crown body */}
      <path
        d="M14 28 L38 48 L60 18 L82 48 L106 28 L97 68 L23 68 Z"
        fill="url(#origen-crown-gold)"
      />
      {/* base band */}
      <rect x="21" y="68" width="78" height="13" rx="5" fill="url(#origen-crown-gold)" />
      {/* white star detail */}
      <path
        d="M60 40 L63.2 49 L72 52.5 L63.2 56 L60 65 L56.8 56 L48 52.5 L56.8 49 Z"
        fill="#fdfaf2"
      />
    </svg>
  );
}

const serifStack = "'Cormorant Garamond', 'Cinzel', Georgia, serif";
const GOLD = "#b3873e";

export function OriGenLogo({
  size = 28,
  showName = true,
  showTagline = false,
  nameClassName = "text-[#1f3a5f]",
  taglineClassName = "text-[8px] tracking-[0.25em] text-[#1f3a5f]/70",
  className = "",
}: OriGenLogoProps) {
  if (!showName) {
    return <OriGenCrown size={size} className={className} />;
  }

  return (
    <span className={`inline-flex flex-col items-start ${className}`}>
      <span
        className={`relative inline-flex items-baseline leading-none ${nameClassName}`}
        style={{
          fontFamily: serifStack,
          fontWeight: 600,
          fontSize: size,
          paddingTop: size * 0.5,
        }}
      >
        <span className="relative inline-block">
          {/* Crown perched on the O, slightly tilted like the reference */}
          <span
            className="absolute left-1/2 -translate-x-[58%] -rotate-[10deg]"
            style={{ top: -size * 0.52 }}
          >
            <OriGenCrown size={size * 0.78} />
          </span>
          <span style={{ color: GOLD }}>O</span>
        </span>
        <span>rigen</span>
      </span>
      {showTagline && (
        <span
          className={taglineClassName}
          style={{ fontFamily: serifStack, fontStyle: "italic" }}
        >
          ALIMENTOS ARTESANALES
        </span>
      )}
    </span>
  );
}

export default OriGenLogo;
