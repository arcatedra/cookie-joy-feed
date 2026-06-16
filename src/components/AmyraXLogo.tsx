interface AmyraXLogoProps {
  size?: number;
  className?: string;
  showName?: boolean;
  /** @deprecated kept for backward compat */
  showSymbol?: boolean;
  nameClassName?: string;
}

/**
 * AMYRAX — logo oficial integrado en el header.
 * Símbolo (Y + X entrelazadas) en Oro Cobrizo + wordmark AMYRAX.
 * Sin contenedor visible. Vive sobre fondos oscuros.
 */
export function AmyraXLogo({
  size = 36,
  className = "",
  showName = true,
  nameClassName = "",
}: AmyraXLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="AMYRAX">
      <AmyraXSymbol size={size} />
      {showName && (
        <span
          className={`select-none font-semibold leading-none text-[#C8862E] ${nameClassName}`}
          style={{
            fontSize: size * 0.58,
            letterSpacing: "0.22em",
            fontFamily:
              '"Plus Jakarta Sans", "Helvetica Neue", system-ui, sans-serif',
            textShadow: "0 1px 0 rgba(0,0,0,0.5)",
          }}
        >
          AMYRAX
        </span>
      )}
    </span>
  );
}

/** Símbolo Y+X entrelazado, acabado oro cobrizo, sin fondo. */
export function AmyraXSymbol({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="amyraxGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F2C879" />
          <stop offset="35%" stopColor="#D9A24A" />
          <stop offset="65%" stopColor="#A86A1F" />
          <stop offset="100%" stopColor="#6E4312" />
        </linearGradient>
        <linearGradient id="amyraxGoldStroke" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F8DDA0" />
          <stop offset="100%" stopColor="#7A4A14" />
        </linearGradient>
      </defs>

      {/* Y (parte superior izquierda) — trazo hueco biselado */}
      <path
        d="M14 12 L40 50 L40 88 L48 88 L48 50 L74 12 L66 12 L44 44 L22 12 Z"
        fill="url(#amyraxGold)"
        stroke="url(#amyraxGoldStroke)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* X (sobrepuesta, entrelazada) */}
      <path
        d="M20 22 L28 22 L50 52 L72 22 L80 22 L56 56 L80 90 L72 90 L50 60 L28 90 L20 90 L44 56 Z"
        fill="url(#amyraxGold)"
        stroke="url(#amyraxGoldStroke)"
        strokeWidth="1.2"
        strokeLinejoin="round"
        opacity="0.95"
      />
    </svg>
  );
}

export default AmyraXLogo;
