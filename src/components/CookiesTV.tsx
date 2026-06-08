import { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Share2, ShoppingCart, Upload, X, Play, Pause, Volume2, VolumeX, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import reel1 from "@/assets/reel-cookie-1.mp4.asset.json";
import reel2 from "@/assets/reel-cookie-2.mp4.asset.json";
import reel3 from "@/assets/reel-cookie-3.mp4.asset.json";
import imgDoubleChoc from "@/assets/ins-double-choc.jpg";
import imgCookiesCream from "@/assets/ins-cookies-cream.jpg";
import imgPB from "@/assets/ins-pb.jpg";
import imgChocChunk from "@/assets/ins-chocolate-chunk.jpg";
import imgMint from "@/assets/ins-mint.jpg";
import imgWhiteMac from "@/assets/ins-white-mac.jpg";

interface ReelItem {
  id: string;
  src: string;
  title: string;
  product: { id: string; name: string; price: number; image: string };
  likes: number;
  comments: number;
}

const PRODUCT_OPTIONS = [
  { id: "p-doublechoc", name: "Galleta Explosiva de Nutella", price: 4.95, image: imgDoubleChoc },
  { id: "p-cc", name: "Cookies & Cream Premium", price: 4.25, image: imgCookiesCream },
  { id: "p-pb", name: "Mantequilla de Maní Crunch", price: 3.75, image: imgPB },
  { id: "p-cchunk", name: "Doble Chispas de Chocolate", price: 3.95, image: imgChocChunk },
  { id: "p-mint", name: "Menta y Chocolate Dark", price: 4.5, image: imgMint },
  { id: "p-pista", name: "Pistacho y Chocolate Blanco", price: 4.5, image: imgWhiteMac },
];

const INITIAL_REELS: ReelItem[] = [
  {
    id: "r1",
    src: reel1.url,
    title: "Recién horneadas 🍫 chocolate derretido",
    product: PRODUCT_OPTIONS[0],
    likes: 1284,
    comments: 87,
  },
  {
    id: "r2",
    src: reel2.url,
    title: "Cookies & Cream: el clásico premium",
    product: PRODUCT_OPTIONS[1],
    likes: 932,
    comments: 54,
  },
  {
    id: "r3",
    src: reel3.url,
    title: "Crunch de maní recién salido del horno",
    product: PRODUCT_OPTIONS[2],
    likes: 2110,
    comments: 142,
  },
];

export function CookiesTV() {
  const [reels, setReels] = useState<ReelItem[]>(INITIAL_REELS);
  const [adminOpen, setAdminOpen] = useState(false);

  return (
    <section className="mx-auto mt-6 max-w-[1500px] px-3 md:px-6">
      <div className="rounded-md bg-gradient-to-br from-[#1a0f0a] to-[#3d2418] p-4 shadow-md ring-1 ring-black/10 md:p-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 items-center rounded-full bg-rose-500 px-2 text-[10px] font-extrabold uppercase tracking-wider text-white">
                Live
              </span>
              <h2 className="text-xl font-extrabold text-white md:text-2xl">
                Cookies TV · Galleta Reels
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-white/70">
              Videos cortos de nuestras galletas · Compra directo desde el reel
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAdminOpen(true)}
            className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
          >
            🛠️ Panel: Subir Nuevo Reel
          </button>
        </div>

        <div className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
          {reels.map((r) => (
            <ReelCard key={r.id} reel={r} />
          ))}
        </div>
      </div>

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

function ReelCard({ reel }: { reel: ReelItem }) {
  const cart = useCart();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(reel.likes);

  const toggle = async () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      try {
        await v.play();
        setPlaying(true);
      } catch {
        /* ignore */
      }
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const onLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked((p) => {
      setLikes((c) => c + (p ? -1 : 1));
      return !p;
    });
  };

  const onShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: reel.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Enlace copiado");
      }
    } catch {
      /* user cancelled */
    }
  };

  const onComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.info("Próximamente: comentarios en reels");
  };

  const onBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    cart.add({
      id: `reel-${reel.product.id}`,
      name: reel.product.name,
      price: reel.product.price,
      image: reel.product.image,
    });
    toast.success(`${reel.product.name} agregado al carrito`);
  };

  return (
    <article
      className="relative aspect-[9/16] w-[220px] shrink-0 snap-start overflow-hidden rounded-xl bg-black shadow-lg sm:w-[240px] md:w-[260px]"
    >
      <video
        ref={videoRef}
        src={reel.src}
        playsInline
        muted
        loop
        preload="metadata"
        className="h-full w-full object-cover"
        onClick={toggle}
      />

      {/* dark overlays for legibility */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />

      {/* play/pause indicator */}
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pausar" : "Reproducir"}
        className="absolute inset-0 grid place-items-center"
      >
        {!playing && (
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white/90 shadow-xl">
            <Play className="h-6 w-6 fill-[#1a0f0a] text-[#1a0f0a]" />
          </span>
        )}
        {playing && (
          <span className="opacity-0 transition group-hover:opacity-100">
            <Pause className="h-6 w-6 text-white" />
          </span>
        )}
      </button>

      {/* right side action rail */}
      <div className="absolute right-2 top-3 z-10 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onLike}
          className="flex flex-col items-center gap-0.5 rounded-full bg-black/40 px-2 py-1.5 backdrop-blur transition active:scale-90"
          aria-label="Me gusta"
        >
          <Heart className={`h-5 w-5 ${liked ? "fill-rose-500 text-rose-500" : "text-white"}`} />
          <span className="text-[10px] font-bold text-white">{formatCount(likes)}</span>
        </button>
        <button
          type="button"
          onClick={onComment}
          className="flex flex-col items-center gap-0.5 rounded-full bg-black/40 px-2 py-1.5 backdrop-blur transition active:scale-90"
          aria-label="Comentarios"
        >
          <MessageCircle className="h-5 w-5 text-white" />
          <span className="text-[10px] font-bold text-white">{formatCount(reel.comments)}</span>
        </button>
        <button
          type="button"
          onClick={onShare}
          className="flex flex-col items-center gap-0.5 rounded-full bg-black/40 px-2 py-1.5 backdrop-blur transition active:scale-90"
          aria-label="Compartir"
        >
          <Share2 className="h-5 w-5 text-white" />
          <span className="text-[10px] font-bold text-white">Share</span>
        </button>
      </div>

      {/* mute button */}
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Activar sonido" : "Silenciar"}
        className="absolute right-2 bottom-[105px] z-10 grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white backdrop-blur"
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>

      {/* title */}
      <div className="pointer-events-none absolute left-2 right-12 top-2 z-10">
        <p className="text-xs font-bold leading-tight text-white drop-shadow">{reel.title}</p>
      </div>

      {/* shoppable product card */}
      <div className="absolute inset-x-2 bottom-2 z-10 flex items-center gap-2 rounded-lg bg-white/90 p-2 shadow-lg backdrop-blur">
        <img
          src={reel.product.image}
          alt={reel.product.name}
          className="h-11 w-11 shrink-0 rounded-md object-cover"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-[11px] font-bold text-[#1a0f0a]">{reel.product.name}</p>
          <p className="text-[12px] font-extrabold text-[#b12704]">
            ${reel.product.price.toFixed(2)}
          </p>
        </div>
        <button
          type="button"
          onClick={onBuy}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#c8956d] px-2.5 py-1.5 text-[10px] font-bold text-white shadow transition hover:bg-[#a87852] active:scale-95"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          Comprar
        </button>
      </div>
    </article>
  );
}

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function AdminModal({
  onClose,
  onPublish,
}: {
  onClose: () => void;
  onPublish: (r: ReelItem) => void;
}) {
  const [title, setTitle] = useState("");
  const [productId, setProductId] = useState(PRODUCT_OPTIONS[0].id);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      toast.error("Selecciona un archivo de video");
      return;
    }
    const url = URL.createObjectURL(f);
    setFileUrl(url);
    setFileName(f.name);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileUrl) {
      toast.error("Sube un video primero");
      return;
    }
    if (!title.trim()) {
      toast.error("Añade un título");
      return;
    }
    const product = PRODUCT_OPTIONS.find((p) => p.id === productId) ?? PRODUCT_OPTIONS[0];
    onPublish({
      id: `r-${Date.now()}`,
      src: fileUrl,
      title: title.trim(),
      product,
      likes: 0,
      comments: 0,
    });
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
            <span className="mb-1 block text-xs font-semibold text-[#1a0f0a]">Título / descripción</span>
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
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full rounded-md border border-[#ddd] bg-white px-3 py-2 text-sm focus:border-[#c8956d] focus:outline-none focus:ring-1 focus:ring-[#c8956d]"
            >
              {PRODUCT_OPTIONS.map((p) => (
                <option key={p.id} value={p.id}>
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
              className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-4 py-2 text-xs font-bold text-[#1a0f0a] shadow transition hover:bg-amber-300"
            >
              <Plus className="h-3.5 w-3.5" />
              Publicar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
