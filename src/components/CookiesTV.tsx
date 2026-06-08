import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  ShoppingCart,
  Upload,
  X,
  Play,
  Volume2,
  VolumeX,
  Plus,
  Send,
  ChevronUp,
  ChevronDown,
  Loader2,
} from "lucide-react";
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

// Fallback assets for seeded reels (video files live in repo).
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

const PRODUCT_OPTIONS = [
  { slug: "p-doublechoc", name: "Galleta Explosiva de Nutella", price: 4.95, image: imgDoubleChoc },
  { slug: "p-cc", name: "Cookies & Cream Premium", price: 4.25, image: imgCookiesCream },
  { slug: "p-pb", name: "Mantequilla de Maní Crunch", price: 3.75, image: imgPB },
  { slug: "p-cchunk", name: "Doble Chispas de Chocolate", price: 3.95, image: imgChocChunk },
  { slug: "p-mint", name: "Menta y Chocolate Dark", price: 4.5, image: imgMint },
  { slug: "p-pista", name: "Pistacho y Chocolate Blanco", price: 4.5, image: imgWhiteMac },
];

// ============ Main component (top stories bar) ============
export function CookiesTV() {
  const { user } = useAuth();
  const [reels, setReels] = useState<DbReel[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminOpen, setAdminOpen] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  // Likes aggregate per reel
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());

  // Initial fetch
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
      setReels((data ?? []) as DbReel[]);
      setLoading(false);

      // Counts in parallel
      const ids = (data ?? []).map((r) => r.id);
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

  // Realtime: keep aggregate counts in sync
  useEffect(() => {
    const ch = supabase
      .channel("reels-aggregates")
      .on("postgres_changes", { event: "*", schema: "public", table: "reel_likes" }, (payload) => {
        const newRow = (payload.new ?? payload.old) as { reel_id: string; user_id: string } | null;
        if (!newRow) return;
        setLikeCounts((prev) => {
          const delta = payload.eventType === "INSERT" ? 1 : payload.eventType === "DELETE" ? -1 : 0;
          return { ...prev, [newRow.reel_id]: Math.max(0, (prev[newRow.reel_id] ?? 0) + delta) };
        });
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reel_comments" },
        (payload) => {
          const newRow = (payload.new ?? payload.old) as { reel_id: string } | null;
          if (!newRow) return;
          setCommentCounts((prev) => {
            const delta =
              payload.eventType === "INSERT" ? 1 : payload.eventType === "DELETE" ? -1 : 0;
            return { ...prev, [newRow.reel_id]: Math.max(0, (prev[newRow.reel_id] ?? 0) + delta) };
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, []);

  const toggleLike = async (reelId: string) => {
    if (!user) {
      toast.error("Inicia sesión para dar me gusta");
      return;
    }
    const liked = myLikes.has(reelId);
    // Optimistic
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

  return (
    <section className="mx-auto max-w-[1500px] px-3 pt-3 md:px-6">
      <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5">
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 items-center rounded-full bg-rose-500 px-1.5 text-[9px] font-extrabold uppercase tracking-wider text-white">
              Live
            </span>
            <h2 className="text-sm font-extrabold text-[#1a0f0a] md:text-base">
              Cookies TV · Galleta Reels
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setAdminOpen(true)}
            className="shrink-0 rounded-full bg-[#1a0f0a] px-3 py-1 text-[10px] font-semibold text-white transition hover:bg-[#3d2418]"
          >
            + Nuevo Reel
          </button>
        </div>

        <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-1 pb-1">
          {loading && (
            <div className="flex h-20 items-center gap-2 text-xs text-[#666]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando reels…
            </div>
          )}
          {!loading &&
            reels.map((r, i) => (
              <StoryThumb
                key={r.id}
                reel={r}
                onClick={() => setOpenIdx(i)}
              />
            ))}
          {!loading && reels.length === 0 && (
            <p className="py-6 text-xs text-[#666]">Aún no hay reels. ¡Sé el primero!</p>
          )}
        </div>
      </div>

      {openIdx !== null && (
        <ReelsViewer
          reels={reels}
          startIdx={openIdx}
          onClose={() => setOpenIdx(null)}
          likeCounts={likeCounts}
          commentCounts={commentCounts}
          myLikes={myLikes}
          onToggleLike={toggleLike}
        />
      )}

      {adminOpen && (
        <AdminModal
          onClose={() => setAdminOpen(false)}
          onPublish={(newReel) => {
            setReels((prev) => [newReel, ...prev]);
            setAdminOpen(false);
            toast.success("¡Reel publicado!");
          }}
        />
      )}
    </section>
  );
}

// ============ Story thumbnail (Instagram-style bubble) ============
function StoryThumb({ reel, onClick }: { reel: DbReel; onClick: () => void }) {
  const videoSrc = reel.video_url || FALLBACK_VIDEO[reel.slug] || "";
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    // capture a still frame
    const handle = () => {
      try {
        v.currentTime = 0.1;
      } catch {
        /* ignore */
      }
    };
    v.addEventListener("loadedmetadata", handle);
    return () => v.removeEventListener("loadedmetadata", handle);
  }, [videoSrc]);

  const label = reel.title || reel.product_name || "Reel";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-[72px] shrink-0 flex-col items-center gap-1"
    >
      <span className="relative grid h-[72px] w-[72px] place-items-center rounded-full bg-gradient-to-tr from-rose-500 via-amber-400 to-pink-500 p-[3px] transition group-hover:scale-105">
        <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-white p-[2px]">
          <span className="relative h-full w-full overflow-hidden rounded-full bg-black">
            {videoSrc ? (
              <video
                ref={ref}
                src={videoSrc}
                muted
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />
            ) : reel.product_image ? (
              <img src={reel.product_image} alt="" className="h-full w-full object-cover" />
            ) : null}
            <span className="absolute inset-0 grid place-items-center bg-black/20">
              <Play className="h-5 w-5 fill-white text-white drop-shadow" />
            </span>
          </span>
        </span>
      </span>
      <span className="line-clamp-1 max-w-[72px] text-center text-[10px] font-medium text-[#1a0f0a]">
        {label}
      </span>
    </button>
  );
}

// ============ Fullscreen Reels viewer (Instagram-like) ============
function ReelsViewer({
  reels,
  startIdx,
  onClose,
  likeCounts,
  commentCounts,
  myLikes,
  onToggleLike,
}: {
  reels: DbReel[];
  startIdx: number;
  onClose: () => void;
  likeCounts: Record<string, number>;
  commentCounts: Record<string, number>;
  myLikes: Set<string>;
  onToggleLike: (id: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(startIdx);
  const [commentsOpenFor, setCommentsOpenFor] = useState<string | null>(null);

  useEffect(() => {
    // lock body scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    // jump to start index after mount
    const el = scrollerRef.current;
    if (!el) return;
    const target = el.querySelector<HTMLElement>(`[data-idx='${startIdx}']`);
    if (target) target.scrollIntoView({ block: "start" });
  }, [startIdx]);

  // Detect active slide via IntersectionObserver
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const items = el.querySelectorAll<HTMLElement>("[data-idx]");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.6) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            setActiveIdx(idx);
          }
        });
      },
      { root: el, threshold: [0.6] },
    );
    items.forEach((it) => obs.observe(it));
    return () => obs.disconnect();
  }, [reels.length]);

  const goto = (delta: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const nextIdx = Math.min(reels.length - 1, Math.max(0, activeIdx + delta));
    const target = el.querySelector<HTMLElement>(`[data-idx='${nextIdx}']`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black">
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute right-3 top-3 z-30 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      {/* desktop nav arrows */}
      <button
        type="button"
        onClick={() => goto(-1)}
        aria-label="Anterior"
        className="absolute left-3 top-1/2 z-30 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 md:grid"
      >
        <ChevronUp className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => goto(1)}
        aria-label="Siguiente"
        className="absolute right-3 top-1/2 z-30 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 md:grid"
      >
        <ChevronDown className="h-5 w-5" />
      </button>

      <div
        ref={scrollerRef}
        className="h-full w-full snap-y snap-mandatory overflow-y-scroll"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {reels.map((r, i) => (
          <div
            key={r.id}
            data-idx={i}
            className="flex h-screen w-full snap-start items-center justify-center"
          >
            <ReelSlide
              reel={r}
              isActive={i === activeIdx}
              likes={likeCounts[r.id] ?? 0}
              comments={commentCounts[r.id] ?? 0}
              liked={myLikes.has(r.id)}
              onToggleLike={() => onToggleLike(r.id)}
              onOpenComments={() => setCommentsOpenFor(r.id)}
            />
          </div>
        ))}
      </div>

      {commentsOpenFor && (
        <CommentsPanel reelId={commentsOpenFor} onClose={() => setCommentsOpenFor(null)} />
      )}
    </div>
  );
}

