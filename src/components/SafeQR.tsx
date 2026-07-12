import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface SafeQRProps {
  value: string;
  size?: number;
  bgColor?: string;
  fgColor?: string;
  level?: "L" | "M" | "Q" | "H";
  className?: string;
}

/**
 * Renders a QR code with an <img> fallback (api.qrserver.com) when the
 * primary SVG generator fails to output a drawable code. Never leaves a
 * blank/white square: shows a visible error message as last resort.
 */
export const SafeQR = forwardRef<SVGSVGElement, SafeQRProps>(function SafeQR(
  { value, size = 200, bgColor = "#ffffff", fgColor = "#0f172a", level = "M", className },
  ref,
) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [mode, setMode] = useState<"svg" | "img" | "error">("svg");

  useImperativeHandle(ref, () => svgRef.current as SVGSVGElement);

  useEffect(() => {
    setMode("svg");
  }, [value]);

  useEffect(() => {
    if (mode !== "svg") return;
    // Wait a tick to let qrcode.react paint, then verify it produced paths.
    const id = window.setTimeout(() => {
      const svg = svgRef.current;
      const hasContent =
        !!svg &&
        (svg.querySelector("path") ||
          svg.querySelector("rect:not(:first-child)") ||
          svg.children.length > 1);
      if (!hasContent) setMode("img");
    }, 50);
    return () => window.clearTimeout(id);
  }, [mode, value]);

  const hasValue = typeof value === "string" && value.length > 0;

  if (!hasValue) {
    return (
      <div
        className={className}
        style={{ width: size, height: size }}
        role="img"
        aria-label="Código QR no disponible"
      >
        <div className="flex h-full w-full items-center justify-center rounded bg-red-50 p-2 text-center text-[11px] font-semibold text-red-600">
          No se pudo generar el código QR
        </div>
      </div>
    );
  }

  if (mode === "img") {
    const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=0&data=${encodeURIComponent(
      value,
    )}`;
    return (
      <img
        src={src}
        width={size}
        height={size}
        alt="Código QR de invitación"
        className={className}
        onError={() => setMode("error")}
      />
    );
  }

  if (mode === "error") {
    return (
      <div
        className={className}
        style={{ width: size, height: size }}
        role="img"
        aria-label="Código QR no disponible"
      >
        <div className="flex h-full w-full items-center justify-center rounded bg-red-50 p-2 text-center text-[11px] font-semibold text-red-600">
          No se pudo generar el código QR. Copia el enlace manualmente.
        </div>
      </div>
    );
  }

  return (
    <QRCodeSVG
      ref={svgRef}
      value={value}
      size={size}
      level={level}
      bgColor={bgColor}
      fgColor={fgColor}
      marginSize={0}
      className={className}
    />
  );
});
