import { useEffect, useMemo, useRef, useState, type FormEvent, type ComponentType } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  ShoppingCart,
  X,
  Play,
  Volume2,
  VolumeX,
  Plus,
  Send,
  Loader2,
  Link as LinkIcon,
  ExternalLink,
  Trash2,
  MessageCircle as WhatsAppIcon,
  Music2,
  Mail,
  HandHeart,
  Maximize2,
} from "lucide-react";
import { FacebookIcon, InstagramIcon, TwitterIcon, YoutubeIcon } from "@/components/BrandIcons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import reel1 from "@/assets/reel-cookie-1.mp4.asset.json";
import reel2 from "@/assets/reel-cookie-2.mp4.asset.json";
import reel3 from "@/assets/reel-cookie-3.mp4.asset.json";
import imgDoubleChoc from "@/assets/ins-double-choc.jpg";
import imgCookiesCream from "@/assets/ins-cookies-cream.jpg";
import imgPB from "@/assets/ins-pb.jpg";
import imgChocChunk from "@/assets/ins-chocolate-chunk.jpg";
import imgMint from "@/assets/ins-mint.jpg";
import imgWhiteMac from "@/assets/ins-white-mac.jpg";

// ============ Types ============
interface DbReel {
  id: string;
  slug: string;
  title: string | null;
  video_url: string | null;
  product_name: string | null;
  product_price: number | null;
  product_image: string | null;
  product_slug: string | null;
  author_id: string | null;
  created_at: string;
}

interface DbComment {
  id: string;
  reel_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author_name?: string;
}

const BRAND = "OriGen Cookies";

const FALLBACK_VIDEO: Record<string, string> = {
  "demo-nutella": reel1.url,
  "demo-cookies-cream": reel2.url,
  "demo-pb": reel3.url,
};
const FALLBACK_PRODUCT_IMG: Record<string, string> = {
  "p-doublechoc": imgDoubleChoc,
  "p-cc": imgCookiesCream,
  "p-pb": imgPB,
  "p-cchunk": imgChocChunk,
  "p-mint": imgMint,
  "p-pista": imgWhiteMac,
};

const REELS_STORAGE_MARKER = "/storage/v1/object/public/reels/";

function getReelStoragePath(videoUrl: string | null | undefined) {
  if (!videoUrl) return null;
  const markerIndex = videoUrl.indexOf(REELS_STORAGE_MARKER);
  if (markerIndex === -1) return null;
  const encodedPath = videoUrl.slice(markerIndex + REELS_STORAGE_MARKER.length).split("?")[0];
  try {
    return decodeURIComponent(encodedPath);
  } catch {
    return encodedPath;
  }
}

async function signStoredReelVideos(rows: DbReel[]) {
  const paths = Array.from(
    new Set(rows.map((r) => getReelStoragePath(r.video_url)).filter(Boolean) as string[]),
  );
  if (!paths.length) return rows;

  const { data, error } = await supabase.storage.from("reels").createSignedUrls(paths, 60 * 60);
  if (error || !data) return rows;

  const signedByPath = new Map<string, string>();
  data.forEach((item) => {
    if (item.path && item.signedUrl) signedByPath.set(item.path, item.signedUrl);
  });

  return rows.map((row) => {
    const path = getReelStoragePath(row.video_url);
    return path && signedByPath.has(path) ? { ...row, video_url: signedByPath.get(path)! } : row;
  });
}

function hasPlayableSource(reel: DbReel) {
  const url = reel.video_url?.trim();
  if (url) {
    if (parseEmbed(url)) return true;
    return /\.(mp4|m4v|mov|webm)(\?|#|$)/i.test(url) || url.includes("/storage/v1/object/");
  }
  return Boolean(FALLBACK_VIDEO[reel.slug]);
}

const PRODUCT_OPTIONS = [
  { slug: "p-doublechoc", name: "Galleta Explosiva de Nutella", price: 4.95, image: imgDoubleChoc },
  { slug: "p-cc", name: "Cookies & Cream Premium", price: 4.25, image: imgCookiesCream },
  { slug: "p-pb", name: "Mantequilla de Maní Crunch", price: 3.75, image: imgPB },
  { slug: "p-cchunk", name: "Doble Chispas de Chocolate", price: 3.95, image: imgChocChunk },
  { slug: "p-mint", name: "Menta y Chocolate Dark", price: 4.5, image: imgMint },
  { slug: "p-pista", name: "Pistacho y Chocolate Blanco", price: 4.5, image: imgWhiteMac },
];

// ============ Embed link parser ============
type EmbedPlatform = "instagram" | "tiktok" | "facebook" | "youtube";
interface EmbedInfo {
  platform: EmbedPlatform;
  embedUrl: string;
  originalUrl: string;
  label: string;
}

function parseEmbed(raw: string | null | undefined): EmbedInfo | null {
  if (!raw) return null;
  const url = raw.trim();
  if (!/^https?:\/\//i.test(url)) return null;

  // Instagram: /reel/{id}, /p/{id}, /tv/{id}
  const ig = url.match(/instagram\.com\/(reel|p|tv)\/([A-Za-z0-9_-]+)/i);
  if (ig) {
    return {
      platform: "instagram",
      embedUrl: `https://www.instagram.com/${ig[1]}/${ig[2]}/embed/captioned/`,
      originalUrl: url,
      label: "Instagram",
    };
  }

  // TikTok: /@user/video/{id} or vm.tiktok.com short links
  const tt = url.match(/tiktok\.com\/(?:@[\w.-]+\/video\/|v\/|embed\/v2\/)(\d+)/i);
  if (tt) {
    return {
      platform: "tiktok",
      embedUrl: `https://www.tiktok.com/embed/v2/${tt[1]}`,
      originalUrl: url,
      label: "TikTok",
    };
  }
  if (/(?:vm|vt)\.tiktok\.com\//i.test(url)) {
    // Short link — let TikTok resolve via the generic player
    return {
      platform: "tiktok",
      embedUrl: `https://www.tiktok.com/embed?lang=en&url=${encodeURIComponent(url)}`,
      originalUrl: url,
      label: "TikTok",
    };
  }

  // Facebook: any fb.watch / facebook.com video/reel link
  if (/facebook\.com\/(?:reel|watch|.+\/videos)|fb\.watch\//i.test(url)) {
    return {
      platform: "facebook",
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
        url,
      )}&show_text=false&width=560&t=0`,
      originalUrl: url,
      label: "Facebook",
    };
  }

  // YouTube Shorts / watch
  const yt =
    url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]+)/i) ||
    url.match(/youtube\.com\/watch\?v=([A-Za-z0-9_-]+)/i) ||
    url.match(/youtu\.be\/([A-Za-z0-9_-]+)/i);
  if (yt) {
    return {
      platform: "youtube",
      embedUrl: `https://www.youtube.com/embed/${yt[1]}?rel=0&playsinline=1`,
      originalUrl: url,
      label: "YouTube",
    };
  }

  return null;
}

