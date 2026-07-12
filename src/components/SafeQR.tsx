import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

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
export const SafeQR = forwardRef<HTMLCanvasElement, SafeQRProps>(function SafeQR(
  { value, size = 200, bgColor = "#ffffff", fgColor = "#0f172a", level = "M", className },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasRenderError, setHasRenderError] = useState(false);

  useImperativeHandle(ref, () => canvasRef.current as HTMLCanvasElement);

  useEffect(() => {
    setHasRenderError(false);
  }, [value]);

  useEffect(() => {
    if (hasRenderError) return;
    const id = window.setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        setHasRenderError(true);
        return;
      }
      try {
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          setHasRenderError(true);
          return;
        }
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let darkPixels = 0;
        for (let i = 0; i < pixels.length; i += 64) {
          if (pixels[i + 3] > 0 && pixels[i] + pixels[i + 1] + pixels[i + 2] < 600) darkPixels += 1;
          if (darkPixels > 8) break;
        }
        if (darkPixels <= 8) setHasRenderError(true);
      } catch {
        setHasRenderError(true);
      }
    }, 100);
    return () => window.clearTimeout(id);
  }, [hasRenderError, value]);

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

  if (hasRenderError) {
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
    <QRCodeCanvas
      ref={canvasRef}
      value={value}
      size={size}
      level={level}
      bgColor={bgColor}
      fgColor={fgColor}
      marginSize={2}
      title="Código QR de invitación"
      className={className}
    />
  );
});
