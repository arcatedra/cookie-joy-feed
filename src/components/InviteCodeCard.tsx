import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Download, Check, Share2, Users } from "lucide-react";
import { toast } from "sonner";
import { SafeQR } from "@/components/SafeQR";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const SITE = "https://hazorex.com";

const ShareIcon = ({ label, href, bg }: { label: string; href: string; bg: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={`Compartir en ${label}`}
    className={`grid h-10 w-10 place-items-center rounded-full text-white shadow ${bg}`}
  >
    <span className="text-xs font-bold">{label[0]}</span>
  </a>
);

export function InviteCodeCard() {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["invite-code-profile", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", uid!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const code = data?.referral_code ?? "";
  const link = code ? `${SITE}/join/${code}` : "";
  const shareText = "Únete a Hazorex conmigo:";

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Enlace copiado");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      toast.error("QR no disponible aún");
      return;
    }
    try {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `hazorex-invite-${code}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      toast.error("No se pudo descargar el QR");
    }
  };

  const handleNativeShare = async () => {
    if (!link) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Hazorex", text: shareText, url: link });
      } catch {
        /* user cancelled */
      }
    } else {
      handleCopy();
    }
  };

  return (
    <section className="mt-6 px-5">
      <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-card-foreground">Tu código de invitación</h3>
            <p className="text-xs text-muted-foreground">
              Comparte tu enlace y gana comisiones por cada suscriptor.
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Cargando…</p>
        ) : !code ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Aún no tienes un código. Recarga la página en unos segundos.
          </p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-[auto,1fr] items-center gap-4">
              <div className="rounded-xl bg-white p-2 ring-1 ring-border">
                <SafeQR ref={canvasRef} value={link} size={128} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Código
                </p>
                <p className="text-2xl font-black tracking-widest text-card-foreground">{code}</p>
                <p className="mt-2 truncate text-xs text-muted-foreground">{link}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado" : "Copiar enlace"}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card py-2.5 text-sm font-semibold text-card-foreground"
              >
                <Download className="h-4 w-4" /> Descargar QR
              </button>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Compartir directo
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <ShareIcon
                  label="WhatsApp"
                  bg="bg-[#25D366]"
                  href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${link}`)}`}
                />
                <ShareIcon
                  label="TikTok"
                  bg="bg-black"
                  href={`https://www.tiktok.com/upload?description=${encodeURIComponent(`${shareText} ${link}`)}`}
                />
                <ShareIcon
                  label="Instagram"
                  bg="bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"
                  href="https://www.instagram.com/"
                />
                <ShareIcon
                  label="Facebook"
                  bg="bg-[#1877F2]"
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`}
                />
                <ShareIcon
                  label="YouTube"
                  bg="bg-[#FF0000]"
                  href="https://studio.youtube.com/"
                />
                <button
                  type="button"
                  onClick={handleNativeShare}
                  aria-label="Más opciones para compartir"
                  className="grid h-10 w-10 place-items-center rounded-full bg-accent text-card-foreground shadow"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