// ============ Native-app deep link per platform ============
interface PlatformAppLink {
  Icon: ComponentType<{ className?: string }>;
  label: string;
  colorClass: string; // brand color for the icon button
  // Try app scheme first, then fall back to https URL.
  appUrl: string | null;
  webUrl: string;
}

function getPlatformAppLink(embed: EmbedInfo): PlatformAppLink {
  const url = embed.originalUrl;
  switch (embed.platform) {
    case "instagram": {
      // /reel/{shortcode}/ or /p/{shortcode}/
      const m = url.match(/instagram\.com\/(reel|p|tv)\/([A-Za-z0-9_-]+)/i);
      const appUrl = m ? `instagram://media?shortcode=${m[2]}` : null;
      return {
        Icon: InstagramIcon,
        label: "Abrir en Instagram",
        colorClass: "text-pink-500",
        appUrl,
        webUrl: url,
      };
    }
    case "tiktok": {
      const m = url.match(/tiktok\.com\/@([\w.-]+)\/video\/(\d+)/i);
      const appUrl = m ? `snssdk1233://aweme/detail/${m[2]}` : null;
      return {
        Icon: Music2,
        label: "Abrir en TikTok",
        colorClass: "text-black",
        appUrl,
        webUrl: url,
      };
    }
    case "facebook":
      return {
        Icon: FacebookIcon,
        label: "Abrir en Facebook",
        colorClass: "text-blue-500",
        appUrl: `fb://facewebmodal/f?href=${encodeURIComponent(url)}`,
        webUrl: url,
      };
    case "youtube": {
      const m =
        url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]+)/i) ||
        url.match(/youtube\.com\/watch\?v=([A-Za-z0-9_-]+)/i) ||
        url.match(/youtu\.be\/([A-Za-z0-9_-]+)/i);
      const appUrl = m ? `vnd.youtube://${m[1]}` : null;
      return {
        Icon: YoutubeIcon,
        label: "Abrir en YouTube",
        colorClass: "text-red-500",
        appUrl,
        webUrl: url,
      };
    }
  }
}

function PlatformMark({ embed, className = "h-14 w-14" }: { embed: EmbedInfo; className?: string }) {
  const { Icon, colorClass } = getPlatformAppLink(embed);
  return (
    <span className={`grid place-items-center rounded-full bg-white shadow-xl ring-1 ring-black/10 ${className}`}>
      <Icon className={`h-1/2 w-1/2 ${colorClass}`} />
    </span>
  );
}

function openInNativeApp(link: PlatformAppLink) {
  if (typeof window === "undefined") return;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  // On mobile, App Links / Universal Links handle https URLs and route to the
  // installed app automatically. We also attempt the custom scheme as a hint.
  if (isMobile && link.appUrl) {
    const fallback = window.setTimeout(() => {
      window.location.href = link.webUrl;
    }, 800);
    // If app opens, the page is backgrounded and the timeout effectively cancels.
    window.addEventListener(
      "pagehide",
      () => window.clearTimeout(fallback),
      { once: true },
    );
    window.location.href = link.appUrl;
    return;
  }
  window.open(link.webUrl, "_blank", "noopener,noreferrer");
}

