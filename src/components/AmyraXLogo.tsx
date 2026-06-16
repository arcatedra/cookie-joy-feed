import type { SVGProps } from "react";

interface AmyraXLogoProps {
  size?: number;
  showName?: boolean;
  showSymbol?: boolean;
  className?: string;
  nameClassName?: string;
}

/** Metallic outlined X symbol inspired by the AMYRAX brand mark */
export function AmyraXSymbol({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ax-metal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2a2a2a" />
          <stop offset="35%" stopColor="#4a4a4a" />
          <stop offset="50%" stopColor="#6a6a6a" />
          <stop offset="65%" stopColor="#3a3a3a" />
          <stop offset="100%" stopColor="#1a1a1a" />
        </linearGradient>
        <linearGradient id="ax-inner" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a1a1a" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </linearGradient>
      </defs>
      {/* Outer left stroke */}
      <path
        d="M14 18 L50 58 L50 62 L14 102 L26 102 L56 66 L56 54 L26 18 Z"
        fill="url(#ax-metal)"
      />
      {/* Outer right stroke */}
      <path
        d="M106 18 L70 58 L70 62 L106 102 L94 102 L64 66 L64 54 L94 18 Z"
        fill="url(#ax-metal)"
      />
      {/* Inner hollow left */}
      <path
        d="M26 24 L48 56 L48 64 L26 96 L22 96 L44 64 L44 56 L22 24 Z"
        fill="url(#ax-inner)"
      />
      {/* Inner hollow right */}
      <path
        d="M94 24 L72 56 L72 64 L94 96 L98 96 L76 64 L76 56 L98 24 Z"
        fill="url(#ax-inner)"
      />
    </svg>
  );
}

const GOLD = "#c9a84c";
const GOLD_DARK = "#8a7030";
const GOLD_LIGHT = "#e8d8a0";

export function AmyraXLogo({
  size = 28,
  showName = true,
  showSymbol = true,
  className = "",
  nameClassName = "text-[#c9a84c]",
}: AmyraXLogoProps) {
  if (!showName && !showSymbol) {
    return null;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {showSymbol && <AmyraXSymbol size={size} />}
      {showName && (
        <span
          className={`inline-flex items-baseline tracking-[0.15em] font-semibold ${nameClassName}`}
          style={{
            fontFamily: "'Cinzel', 'Cormorant Garamond', Georgia, serif",
            fontSize: size * 0.85,
            background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 50%, ${GOLD_DARK} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          AMYRAX
        </span>
      )}
    </span>
  );
}

export default AmyraXLogo;