function ReelSlide({
  reel,
  isActive,
  likes,
  comments,
  liked,
  onToggleLike,
  onOpenComments,
}: {
  reel: DbReel;
  isActive: boolean;
  likes: number;
  comments: number;
  liked: boolean;
  onToggleLike: () => void;
  onOpenComments: () => void;
}) {
  const cart = useCart();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  const videoSrc = reel.video_url || FALLBACK_VIDEO[reel.slug] || "";
  const productImg =
    reel.product_image ||
    (reel.product_slug ? FALLBACK_PRODUCT_IMG[reel.product_slug] : "") ||
    "";

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.currentTime = 0;
      v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      v.pause();
      setPlaying(false);
    }
  }, [isActive, videoSrc]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      v.pause();
      setPlaying(false);
    }
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

  return (
    <article className="relative h-full max-h-[100dvh] w-full max-w-[min(450px,100vw)] overflow-hidden bg-black sm:rounded-lg">
      {videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          playsInline
          loop
          muted={muted}
          preload="auto"
          className="h-full w-full object-cover"
          onClick={togglePlay}
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-white/60">Sin video</div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />

      {!playing && videoSrc && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Reproducir"
          className="absolute inset-0 grid place-items-center"
        >
          <span className="grid h-16 w-16 place-items-center rounded-full bg-white/90">
            <Play className="h-7 w-7 fill-[#1a0f0a] text-[#1a0f0a]" />
          </span>
        </button>
      )}

      {/* Mute */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMuted((m) => !m);
        }}
        className="absolute right-3 top-14 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur"
        aria-label={muted ? "Activar sonido" : "Silenciar"}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>

      {/* Right rail */}
      <div className="absolute bottom-28 right-3 z-10 flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={onToggleLike}
          aria-label="Me gusta"
          className="flex flex-col items-center gap-0.5 transition active:scale-90"
        >
          <span className="grid h-11 w-11 place-items-center rounded-full bg-black/40 backdrop-blur">
            <Heart className={`h-6 w-6 ${liked ? "fill-rose-500 text-rose-500" : "text-white"}`} />
          </span>
          <span className="text-[11px] font-bold text-white drop-shadow">{formatCount(likes)}</span>
        </button>
        <button
          type="button"
          onClick={onOpenComments}
          aria-label="Comentarios"
          className="flex flex-col items-center gap-0.5"
        >
          <span className="grid h-11 w-11 place-items-center rounded-full bg-black/40 backdrop-blur">
            <MessageCircle className="h-6 w-6 text-white" />
          </span>
          <span className="text-[11px] font-bold text-white drop-shadow">
            {formatCount(comments)}
          </span>
        </button>
        <button
          type="button"
          onClick={async () => {
            try {
              const url = typeof window !== "undefined" ? window.location.href : "";
              if (navigator.share) await navigator.share({ title: reel.title ?? "", url });
              else {
                await navigator.clipboard.writeText(url);
                toast.success("Enlace copiado");
              }
            } catch {
              /* cancel */
            }
          }}
          className="flex flex-col items-center gap-0.5"
          aria-label="Compartir"
        >
          <span className="grid h-11 w-11 place-items-center rounded-full bg-black/40 backdrop-blur">
            <Share2 className="h-5 w-5 text-white" />
          </span>
        </button>
      </div>

      {/* Title */}
      <div className="absolute inset-x-3 bottom-24 z-10">
        <p className="text-sm font-bold leading-tight text-white drop-shadow">
          {reel.title ?? "Reel"}
        </p>
      </div>

      {/* Shoppable card */}
      {reel.product_name && (
        <div className="absolute inset-x-3 bottom-3 z-10 flex items-center gap-2 rounded-lg bg-white/95 p-2 shadow-lg backdrop-blur">
          {productImg && (
            <img
              src={productImg}
              alt={reel.product_name}
              className="h-12 w-12 shrink-0 rounded-md object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-xs font-bold text-[#1a0f0a]">{reel.product_name}</p>
            <p className="text-sm font-extrabold text-[#b12704]">
              ${Number(reel.product_price ?? 0).toFixed(2)}
            </p>
          </div>
          <button
            type="button"
            onClick={buy}
            className="inline-flex items-center gap-1 rounded-full bg-[#c8956d] px-3 py-2 text-[11px] font-bold text-white shadow hover:bg-[#a87852]"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Comprar
          </button>
        </div>
      )}
    </article>
  );
}