// ============ Main: Facebook-style Reels row ============
export function CookiesTV() {
  const { user } = useAuth();
  const [reels, setReels] = useState<DbReel[]>([]);
  const reelsRef = useRef(reels);
  useEffect(() => { reelsRef.current = reels; }, [reels]);
  const [loading, setLoading] = useState(true);
  const [adminOpen, setAdminOpen] = useState(false);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [globalMuted, setGlobalMuted] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);


  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());
  const [canManageAllReels, setCanManageAllReels] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        setCanManageAllReels(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!cancelled) setCanManageAllReels(Boolean(data));
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Fetch reels + aggregates
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("reels")
        .select("*")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        toast.error("No se pudieron cargar los reels");
        setLoading(false);
        return;
      }
      const signedRows = await signStoredReelVideos((data ?? []) as DbReel[]);
      if (cancelled) return;
      const playable = signedRows.filter(hasPlayableSource);
      setReels(playable);
      setLoading(false);
      const ids = playable.map((r) => r.id);
      if (ids.length) {
        const [{ data: likeRows }, { data: commentRows }] = await Promise.all([
          supabase.from("reel_likes").select("reel_id, user_id").in("reel_id", ids),
          supabase.from("reel_comments").select("reel_id").in("reel_id", ids),
        ]);
        if (cancelled) return;
        const lc: Record<string, number> = {};
        const mine = new Set<string>();
        (likeRows ?? []).forEach((l: { reel_id: string; user_id: string }) => {
          lc[l.reel_id] = (lc[l.reel_id] ?? 0) + 1;
          if (user && l.user_id === user.id) mine.add(l.reel_id);
        });
        const cc: Record<string, number> = {};
        (commentRows ?? []).forEach((c: { reel_id: string }) => {
          cc[c.reel_id] = (cc[c.reel_id] ?? 0) + 1;
        });
        setLikeCounts(lc);
        setCommentCounts(cc);
        setMyLikes(mine);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Realtime aggregates
  useEffect(() => {
    const ch = supabase
      .channel("reels-aggregates")
      .on("postgres_changes", { event: "*", schema: "public", table: "reel_likes" }, (payload) => {
        const row = (payload.new ?? payload.old) as { reel_id: string } | null;
        if (!row) return;
        setLikeCounts((prev) => {
          const delta = payload.eventType === "INSERT" ? 1 : payload.eventType === "DELETE" ? -1 : 0;
          return { ...prev, [row.reel_id]: Math.max(0, (prev[row.reel_id] ?? 0) + delta) };
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reel_comments" }, (payload) => {
        const row = (payload.new ?? payload.old) as { reel_id: string } | null;
        if (!row) return;
        setCommentCounts((prev) => {
          const delta = payload.eventType === "INSERT" ? 1 : payload.eventType === "DELETE" ? -1 : 0;
          return { ...prev, [row.reel_id]: Math.max(0, (prev[row.reel_id] ?? 0) + delta) };
        });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, []);

  // Scroll to a specific reel when arriving via ?reel=<id> deep link
  useEffect(() => {
    if (loading || reels.length === 0) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get("reel");
    if (!targetId) return;
    const tryScroll = () => {
      const el = document.getElementById(`reel-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        el.classList.add("ring-2", "ring-amber-400");
        window.setTimeout(() => el.classList.remove("ring-2", "ring-amber-400"), 2500);
      }
    };
    window.setTimeout(tryScroll, 150);
  }, [loading, reels]);

  const toggleLike = async (reelId: string) => {
    if (!user) {
      toast.error("Inicia sesión para dar me gusta");
      return;
    }
    const liked = myLikes.has(reelId);
    setMyLikes((prev) => {
      const next = new Set(prev);
      if (liked) next.delete(reelId);
      else next.add(reelId);
      return next;
    });
    setLikeCounts((prev) => ({
      ...prev,
      [reelId]: Math.max(0, (prev[reelId] ?? 0) + (liked ? -1 : 1)),
    }));
    if (liked) {
      const { error } = await supabase
        .from("reel_likes")
        .delete()
        .eq("reel_id", reelId)
        .eq("user_id", user.id);
      if (error) toast.error("No se pudo quitar el me gusta");
    } else {
      const { error } = await supabase
        .from("reel_likes")
        .insert({ reel_id: reelId, user_id: user.id });
      if (error && error.code !== "23505") toast.error("No se pudo dar me gusta");
    }
  };

  const deleteTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const handleDelete = (reelId: string) => {
    const reel = reelsRef.current.find((r) => r.id === reelId);
    if (!reel) return;

    const confirmed = window.confirm(
      "¿Estás seguro de que quieres eliminar este Reel de galletas?"
    );
    if (!confirmed) return;

    setReels((prev) => prev.filter((r) => r.id !== reelId));

    const timer = setTimeout(() => {
      if (!reelId.startsWith("local-")) {
        void supabase.from("reels").delete().eq("id", reelId).then(({ error }) => {
          if (error) toast.error("No se pudo eliminar el reel");
        });
      }
      deleteTimers.current.delete(reelId);
    }, 5000);

    deleteTimers.current.set(reelId, timer);

    toast("Reel eliminado", {
      action: {
        label: "Deshacer",
        onClick: () => {
          clearTimeout(timer);
          deleteTimers.current.delete(reelId);
          setReels((prev) => {
            if (prev.some((r) => r.id === reelId)) return prev;
            return [reel, ...prev];
          });
        },
      },
      duration: 5000,
    });
  };

  return (
    <section className="mx-auto max-w-[1500px] px-3 pt-4 md:px-6">
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 md:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 items-center rounded-full bg-rose-500 px-2 text-[10px] font-extrabold uppercase tracking-wider text-white">
              Reels
            </span>
            <h2 className="text-base font-extrabold text-[#1a0f0a] md:text-lg">
              Cookies TV · Galleta Reels
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setAdminOpen(true)}
            className="shrink-0 rounded-full bg-[#1a0f0a] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#3d2418]"
          >
            + Nuevo Reel
          </button>
        </div>

        <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 md:gap-4">
          {loading && (
            <div className="flex h-[420px] w-full items-center justify-center gap-2 text-xs text-[#666]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando reels…
            </div>
          )}
          {!loading &&
            reels.map((r, index) => (
              <ReelCard
                key={r.id}
                reel={r}
                isFirst={index === 0}
                likes={likeCounts[r.id] ?? 0}
                comments={commentCounts[r.id] ?? 0}
                liked={myLikes.has(r.id)}
                onToggleLike={() => toggleLike(r.id)}
                onOpenComments={() => setCommentsFor(r.id)}
                globalMuted={globalMuted}
                onToggleMuted={() => setGlobalMuted((m) => !m)}
                canDelete={canManageAllReels || user?.id === r.author_id}
                onDelete={() => handleDelete(r.id)}
                onExpand={() => setExpandedIndex(index)}
              />
            ))}

          {!loading && reels.length === 0 && (
            <p className="py-10 text-xs text-[#666]">Aún no hay reels. ¡Sé el primero!</p>
          )}
        </div>
      </div>

      {commentsFor && (
        <CommentsPanel reelId={commentsFor} onClose={() => setCommentsFor(null)} />
      )}

      {adminOpen && (
        <AdminModal
          onClose={() => setAdminOpen(false)}
          onPublish={(r) => {
            setReels((prev) => [r, ...prev]);
            setAdminOpen(false);
            toast.success("¡Reel publicado!");
          }}
        />
      )}

      {expandedIndex !== null && reels[expandedIndex] && (
        <ExpandedReelModal
          reel={reels[expandedIndex]}
          hasPrev={expandedIndex > 0}
          hasNext={expandedIndex < reels.length - 1}
          onPrev={() => setExpandedIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
          onNext={() =>
            setExpandedIndex((i) => (i !== null && i < reels.length - 1 ? i + 1 : i))
          }
          onClose={() => setExpandedIndex(null)}
          likes={likeCounts[reels[expandedIndex]!.id] ?? 0}
          comments={commentCounts[reels[expandedIndex]!.id] ?? 0}
          liked={myLikes.has(reels[expandedIndex]!.id)}
          onToggleLike={() => toggleLike(reels[expandedIndex]!.id)}
          onOpenComments={() => setCommentsFor(reels[expandedIndex]!.id)}
        />
      )}
    </section>
  );
}

// ============ Big Facebook-style Reel card ============
function ReelCard({
  reel,
  likes,
  comments,
  liked,
  onToggleLike,
  onOpenComments,
  globalMuted,
  onToggleMuted,
  canDelete,
  onDelete,
  isFirst,
  onExpand,
}: {
  reel: DbReel;
  likes: number;
  comments: number;
  liked: boolean;
  onToggleLike: () => void;
  onOpenComments: () => void;
  globalMuted: boolean;
  onToggleMuted: () => void;
  canDelete: boolean;
  onDelete: () => void;
  isFirst?: boolean;
  onExpand: () => void;
}) {
  const cart = useCart();
  const cardRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [inView, setInView] = useState(false);
  const [burst, setBurst] = useState(false);


  const videoSrc = reel.video_url || FALLBACK_VIDEO[reel.slug] || "";
  const productImg =
    reel.product_image ||
    (reel.product_slug ? FALLBACK_PRODUCT_IMG[reel.product_slug] : "") ||
    "";
  const embed = useMemo(() => parseEmbed(reel.video_url), [reel.video_url]);
  const isEmbed = !!embed;
  const firstExternalOnly = Boolean(isFirst);

  // Autoplay native <video> when visible
  useEffect(() => {
    const el = cardRef.current;
    if (!el || isEmbed || firstExternalOnly) return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio > 0.5),
      { threshold: [0, 0.5, 1] },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [isEmbed, firstExternalOnly]);

  useEffect(() => {
    if (isEmbed || firstExternalOnly) return;
    const v = videoRef.current;
    if (!v) return;
    v.muted = globalMuted;
    if (inView) {
      v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      v.pause();
      setPlaying(false);
    }
  }, [inView, globalMuted, videoSrc, isEmbed, firstExternalOnly]);

  const togglePlay = () => {
    if (isEmbed || firstExternalOnly) return;
    const v = videoRef.current;
    if (!v) return;
    // Quitar mute en la primera interacción del usuario para garantizar reproducción
    v.muted = globalMuted;
    if (v.paused) {
      const p = v.play();
      if (p && typeof p.then === "function") {
        p.then(() => setPlaying(true)).catch((err) => {
          console.warn("No se pudo reproducir el video:", err);
          // Reintentar silenciado (política de autoplay)
          v.muted = true;
          v.play().then(() => setPlaying(true)).catch(() => toast.error("No se pudo reproducir el video"));
        });
      }
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const handleLike = () => {
    if (!liked) {
      setBurst(true);
      window.setTimeout(() => setBurst(false), 600);
    }
    onToggleLike();
  };

  const buy = () => {
    if (!reel.product_name || reel.product_price == null) return;
    cart.add({
      id: `reel-${reel.product_slug || reel.id}`,
      name: reel.product_name,
      price: Number(reel.product_price),
      image: productImg,
    });
    toast.success(`${reel.product_name} agregado al carrito`);
  };

  const shareUrl = () => {
    if (firstExternalOnly && embed) return embed.originalUrl;
    // Always share a link to the dedicated reel page so social platforms
    // (WhatsApp, Facebook, Instagram, etc.) preview THIS reel — title,
    // thumbnail and video — instead of the full website homepage.
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://oys1.lovable.app";
    return `${origin}/reel/${encodeURIComponent(reel.id)}`;
  };
  const shareTitle = () =>
    reel.title
      ? `${reel.title} · ${BRAND}`
      : reel.product_name
        ? `${reel.product_name} · ${BRAND}`
        : `Mira este reel de ${BRAND}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  const nativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle(), url: shareUrl() });
      } else {
        await copyLink();
      }
    } catch {
      /* user cancelled */
    }
  };

  const openShare = (target: "facebook" | "whatsapp" | "twitter" | "telegram" | "email" | "instagram" | "tiktok") => {
    const url = shareUrl();
    const text = shareTitle();
    const enc = encodeURIComponent;
    let href = "";
    switch (target) {
      case "facebook":
        href = `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`;
        break;
      case "whatsapp": {
        const msg = enc(`${text} ${url}`);
        const isMobile =
          typeof navigator !== "undefined" &&
          /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
        href = isMobile
          ? `https://wa.me/?text=${msg}`
          : `https://web.whatsapp.com/send?text=${msg}`;
        break;
      }
      case "twitter":
        href = `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(text)}`;
        break;
      case "telegram":
        href = `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`;
        break;
      case "email":
        href = `mailto:?subject=${enc(text)}&body=${enc(url)}`;
        break;
      case "instagram":
      case "tiktok":
        copyLink();
        toast.info(
          target === "instagram"
            ? "Enlace copiado. Pégalo en tu historia o mensaje de Instagram."
            : "Enlace copiado. Pégalo en TikTok para compartir.",
        );
        return;
    }
    if (typeof window !== "undefined") {
      window.open(href, "_blank", "noopener,noreferrer,width=600,height=600");
    }
  };


  return (
    <article
      ref={cardRef}
      id={`reel-${reel.id}`}
      data-reel-id={reel.id}
      className="group relative aspect-[9/16] w-[260px] shrink-0 snap-start overflow-hidden rounded-2xl bg-black shadow-md ring-1 ring-black/10 transition-transform duration-300 hover:scale-[1.02] hover:shadow-2xl sm:w-[290px] md:w-[320px]"
    >
      {firstExternalOnly ? (
        <>
          {productImg ? (
            <img
              src={productImg}
              alt={reel.product_name ?? ""}
              className="absolute inset-0 h-full w-full scale-110 object-cover blur-[2px] transition-transform duration-[6000ms] ease-out group-hover:scale-125"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-amber-300 via-rose-500 to-fuchsia-600" />
          )}
          {/* Cinematic gradient layers */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,90,140,0.45),_transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(120,80,255,0.45),_transparent_55%)] mix-blend-screen" />
          {/* Animated light beam */}
          <div className="pointer-events-none absolute -inset-x-10 top-0 h-40 -translate-y-full bg-gradient-to-b from-white/40 via-white/10 to-transparent blur-xl transition-transform duration-1000 ease-out group-hover:translate-y-full" />
          {/* Film grain via subtle noise */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay [background-image:radial-gradient(rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:3px_3px]" />
          {/* LIVE badge */}
          <div className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-full bg-red-600/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-red-500/40">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            Exclusivo
          </div>

          {embed ? (() => {
            const appLink = getPlatformAppLink(embed!);
            const { Icon, label, colorClass } = appLink;
            return (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-end gap-4 px-5 pb-7 pt-6 text-center">
                {/* Pulsing platform mark */}
                <div className="relative flex-1 flex items-center justify-center">
                  <div className="absolute inset-0 m-auto h-28 w-28 animate-ping rounded-full bg-white/20" />
                  <div className="absolute inset-0 m-auto h-24 w-24 rounded-full bg-gradient-to-br from-white/30 to-white/5 backdrop-blur-md" />
                  <PlatformMark embed={embed!} className="relative h-16 w-16 drop-shadow-[0_0_25px_rgba(255,255,255,0.6)]" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/70">
                    Disponible solo en
                  </p>
                  <p className="text-xl font-black uppercase tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
                    {embed!.label}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openInNativeApp(appLink);
                  }}
                  className="group/cta relative w-full overflow-hidden rounded-full bg-gradient-to-r from-fuchsia-500 via-rose-500 to-orange-400 p-[2px] shadow-[0_10px_40px_-5px_rgba(244,63,94,0.6)] transition-transform duration-300 hover:scale-[1.04] active:scale-95"
                >
                  <span className="relative flex items-center justify-center gap-2 rounded-full bg-black/85 px-5 py-3 text-sm font-extrabold uppercase tracking-wider text-white backdrop-blur-sm">
                    <Icon className={`h-5 w-5 ${colorClass}`} />
                    {label}
                    <span className="absolute inset-y-0 -left-12 w-12 -skew-x-12 bg-white/30 blur-md transition-transform duration-700 group-hover/cta:translate-x-[300px]" />
                  </span>
                </button>
              </div>
            );
          })() : (() => {
            const rawUrl = (reel.video_url ?? "").trim();
            const isHttp = /^https?:\/\//i.test(rawUrl);
            return (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-end gap-4 px-5 pb-7 pt-6 text-center">
                <div className="relative flex-1 flex items-center justify-center">
                  <div className="absolute inset-0 m-auto h-28 w-28 animate-ping rounded-full bg-white/20" />
                  <div className="absolute inset-0 m-auto h-24 w-24 rounded-full bg-gradient-to-br from-white/30 to-white/5 backdrop-blur-md" />
                  <ExternalLink className="relative h-14 w-14 text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.6)]" />
                </div>
                <p className="text-xl font-black uppercase tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
                  Mira el video original
                </p>
                {isHttp ? (
                  <a
                    href={rawUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="group/cta relative w-full overflow-hidden rounded-full bg-gradient-to-r from-fuchsia-500 via-rose-500 to-orange-400 p-[2px] shadow-[0_10px_40px_-5px_rgba(244,63,94,0.6)] transition-transform duration-300 hover:scale-[1.04] active:scale-95"
                  >
                    <span className="relative flex items-center justify-center gap-2 rounded-full bg-black/85 px-5 py-3 text-sm font-extrabold uppercase tracking-wider text-white backdrop-blur-sm">
                      <ExternalLink className="h-4 w-4" />
                      Abrir enlace
                      <span className="absolute inset-y-0 -left-12 w-12 -skew-x-12 bg-white/30 blur-md transition-transform duration-700 group-hover/cta:translate-x-[300px]" />
                    </span>
                  </a>
                ) : (
                  <span className="rounded-full bg-white/95 px-4 py-2 text-xs font-extrabold text-[#1a0f0a] shadow-lg ring-1 ring-black/10">
                    Sin enlace · edita el reel y pega la URL
                  </span>
                )}
              </div>
            );
          })()}

        </>
      ) : isEmbed ? (
        <iframe
          src={embed!.embedUrl}
          title={reel.title ?? `${embed!.label} reel`}
          loading="lazy"
          allow="autoplay; encrypted-media; picture-in-picture; clipboard-write; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          playsInline
          loop
          muted
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
          onClick={togglePlay}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-white/60">Sin video</div>
      )}

      {/* gradient overlays — softer over iframe so native controls remain visible */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 ${
          isEmbed && !isFirst ? "h-14 bg-gradient-to-b from-black/40 to-transparent" : "h-24 bg-gradient-to-b from-black/50 to-transparent"
        }`}
      />
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 ${
          isEmbed && !isFirst
            ? "h-32 bg-gradient-to-t from-black/85 via-black/40 to-transparent"
            : "h-1/2 bg-gradient-to-t from-black/85 via-black/40 to-transparent"
        }`}
      />

      {/* Top: brand + mute/source */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-center justify-between">
        <div className="pointer-events-auto flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-xs font-extrabold text-white ring-2 ring-white/80">
            🍪
          </span>
          <span className="text-[12px] font-bold text-white drop-shadow">{BRAND}</span>
          {isEmbed && (
            <a
              href={embed!.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white ring-1 ring-white/30 backdrop-blur hover:bg-white/25"
            >
              {embed!.label}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          {canDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label="Eliminar reel"
              className="grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-red-600/80"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {!isEmbed && !isFirst && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleMuted();
              }}
              aria-label={globalMuted ? "Activar sonido" : "Silenciar"}
              className="grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
            >
              {globalMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          )}
          {!firstExternalOnly && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onExpand();
              }}
              aria-label="Ver en grande"
              className="grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Center play overlay when paused (native video only) */}
      {!isEmbed && !isFirst && !playing && videoSrc && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Reproducir"
          className="absolute inset-0 z-10 grid place-items-center"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white/90 shadow-lg">
            <Play className="h-6 w-6 fill-[#1a0f0a] text-[#1a0f0a]" />
          </span>
        </button>
      )}

      {/* Right rail actions */}
      {!firstExternalOnly && <div className="absolute bottom-32 right-2.5 z-20 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleLike}
          aria-label="Me gusta"
          className="relative flex flex-col items-center gap-0.5 transition active:scale-90"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-black/50 backdrop-blur transition hover:bg-black/70">
            <Heart
              className={`h-5 w-5 transition ${
                liked ? "fill-rose-500 text-rose-500" : "text-white"
              }`}
            />
          </span>
          <span className="text-[10px] font-bold text-white drop-shadow">
            {formatCount(likes)}
          </span>
          {burst && (
            <span className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 animate-ping text-rose-400">
              <Heart className="h-8 w-8 fill-rose-500 text-rose-500" />
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onOpenComments}
          aria-label="Comentarios"
          className="flex flex-col items-center gap-0.5"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-black/50 backdrop-blur transition hover:bg-black/70">
            <MessageCircle className="h-5 w-5 text-white" />
          </span>
          <span className="text-[10px] font-bold text-white drop-shadow">
            {formatCount(comments)}
          </span>
        </button>

        {embed && !firstExternalOnly && (() => {
          const appLink = getPlatformAppLink(embed);
          const { Icon, label, colorClass } = appLink;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openInNativeApp(appLink);
              }}
              aria-label={label}
              title={label}
              className="flex flex-col items-center gap-0.5 transition active:scale-90"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white/95 shadow-md ring-1 ring-black/10 backdrop-blur transition hover:bg-white">
                <Icon className={`h-5 w-5 ${colorClass}`} />
              </span>
              <span className="text-[10px] font-bold text-white drop-shadow">
                {embed.label}
              </span>
            </button>
          );
        })()}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Compartir"
              className="flex flex-col items-center gap-0.5"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-black/50 backdrop-blur transition hover:bg-black/70">
                <Share2 className="h-4 w-4 text-white" />
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Compartir en</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openShare("whatsapp")}>
              <WhatsAppIcon className="text-green-600" /> WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openShare("facebook")}>
              <FacebookIcon className="h-4 w-4 text-blue-600" /> Facebook
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openShare("instagram")}>
              <InstagramIcon className="h-4 w-4 text-pink-600" /> Instagram
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openShare("tiktok")}>
              <Music2 className="text-foreground" /> TikTok
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openShare("twitter")}>
              <TwitterIcon className="h-4 w-4 text-sky-500" /> X / Twitter
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openShare("telegram")}>
              <Send className="text-sky-600" /> Telegram
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openShare("email")}>
              <Mail /> Correo
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={copyLink}>
              <LinkIcon /> Copiar enlace
            </DropdownMenuItem>
            <DropdownMenuItem onClick={nativeShare}>
              <Share2 /> Más opciones…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Dar las gracias"
              className="flex flex-col items-center gap-0.5"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-[0_4px_14px_-2px_rgba(245,158,11,0.55)] ring-1 ring-amber-300/60 transition hover:from-amber-200 hover:to-amber-400">
                <HandHeart className="h-4 w-4 text-amber-950" strokeWidth={2.4} />
              </span>
              <span className="text-[10px] font-semibold text-white drop-shadow">Gracias</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex items-center gap-2">
              <HandHeart className="h-4 w-4 text-amber-500" /> Enviar Gracias
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {[1, 3, 5, 10].map((amount) => (
              <DropdownMenuItem
                key={amount}
                onClick={() =>
                  toast.success(`¡Gracias enviado! 🧡`, {
                    description: `Has apoyado este reel con ${amount} €.`,
                  })
                }
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-700">
                  €
                </span>
                {amount} €
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                toast.success("Pronto podrás elegir otro monto", {
                  description: "Estamos preparando los pagos. ¡Gracias por tu apoyo!",
                })
              }
            >
              <Plus /> Otro monto…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>}

      {/* Bottom fixed info */}
      {!firstExternalOnly && <div className="absolute inset-x-3 bottom-3 z-10 space-y-2">
        <p className="line-clamp-2 text-[13px] font-semibold leading-tight text-white drop-shadow">
          {reel.title ?? "¡Saliendo del horno! 🍪 Temp. 1"}
        </p>
        {reel.product_name && (
          <button
            type="button"
            onClick={buy}
            className="flex w-full items-center gap-2 rounded-xl bg-white/15 px-2.5 py-2 text-left text-white shadow-md ring-1 ring-white/25 backdrop-blur-md transition hover:bg-white/25"
          >
            {productImg && (
              <img
                src={productImg}
                alt=""
                className="h-9 w-9 shrink-0 rounded-md object-cover ring-1 ring-white/40"
              />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-semibold">
                {reel.product_name}
              </span>
              <span className="block text-[11px] font-extrabold text-amber-300">
                ${Number(reel.product_price ?? 0).toFixed(2)}
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold ring-1 ring-white/40">
              <ShoppingCart className="h-3 w-3" />
              Comprar
            </span>
          </button>
        )}
      </div>}

    </article>
  );
}

// ============ Fullscreen modal with swipe between reels ============
function ExpandedReelModal({
  reel,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
}: {
  reel: DbReel;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const embed = useMemo(() => parseEmbed(reel.video_url), [reel.video_url]);
  const isEmbed = !!embed;
  const videoSrc = reel.video_url || FALLBACK_VIDEO[reel.slug] || "";

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        if (hasPrev) onPrev();
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        if (hasNext) onNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasPrev, hasNext, onPrev, onNext, onClose]);

  // Touch swipe (horizontal or vertical, like Facebook reels)
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const threshold = 60;
    if (Math.max(absX, absY) < threshold) return;
    if (absX > absY) {
      if (dx < 0 && hasNext) onNext();
      else if (dx > 0 && hasPrev) onPrev();
    } else {
      if (dy < 0 && hasNext) onNext();
      else if (dy > 0 && hasPrev) onPrev();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 0.5rem)",
        paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)",
        paddingLeft: "max(env(safe-area-inset-left), 0.5rem)",
        paddingRight: "max(env(safe-area-inset-right), 0.5rem)",
      }}
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label="Video en grande"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Cerrar"
        className="absolute z-20 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
        style={{
          top: "max(env(safe-area-inset-top), 0.75rem)",
          right: "max(env(safe-area-inset-right), 0.75rem)",
        }}
      >
        <X className="h-5 w-5" />
      </button>

      {hasPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          aria-label="Anterior"
          className="absolute left-2 top-1/2 z-20 hidden -translate-y-1/2 sm:grid h-12 w-12 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
        >
          ‹
        </button>
      )}
      {hasNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          aria-label="Siguiente"
          className="absolute right-2 top-1/2 z-20 hidden -translate-y-1/2 sm:grid h-12 w-12 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
        >
          ›
        </button>
      )}

      <div
        key={reel.id}
        className="relative flex h-full w-full items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isEmbed ? (
          <iframe
            src={embed!.embedUrl}
            title={reel.title ?? `${embed!.label} reel`}
            allow="autoplay; encrypted-media; picture-in-picture; clipboard-write; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-full w-full max-h-full max-w-full border-0"
            style={{ aspectRatio: "9 / 16" }}
          />
        ) : videoSrc ? (
          <video
            src={videoSrc}
            controls
            autoPlay
            playsInline
            loop
            className="h-full w-full max-h-full max-w-full object-contain bg-black"
          />
        ) : null}
      </div>
    </div>
  );
}


