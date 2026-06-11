import { useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Download, Link2 } from "lucide-react";

interface QRCodeSectionProps {
  url?: string;
}

export function QRCodeSection({ url = "https://origen.management" }: QRCodeSectionProps) {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement | null>(null);

  const handleDownload = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const urlObj = URL.createObjectURL(svgBlob);

    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 1024;
    canvas.width = size;
    canvas.height = size;

    img.onload = () => {
      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);

      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = "origen-qr-code.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(urlObj);
      toast.success(t("profile.qr.downloaded"));
    };
    img.onerror = () => {
      toast.error(t("profile.qr.downloadError"));
    };
    img.src = urlObj;
  }, [t]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("profile.qr.copied"));
    } catch {
      toast.error(t("profile.qr.copyError"));
    }
  }, [url, t]);

  return (
    <section className="mt-6 px-5">
      <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-foreground">
        {t("profile.qr.title")}
      </h3>
      <div className="mt-3 rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border flex flex-col items-center text-center">
        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-border">
          <QRCodeSVG
            ref={svgRef}
            value={url}
            size={180}
            level="M"
            bgColor="#ffffff"
            fgColor="#0f172a"
            includeMargin={false}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
          {t("profile.qr.description")}
        </p>
        <div className="mt-4 flex w-full gap-3">
          <button
            type="button"
            onClick={handleDownload}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition"
          >
            <Download className="h-4 w-4" />
            {t("profile.qr.download")}
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-card border border-border py-2.5 text-xs font-bold text-foreground shadow-sm hover:bg-accent transition"
          >
            <Link2 className="h-4 w-4" />
            {t("profile.qr.copyLink")}
          </button>
        </div>
      </div>
    </section>
  );
}