// ============ Comments panel ============
function CommentsPanel({ reelId, onClose }: { reelId: string; onClose: () => void }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<DbComment[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load + realtime
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
          // Fetch display name
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
      className="absolute inset-0 z-40 flex items-end bg-black/60"
      onClick={onClose}
    >
      <div
        className="flex h-[70vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl"
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
            <p className="py-6 text-center text-xs text-[#666]">
              Sé el primero en comentar 💬
            </p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-xs font-bold text-white">
                {(c.author_name ?? "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
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

// ============ Admin upload modal ============
function AdminModal({
  onClose,
  onPublish,
}: {
  onClose: () => void;
  onPublish: (r: DbReel) => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [productSlug, setProductSlug] = useState(PRODUCT_OPTIONS[0].slug);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      toast.error("Selecciona un archivo de video");
      return;
    }
    setFileUrl(URL.createObjectURL(f));
    setFileName(f.name);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Inicia sesión para publicar");
      return;
    }
    if (!fileUrl) {
      toast.error("Sube un video primero");
      return;
    }
    if (!title.trim()) {
      toast.error("Añade un título");
      return;
    }
    const product = PRODUCT_OPTIONS.find((p) => p.slug === productSlug) ?? PRODUCT_OPTIONS[0];
    setSubmitting(true);
    const { data, error } = await supabase
      .from("reels")
      .insert({
        slug: `r-${Date.now()}`,
        title: title.trim(),
        video_url: fileUrl, // NOTE: blob URL — replace with Storage upload for persistence
        product_name: product.name,
        product_price: product.price,
        product_image: product.image,
        product_slug: product.slug,
        author_id: user.id,
      })
      .select("*")
      .single();
    setSubmitting(false);
    if (error || !data) {
      toast.error("No se pudo publicar el reel");
      return;
    }
    onPublish(data as DbReel);
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
          <h3 className="text-lg font-extrabold text-[#1a0f0a]">🛠️ Subir nuevo Reel</h3>
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

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[#1a0f0a]">Archivo de video</span>
            <div className="flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#1a0f0a] px-3 py-2 text-xs font-semibold text-white hover:bg-[#3d2418]">
                <Upload className="h-3.5 w-3.5" />
                Elegir video
                <input type="file" accept="video/*" onChange={onFile} className="hidden" />
              </label>
              <span className="truncate text-[11px] text-[#666]">
                {fileName || "Sin archivo seleccionado"}
              </span>
            </div>
            {fileUrl && (
              <video
                src={fileUrl}
                muted
                playsInline
                controls
                className="mt-2 aspect-[9/16] w-32 rounded-md bg-black object-cover"
              />
            )}
          </label>

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
            <span className="mb-1 block text-xs font-semibold text-[#1a0f0a]">Producto asociado</span>
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