// ============ Comments panel (slides from right / bottom on mobile) ============
function CommentsPanel({ reelId, onClose }: { reelId: string; onClose: () => void }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<DbComment[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("reel_comments")
        .select("id, reel_id, user_id, body, created_at")
        .eq("reel_id", reelId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        toast.error("No se pudieron cargar los comentarios");
        setLoading(false);
        return;
      }
      const rows = (data ?? []) as Omit<DbComment, "author_name">[];
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      const names: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", ids);
        (profs ?? []).forEach((p: { id: string; display_name: string | null }) => {
          names[p.id] = p.display_name ?? "Anónimo";
        });
      }
      if (cancelled) return;
      setComments(rows.map((r) => ({ ...r, author_name: names[r.user_id] ?? "Anónimo" })));
      setLoading(false);
    })();

    const ch = supabase
      .channel(`reel-comments-${reelId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reel_comments", filter: `reel_id=eq.${reelId}` },
        async (payload) => {
          const row = payload.new as DbComment;
          let name = "Anónimo";
          const { data } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", row.user_id)
            .maybeSingle();
          if (data?.display_name) name = data.display_name;
          setComments((prev) =>
            prev.some((c) => c.id === row.id) ? prev : [...prev, { ...row, author_name: name }],
          );
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, [reelId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Inicia sesión para comentar");
      return;
    }
    const txt = body.trim();
    if (!txt) return;
    setSending(true);
    const { error } = await supabase
      .from("reel_comments")
      .insert({ reel_id: reelId, user_id: user.id, body: txt });
    setSending(false);
    if (error) {
      toast.error("No se pudo enviar el comentario");
      return;
    }
    setBody("");
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-end bg-black/50 md:items-stretch"
      onClick={onClose}
    >
      <div
        className="flex h-[75vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl md:h-full md:w-[420px] md:rounded-none md:rounded-l-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="text-sm font-extrabold text-[#1a0f0a]">Comentarios</h4>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#666]">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          )}
          {!loading && comments.length === 0 && (
            <p className="py-6 text-center text-xs text-[#666]">Sé el primero en comentar 💬</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-xs font-bold text-white">
                {(c.author_name ?? "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 rounded-2xl bg-[#f1f2f4] px-3 py-2">
                <p className="text-[11px] font-bold text-[#1a0f0a]">{c.author_name}</p>
                <p className="break-words text-sm text-[#333]">{c.body}</p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={submit} className="flex items-center gap-2 border-t bg-white p-3">
          <input
            type="text"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={user ? "Escribe un comentario…" : "Inicia sesión para comentar"}
            maxLength={500}
            disabled={!user || sending}
            className="flex-1 rounded-full border border-[#ddd] px-4 py-2 text-sm focus:border-[#c8956d] focus:outline-none focus:ring-1 focus:ring-[#c8956d]"
          />
          <button
            type="submit"
            disabled={!user || sending || !body.trim()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1a0f0a] text-white transition hover:bg-[#3d2418] disabled:opacity-40"
            aria-label="Enviar"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============ Admin modal — File upload OR embed link ============
function AdminModal({
  onClose,
  onPublish,
}: {
  onClose: () => void;
  onPublish: (r: DbReel) => void;
}) {
  const { user } = useAuth();
  const [mode, setMode] = useState<"file" | "embed">("file");
  const [title, setTitle] = useState("");
  const [productSlug, setProductSlug] = useState(PRODUCT_OPTIONS[0].slug);
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);

  const preview = useMemo(() => parseEmbed(link), [link]);
  const fileUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => () => { if (fileUrl) URL.revokeObjectURL(fileUrl); }, [fileUrl]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Añade un título"); return; }

    setSubmitting(true);
    let videoUrl = "";

    if (mode === "embed") {
      const trimmed = link.trim();
      if (!trimmed || !preview) {
        toast.error("Pega un enlace válido de Instagram, TikTok, Facebook o YouTube");
        setSubmitting(false);
        return;
      }
      videoUrl = trimmed;
    } else {
      if (!file) {
        toast.error("Selecciona un archivo de video");
        setSubmitting(false);
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        toast.error("El archivo supera los 100 MB");
        setSubmitting(false);
        return;
      }
      // Object URL = instantánea, se muestra en el feed inmediatamente
      videoUrl = URL.createObjectURL(file);

      // Intento de subida a Storage en segundo plano (best-effort, requiere auth)
      if (user) {
        const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
        const path = `${user.id}/${Date.now()}.${ext}`;
        setUploadPct(20);
        void supabase.storage
          .from("reels")
          .upload(path, file, { contentType: file.type || "video/mp4", upsert: false })
          .then(({ error: upErr }) => {
            setUploadPct(100);
            if (upErr) return;
            const { data: pub } = supabase.storage.from("reels").getPublicUrl(path);
            if (pub?.publicUrl) videoUrl = pub.publicUrl;
          });
      }
    }

    const product = PRODUCT_OPTIONS.find((p) => p.slug === productSlug) ?? PRODUCT_OPTIONS[0];

    // Reel optimista — aparece al instante en el feed
    const localReel: DbReel = {
      id: `local-${Date.now()}`,
      slug: `r-${Date.now()}`,
      title: title.trim(),
      video_url: videoUrl,
      product_name: product.name,
      product_price: product.price,
      product_image: product.image,
      product_slug: product.slug,
      author_id: user?.id ?? null,
      created_at: new Date().toISOString(),
    };
    onPublish(localReel);
    setSubmitting(false);

    // Persistencia en segundo plano (silencioso si falla, e.g. sin sesión)
    if (user) {
      void supabase.from("reels").insert({
        slug: localReel.slug,
        title: localReel.title,
        video_url: videoUrl,
        product_name: product.name,
        product_price: product.price,
        product_image: product.image,
        product_slug: product.slug,
        author_id: user.id,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-[#1a0f0a]">🎬 Nuevo Reel</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!user && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
            Debes iniciar sesión para publicar un reel.
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-[#f1f2f4] p-1">
          <button
            type="button"
            onClick={() => setMode("file")}
            className={`rounded-full px-3 py-2 text-[11px] font-bold transition ${
              mode === "file" ? "bg-white text-[#1a0f0a] shadow" : "text-[#666] hover:text-[#1a0f0a]"
            }`}
          >
            📁 Desde mi Galería
          </button>
          <button
            type="button"
            onClick={() => setMode("embed")}
            className={`rounded-full px-3 py-2 text-[11px] font-bold transition ${
              mode === "embed" ? "bg-white text-[#1a0f0a] shadow" : "text-[#666] hover:text-[#1a0f0a]"
            }`}
          >
            🔗 Incrustar Link
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          {mode === "file" ? (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#1a0f0a]">
                Archivo de video (.mp4, .mov, .webm — máx 100 MB)
              </span>
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full cursor-pointer rounded-md border border-dashed border-[#c8956d] bg-amber-50/40 px-3 py-3 text-xs text-[#1a0f0a] file:mr-3 file:rounded-full file:border-0 file:bg-[#1a0f0a] file:px-3 file:py-1.5 file:text-[11px] file:font-bold file:text-white hover:bg-amber-50"
              />
              {file && (
                <div className="mt-2 space-y-2">
                  <p className="text-[10px] text-[#666]">
                    {file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                  {fileUrl && (
                    <video
                      src={fileUrl}
                      className="aspect-[9/16] w-32 rounded-lg bg-black object-cover ring-1 ring-black/10"
                      muted
                      playsInline
                      controls
                    />
                  )}
                </div>
              )}
              {submitting && uploadPct > 0 && uploadPct < 100 && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#eee]">
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{ width: `${uploadPct}%` }}
                  />
                </div>
              )}
            </label>
          ) : (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#1a0f0a]">
                Enlace del Reel
              </span>
              <div className="relative">
                <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999]" />
                <input
                  type="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="Pega aquí el enlace (Link) de tu Reel de Instagram, TikTok o Facebook"
                  className="w-full rounded-md border border-[#ddd] pl-9 pr-3 py-2 text-sm focus:border-[#c8956d] focus:outline-none focus:ring-1 focus:ring-[#c8956d]"
                  maxLength={500}
                />
              </div>
              <p className="mt-1 text-[10px] text-[#666]">
                Soporta Instagram, TikTok, Facebook y YouTube Shorts.
              </p>
              {link && !preview && (
                <p className="mt-1 text-[10px] font-semibold text-rose-600">
                  ⚠️ No reconocemos este enlace. Verifica que sea público.
                </p>
              )}
              {preview && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                  ✓ {preview.label} detectado
                </div>
              )}
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[#1a0f0a]">
              Título / descripción
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Galleta Explosiva de Nutella 🍫"
              className="w-full rounded-md border border-[#ddd] px-3 py-2 text-sm focus:border-[#c8956d] focus:outline-none focus:ring-1 focus:ring-[#c8956d]"
              maxLength={120}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[#1a0f0a]">Galleta asociada</span>
            <select
              value={productSlug}
              onChange={(e) => setProductSlug(e.target.value)}
              className="w-full rounded-md border border-[#ddd] bg-white px-3 py-2 text-sm focus:border-[#c8956d] focus:outline-none focus:ring-1 focus:ring-[#c8956d]"
            >
              {PRODUCT_OPTIONS.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name} — ${p.price.toFixed(2)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-[#666]">
              Nombre y precio se mostrarán en la tarjeta translúcida "Comprar del Reel".
            </p>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-xs font-semibold text-[#1a0f0a] hover:bg-black/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!user || submitting}
              className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-4 py-2 text-xs font-bold text-[#1a0f0a] shadow transition hover:bg-amber-300 disabled:opacity-40"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Publicar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
