import { useRef, useCallback } from "react";
import { SafeQR } from "@/components/SafeQR";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Download, Link2 } from "lucide-react";

interface QRCodeSectionProps {
  url?: string;
}

export function QRCodeSection({ url = "https://origen.management" }: QRCodeSectionProps) {
  const { t } = useTranslation();
  const qrRef = useRef<HTMLCanvasElement | null>(null);

  const handleDownload = useCallback(() => {
    const qr = qrRef.current;
    if (!qr) {
      toast.error(t("profile.qr.downloadError"));
      return;
    }
    try {
      const size = 1024;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas no disponible");
      canvas.width = size;
      canvas.height = size;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(qr, 0, 0, size, size);

      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = "hazorex-qr-code.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(t("profile.qr.downloaded"));
    } catch {
      toast.error(t("profile.qr.downloadError"));
    }
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
          <SafeQR
            ref={qrRef as unknown as React.Ref<SVGSVGElement>}
            value={url}
            size={180}
            level="M"
            bgColor="#ffffff"
            fgColor="#0f172a"
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
