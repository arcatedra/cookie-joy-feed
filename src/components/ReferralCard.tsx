import { useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Share2, Sparkles, Star, Users, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ReferralCardProps {
  userId: string | null | undefined;
}

export function ReferralCard({ userId }: ReferralCardProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["referral-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [profileRes, countRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("referral_code, stars_count")
          .eq("id", userId!)
          .maybeSingle(),
        supabase
          .from("referrals")
          .select("id", { count: "exact", head: true })
          .eq("referrer_id", userId!),
      ]);
      if (profileRes.error) throw profileRes.error;
      return {
        referralCode: (profileRes.data?.referral_code ?? null) as string | null,
        stars: (profileRes.data?.stars_count ?? 0) as number,
        invited: countRes.count ?? 0,
      };
    },
  });

  const referralCode = data?.referralCode ?? null;
  const stars = data?.stars ?? 0;
  const invited = data?.invited ?? 0;

  const referralUrl = useMemo(() => {
    if (!referralCode) return "";
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://origen.management";
    return `${origin}/auth?ref=${referralCode}`;
  }, [referralCode]);

  const handleCopy = useCallback(async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      toast.success("Enlace copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  }, [referralUrl]);

  const handleShare = useCallback(async () => {
    if (!referralUrl) return;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: "Únete y gana estrellas",
          text: "Regístrate con mi código y los dos ganamos estrellas:",
          url: referralUrl,
        });
        return;
      } catch {
        // user cancelled or unsupported — fall back to copy
      }
    }
    await handleCopy();
  }, [referralUrl, handleCopy]);

  const handleDownload = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = 1024;
    canvas.width = size;
    canvas.height = size;
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const png = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = png;
      a.download = `referral-${referralCode ?? "qr"}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("QR descargado");
    };
    img.src = url;
  }, [referralCode]);

  if (!userId) {
    return (
      <section className="mt-6 px-5">
        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground shadow-xl ring-1 ring-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <h3 className="text-base font-bold">Invita y Gana Estrellas</h3>
          </div>
          <p className="mt-2 text-sm text-primary-foreground/80">
            Inicia sesión para obtener tu código de invitación único.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6 px-5">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/85 text-primary-foreground shadow-xl ring-1 ring-border">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-300" />
              <h3 className="text-lg font-extrabold tracking-tight">Invita y Gana Estrellas</h3>
            </div>
            <p className="mt-1 text-xs text-primary-foreground/80">
              Por cada amigo que se registre con tu código o QR, recibirás{" "}
              <span className="font-bold text-yellow-300">3 Estrellas</span> automáticamente.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-3 px-6">
          <div className="rounded-2xl bg-primary-foreground/10 px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-2 text-yellow-300">
              <Star className="h-4 w-4 fill-current" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-foreground/70">
                Tus estrellas
              </span>
            </div>
            <p className="mt-1 text-2xl font-extrabold">{stars}</p>
          </div>
          <div className="rounded-2xl bg-primary-foreground/10 px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-2 text-primary-foreground/90">
              <Users className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-foreground/70">
                Invitados
              </span>
            </div>
            <p className="mt-1 text-2xl font-extrabold">{invited}</p>
          </div>
        </div>

        {/* QR */}
        <div className="mt-5 flex flex-col items-center px-6">
          <div className="rounded-2xl bg-white p-4 shadow-lg">
            {isLoading || !referralCode ? (
              <div className="h-[200px] w-[200px] animate-pulse rounded bg-muted" />
            ) : (
              <QRCodeSVG
                ref={svgRef}
                value={referralUrl}
                size={200}
                level="M"
                bgColor="#ffffff"
                fgColor="#0f172a"
                includeMargin={false}
              />
            )}
          </div>
          {referralCode && (
            <div className="mt-3 rounded-full bg-primary-foreground/15 px-4 py-1.5 font-mono text-sm font-bold tracking-[0.25em] text-primary-foreground">
              {referralCode}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-col gap-2 px-6 pb-6">
          <button
            type="button"
            onClick={handleShare}
            disabled={!referralCode}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-yellow-300 py-3 text-sm font-bold text-slate-900 shadow-md transition hover:bg-yellow-200 disabled:opacity-50"
          >
            <Share2 className="h-4 w-4" />
            Compartir enlace de invitación
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!referralCode}
              className="flex-1 rounded-full border border-primary-foreground/30 bg-primary-foreground/5 py-2.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary-foreground/15 disabled:opacity-50"
            >
              Copiar enlace
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!referralCode}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-primary-foreground/30 bg-primary-foreground/5 py-2.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary-foreground/15 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar QR
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
