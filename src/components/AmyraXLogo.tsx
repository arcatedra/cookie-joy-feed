interface AmyraXLogoProps {
  size?: number;
  showName?: boolean;
  showSymbol?: boolean;
  className?: string;
  nameClassName?: string;
}

/**
 * AMYRAX logo — SVG nativo con paleta de la web.
 *
 * Colores:
 *  • X metálica: degradado plateado → dorado suave
 *  • Texto AMYRAX: terracota #C45A3A (contrasta sobre azul #1E3A8A y crema #F4F1EA)
 *  • Fondo: 100 % transparente
 */
export function AmyraXLogo({
  size = 28,
  className = "",
}: AmyraXLogoProps) {
  const height = size * 1.15;
  const width = size * 3.4;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 340 115"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none ${className}`}
      aria-label="AMYRAX"
    >
      <defs>
        {/* Degradado metálico para la X */}
        <linearGradient id="xMetal" x1="0" y1="0" x2="115" y2="115" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E8E8E8" />
          <stop offset="30%" stopColor="#C0C0C0" />
          <stop offset="50%" stopColor="#F5F5F5" />
          <stop offset="70%" stopColor="#A8A8A8" />
          <stop offset="100%" stopColor="#D4AF37" />
        </linearGradient>

        {/* Sombra sutil para la X (garantiza contraste en cualquier fondo) */}
        <filter id="xShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.25" />
        </filter>

        {/* Degradado terracota-dorado para el texto */}
        <linearGradient id="textGrad" x1="125" y1="0" x2="340" y2="115" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D2691E" />
          <stop offset="50%" stopColor="#C45A3A" />
          <stop offset="100%" stopColor="#8B3A1A" />
        </linearGradient>

        {/* Sombra sutil para el texto */}
        <filter id="textShadow" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.2" />
        </filter>
      </defs>

      {/* X estilizada */}
      <g filter="url(#xShadow)">
        <path
          d="M10 10 L45 55 L10 105 L35 105 L57.5 72.5 L80 105 L105 105 L70 55 L105 10 L80 10 L57.5 37.5 L35 10 Z"
          fill="url(#xMetal)"
        />
      </g>

      {/* Texto AMYRAX */}
      <g filter="url(#textShadow)">
        <text
          x="125"
          y="78"
          fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
          fontSize="58"
          fontWeight="800"
          letterSpacing="3"
          fill="url(#textGrad)"
        >
          AMYRAX
        </text>
      </g>
    </svg>
  );
}

/** Variante solo-símbolo (la X) */
export function AmyraXSymbol({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 115 115"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none ${className}`}
      aria-label="AMYRAX"
    >
      <defs>
        <linearGradient id="xMetalSym" x1="0" y1="0" x2="115" y2="115" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E8E8E8" />
          <stop offset="30%" stopColor="#C0C0C0" />
          <stop offset="50%" stopColor="#F5F5F5" />
          <stop offset="70%" stopColor="#A8A8A8" />
          <stop offset="100%" stopColor="#D4AF37" />
        </linearGradient>
        <filter id="xShadowSym" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.25" />
        </filter>
      </defs>
      <g filter="url(#xShadowSym)">
        <path
          d="M10 10 L45 55 L10 105 L35 105 L57.5 72.5 L80 105 L105 105 L70 55 L105 10 L80 10 L57.5 37.5 L35 10 Z"
          fill="url(#xMetalSym)"
        />
      </g>
    </svg>
  );
}

export default AmyraXLogo;
