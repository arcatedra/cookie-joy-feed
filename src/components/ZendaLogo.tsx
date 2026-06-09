interface ZendaLogoProps {
  size?: number;
  showName?: boolean;
  nameClassName?: string;
  className?: string;
}

/**
 * Bold ZENDA logo — confident, modern, Amazon-style.
 * Flat geometric Z mark + bold sans-serif wordmark.
 */
export function ZendaMark({ size = 32, className }: { size?: number; className?: string }) {
  const r = 12; // corner radius
  const s = 100;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${s} ${s}`}
      className={className}
      aria-hidden="true"
    >
      {/* Bold rounded square background */}
      <rect
        x="2"
        y="2"
        width={s - 4}
        height={s - 4}
        rx={r}
        ry={r}
        fill="#f59e0b"
      />
      {/* Thick white Z */}
      <path
        d="M26 28 L74 28 L74 42 L42 42 L74 74 L74 58 L26 58 L26 72 L58 72 L26 40 Z"
        fill="white"
      />
    </svg>
  );
}

export function ZendaLogo({
  size = 34,
  showName = true,
  nameClassName = "text-lg font-extrabold tracking-tighter text-amber-400",
  className = "",
}: ZendaLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <ZendaMark size={size} />
      {showName && (
        <span className={nameClassName} style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
          ZENDA
        </span>
      )}
    </span>
  );
}

export default ZendaLogo;
