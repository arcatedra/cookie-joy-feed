import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SafeQR } from "@/components/SafeQR";
import { toast } from "sonner";
import { Share2, Sparkles, Star, Users, Download, Copy, Check } from "lucide-react";
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
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://hazorex.com";
    return referralCode ? `${origin}/join?ref=${referralCode}` : `${origin}/join`;
  }, [referralCode]);

  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      toast.success("Enlace copiado al portapapeles");
      setCopied(true);
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
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

  const shareMessage = useMemo(
    () =>
      referralCode
        ? `🎁 ¡Únete a Hazorex con mi código ${referralCode} y los dos ganamos estrellas! ${referralUrl}`
        : `🎁 ¡Únete a Hazorex y gana estrellas! ${referralUrl}`,
    [referralCode, referralUrl],
  );


  const openShare = useCallback((url: string) => {
    if (typeof window === "undefined") return;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const handleWhatsApp = useCallback(() => {
    if (!shareMessage) return;
    openShare(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`);
  }, [shareMessage, openShare]);

  const handleFacebook = useCallback(() => {
    if (!referralUrl) return;
    openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`);
  }, [referralUrl, openShare]);

  const handleYouTube = useCallback(async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(shareMessage || referralUrl);
      toast.success("¡Enlace copiado! Pégalo en tu canal o comunidad de YouTube");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  }, [referralUrl, shareMessage]);

  const handleCopyForApp = useCallback(
    async (appName: string) => {
      if (!referralUrl) return;
      try {
        await navigator.clipboard.writeText(shareMessage || referralUrl);
        toast.success(`¡Enlace copiado! Pégalo en tu perfil o mensaje de ${appName}`);
      } catch {
        toast.error("No se pudo copiar el enlace");
      }
    },
    [referralUrl, shareMessage],
  );


  const handleDownload = useCallback(() => {
    const size = 1024;
    const filename = `referral-${referralCode ?? "qr"}.png`;
    const svg = svgRef.current;

    // Fallback path: SVG generator failed, download from the QR image API directly.
    if (!svg || !svg.querySelector("path, rect:nth-child(n+2)")) {
      const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(
        referralUrl,
      )}`;
      const a = document.createElement("a");
      a.href = src;
      a.download = filename;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("QR descargado");
      return;
    }

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = size;
    canvas.height = size;
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const png = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = png;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("QR descargado");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("No se pudo descargar el QR");
    };
    img.src = url;
  }, [referralCode, referralUrl]);

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
              Por cada amigo que se una al sorteo con tu código o QR, recibirás{" "}
              <span className="font-bold text-yellow-300">5 Estrellas</span> automáticamente.
            </p>

          </div>
        </div>

        {/* QR */}
        <div className="mt-5 flex flex-col items-center px-6">
          <div className="rounded-2xl bg-white p-4 shadow-lg">
            {isLoading ? (
              <div className="h-[200px] w-[200px] animate-pulse rounded bg-muted" />
            ) : (
              <SafeQR
                ref={svgRef}
                value={referralUrl}
                size={200}
                level="M"
                bgColor="#ffffff"
                fgColor="#0f172a"
              />
            )}
          </div>
          {referralCode && (
            <div className="mt-3 rounded-full bg-primary-foreground/15 px-4 py-1.5 font-mono text-sm font-bold tracking-[0.25em] text-primary-foreground">
              {referralCode}
            </div>
          )}
          {referralUrl && (
            <button
              type="button"
              onClick={handleCopy}
              title="Toca para copiar"
              className="mt-3 max-w-full truncate rounded-lg bg-primary-foreground/10 px-3 py-1.5 text-[11px] font-medium text-primary-foreground/90 underline-offset-2 hover:underline"
            >
              {referralUrl}
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 px-6">
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

        {/* Actions */}
        <div className="mt-5 flex flex-col gap-3 px-6 pb-6">
          <div className="rounded-2xl bg-primary-foreground/10 px-4 py-3 text-center ring-1 ring-yellow-300/40 backdrop-blur">
            <p className="text-sm font-bold text-yellow-300">
              ¡Invita a tus amigos y gana!
            </p>
            <p className="mt-1 text-xs leading-relaxed text-primary-foreground/90">
              Por cada usuario que entre al sorteo con tu código QR o enlace, recibirás{" "}
              <span className="font-bold text-yellow-300">5 Estrellas</span> automáticamente en tu cuenta (10 ⭐ = 1 ticket).
            </p>

          </div>
          <button
            type="button"
            onClick={handleShare}

            className="flex w-full items-center justify-center gap-2 rounded-full bg-yellow-300 py-3 text-sm font-bold text-slate-900 shadow-md transition hover:bg-yellow-200 disabled:opacity-50"
          >
            <Share2 className="h-4 w-4" />
            Compartir enlace de invitación
          </button>

          {/* Social networks */}
          <div>
            <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-primary-foreground/70">
              Comparte directo en
            </p>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleWhatsApp}

                aria-label="Compartir en WhatsApp"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-white shadow-md transition hover:scale-105 disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
              </button>
              <button
                type="button"
                onClick={() => handleCopyForApp("TikTok")}

                aria-label="Compartir en TikTok"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white shadow-md transition hover:scale-105 disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-.88-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.96a8.16 8.16 0 0 0 4.77 1.52V7.04a4.83 4.83 0 0 1-1.84-.35z"/></svg>
              </button>
              <button
                type="button"
                onClick={() => handleCopyForApp("Instagram")}

                aria-label="Compartir en Instagram"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white shadow-md transition hover:scale-105 disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2zM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.6 5.6 0 0 0-2.03 1.32A5.6 5.6 0 0 0 .79 3.98c-.3.76-.5 1.64-.56 2.91C.17 8.17.16 8.58.16 11.84c0 3.26.01 3.67.07 4.95.06 1.27.26 2.15.56 2.91.32.81.74 1.5 1.32 2.08.58.58 1.27 1 2.03 1.32.76.3 1.64.5 2.91.56 1.28.06 1.69.07 4.95.07s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.81-.32 1.5-.74 2.08-1.32.58-.58 1-1.27 1.32-2.08.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.6 5.6 0 0 0-1.32-2.03A5.6 5.6 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.41-10.4a1.44 1.44 0 1 0 0-2.88 1.44 1.44 0 0 0 0 2.88z"/></svg>
              </button>
              <button
                type="button"
                onClick={handleFacebook}

                aria-label="Compartir en Facebook"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1877F2] text-white shadow-md transition hover:scale-105 disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.412c0-3.017 1.792-4.685 4.533-4.685 1.312 0 2.686.235 2.686.235v2.97h-1.514c-1.49 0-1.955.93-1.955 1.886v2.266h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
              </button>
              <button
                type="button"
                onClick={handleYouTube}

                aria-label="Compartir en YouTube"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FF0000] text-white shadow-md transition hover:scale-105 disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              aria-live="polite"
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border py-2.5 text-xs font-semibold transition disabled:opacity-50 ${
                copied
                  ? "border-emerald-300/60 bg-emerald-400/20 text-emerald-100"
                  : "border-primary-foreground/30 bg-primary-foreground/5 text-primary-foreground hover:bg-primary-foreground/15"
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  ¡Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar enlace
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownload}
  
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
