import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ComponentType } from "react";
import useEmblaCarousel from "embla-carousel-react";
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
  Pencil,
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
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { useCart } from "@/lib/cart";
import { useSubscriptionGate } from "@/lib/subscription-gate";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { syncReelPlayback } from "@/lib/reel-playback";
import { useQuery } from "@tanstack/react-query";
import { listProductos, type Producto } from "@/lib/productos.functions";
import reel1 from "@/assets/reel-cookie-1.mp4.asset.json";
import reel2 from "@/assets/reel-cookie-2.mp4.asset.json";
import reel3 from "@/assets/reel-cookie-3.mp4.asset.json";
import reelPista from "@/assets/reel-pista.mp4.asset.json";
import reelTriple from "@/assets/reel-triple.mp4.asset.json";
import reelSnicker from "@/assets/reel-snicker.mp4.asset.json";
import reelOatmeal from "@/assets/reel-oatmeal.mp4.asset.json";
import reelCchunk from "@/assets/reel-cchunk.mp4.asset.json";
import reelMint from "@/assets/reel-mint.mp4.asset.json";
import reelMM from "@/assets/reel-mm.mp4.asset.json";
import imgDoubleChoc from "@/assets/ins-double-choc.jpg";
import imgCookiesCream from "@/assets/ins-cookies-cream.jpg";
import imgPB from "@/assets/ins-pb.jpg";
import imgChocChunk from "@/assets/ins-chocolate-chunk.jpg";
import imgMint from "@/assets/ins-mint.jpg";
import imgWhiteMac from "@/assets/ins-white-mac.jpg";
import imgSnicker from "@/assets/ins-snickerdoodle.jpg";
import imgOatmeal from "@/assets/ins-oatmeal.jpg";
import imgMM from "@/assets/ins-mm.jpg";

// Translate value if it matches a known i18n key (e.g. "reels.items.pista.title"),
// otherwise return the raw value. This lets DB-stored reel titles / product names
// be localized while remaining backwards-compatible with free-text values.
// Also maps known Spanish literals stored in the DB to their i18n keys so
// legacy rows get localized without a data migration.
// Maps any legacy Spanish or English literal that may live in the DB
// (from an older admin form) to its canonical i18n key, so every reel
// product name and title translates correctly across all 9 languages
// regardless of when the row was inserted.
const REEL_TEXT_KEY_MAP: Record<string, string> = {
  // ---- Titles (legacy Spanish) ----
  "Crunch de maní recién salido del horno": "reels.items.pb.title",
  "Cookies & Cream: el clásico premium": "reels.items.cookiescream.title",
  "Recién horneadas 🍫 chocolate derretido": "reels.items.nutella.title",
  // ---- Product names (Spanish + English variants) ----
  // pb — Peanut Butter Crunch
  "Mantequilla de Maní Crunch": "reels.items.pb.product",
  "Mantequilla de Maní Crujiente": "reels.items.pb.product",
  "Peanut Butter Crunch": "reels.items.pb.product",
  // cookiescream
  "Cookies & Cream Premium": "reels.items.cookiescream.product",
  // nutella
  "Galleta Explosiva de Nutella": "reels.items.nutella.product",
  "Nutella Explosion Cookie": "reels.items.nutella.product",
  // cchunk — Double Chocolate Chunk
  "Doble Chispas de Chocolate": "reels.items.cchunk.product",
  "Double Chocolate Chunk": "reels.items.cchunk.product",
  "Chocolate Chunk": "reels.items.cchunk.product",
  // mint
  "Menta y Chocolate Dark": "reels.items.mint.product",
  "Dark Mint Chocolate": "reels.items.mint.product",
  // pista
  "Pistacho y Chocolate Blanco": "reels.items.pista.product",
  "Pistachio & White Chocolate": "reels.items.pista.product",
  // mm
  "M&M Festiva": "reels.items.mm.product",
  "Festive M&M": "reels.items.mm.product",
  // triple
  "Triple Chocolate Fundido": "reels.items.triple.product",
  "Triple Chocolate Fudge": "reels.items.triple.product",
  // snicker
  "Snickerdoodle Clásica": "reels.items.snicker.product",
  "Classic Snickerdoodle": "reels.items.snicker.product",
  // oatmeal
  "Avena y Pasas con Canela": "reels.items.oatmeal.product",
  "Oatmeal & Raisin Cinnamon": "reels.items.oatmeal.product",
};

// Fallback: derive the i18n product key from a reel's stable product_slug,
// so even a brand-new DB row with a free-text product_name still renders
// the localized name.
const SLUG_TO_PRODUCT_KEY: Record<string, string> = {
  "p-pb": "reels.items.pb.product",
  "p-cc": "reels.items.cookiescream.product",
  "p-doublechoc": "reels.items.nutella.product",
  "p-cchunk": "reels.items.cchunk.product",
  "p-mint": "reels.items.mint.product",
  "p-pista": "reels.items.pista.product",
  "p-mm": "reels.items.mm.product",
  "p-triple": "reels.items.triple.product",
  "p-snicker": "reels.items.snicker.product",
  "p-oatmeal": "reels.items.oatmeal.product",
};
export function reelProductKeyFromSlug(slug: string | null | undefined): string | undefined {
  if (!slug) return undefined;
  const k = SLUG_TO_PRODUCT_KEY[slug];
  return k && i18n.exists(k) ? k : undefined;
}

// Maps each reel's stable product_slug to the canonical productos.id (UUID)
// seeded in the Supabase `productos` table. This keeps Reels and /shop in
// sync: buying from a Reel adds the same product row (id, name, price)
// that /shop reads directly from the database.
const REEL_SLUG_TO_PRODUCTO_ID: Record<string, string> = {
  "p-cchunk":     "a1111111-0000-0000-0000-000000000001", // Chocolate Chunk
  "p-snicker":    "a1111111-0000-0000-0000-000000000002", // Snickerdoodle
  "p-oatmeal":    "a1111111-0000-0000-0000-000000000003", // Oatmeal Raisin
  "p-mint":       "a1111111-0000-0000-0000-000000000004", // Mint Chocolate
  "p-pista":      "a1111111-0000-0000-0000-000000000005", // Pistachio
  "p-triple":     "a1111111-0000-0000-0000-000000000006", // Triple Chocolate
  "p-doublechoc": "a1111111-0000-0000-0000-000000000006", // Triple Chocolate (same image line)
  "p-mm":         "a1111111-0000-0000-0000-000000000007", // M&M Festivo
  "p-cc":         "a1111111-0000-0000-0000-000000000008", // Snicker (closest fallback for cookies&cream)
  "p-pb":         "a1111111-0000-0000-0000-000000000009", // Mantequilla de Maní Crujiente
};
export function resolveProductoForReel(
  slug: string | null | undefined,
  productosById: Map<string, Producto> | null | undefined,
): Producto | null {
  if (!slug || !productosById) return null;
  const id = REEL_SLUG_TO_PRODUCTO_ID[slug];
  if (!id) return null;
  return productosById.get(id) ?? null;
}
function translateReelKey(
  value: string | null | undefined,
  slugFallback?: string | null,
): string | undefined {
  if (value) {
    if (value.startsWith("reels.") && i18n.exists(value)) return value;
    const mapped = REEL_TEXT_KEY_MAP[value.trim()];
    if (mapped && i18n.exists(mapped)) return mapped;
  }
  return reelProductKeyFromSlug(slugFallback);
}
function translateReelText(
  value: string | null | undefined,
  slugFallback?: string | null,
): string {
  const key = translateReelKey(value, slugFallback);
  if (key) return i18n.t(key);
  return value ?? "";
}

// ============ Types ============
interface DbReel {
  id: string;
  slug: string;
  title: string | null;
  video_url: string | null;
  thumb_url: string | null;
  product_name: string | null;
  product_price: number | null;
  product_image: string | null;
  product_slug: string | null;
  author_id: string | null;
  created_at: string;
  expires_at?: string | null;
  is_ad?: boolean | null;
  cta_label?: string | null;
  cta_url?: string | null;
  sponsor_name?: string | null;
}

interface DbComment {
  id: string;
  reel_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author_name?: string;
}

const BRAND = "HAZOREX Cookies";

const FALLBACK_VIDEO: Record<string, string> = {
  "demo-nutella": reel1.url,
  "demo-cookies-cream": reel2.url,
  "demo-pb": reel3.url,
  "reel-pista": reelPista.url,
  "reel-triple": reelTriple.url,
  "reel-snicker": reelSnicker.url,
  "reel-oatmeal": reelOatmeal.url,
  "reel-cchunk": reelCchunk.url,
  "reel-mint": reelMint.url,
  "reel-mm": reelMM.url,
};
const FALLBACK_PRODUCT_IMG: Record<string, string> = {
  "p-doublechoc": imgDoubleChoc,
  "p-cc": imgCookiesCream,
  "p-pb": imgPB,
  "p-cchunk": imgChocChunk,
  "p-mint": imgMint,
  "p-pista": imgWhiteMac,
  "p-triple": imgDoubleChoc,
  "p-snicker": imgSnicker,
  "p-oatmeal": imgOatmeal,
  "p-mm": imgMM,
};

// Original, pre-Supabase Reels source. Used whenever the `reels` table is
// unavailable or empty so the carousel always renders with its original
// content (same names, prices, images and IDs as before the DB unification).
const LOCAL_FALLBACK_REELS: DbReel[] = [
  { id: "local-nutella", slug: "demo-nutella", title: "reels.items.nutella.title", video_url: reel1.url, thumb_url: null, product_name: "reels.items.nutella.product", product_price: 4.95, product_image: imgDoubleChoc, product_slug: "p-doublechoc", author_id: null, created_at: "2025-01-01T00:00:00Z" },
  { id: "local-cookiescream", slug: "demo-cookies-cream", title: "reels.items.cookiescream.title", video_url: reel2.url, thumb_url: null, product_name: "reels.items.cookiescream.product", product_price: 4.25, product_image: imgCookiesCream, product_slug: "p-cc", author_id: null, created_at: "2025-01-01T00:00:00Z" },
  { id: "local-pb", slug: "demo-pb", title: "reels.items.pb.title", video_url: reel3.url, thumb_url: null, product_name: "reels.items.pb.product", product_price: 3.75, product_image: imgPB, product_slug: "p-pb", author_id: null, created_at: "2025-01-01T00:00:00Z" },
  { id: "local-pista", slug: "reel-pista", title: "reels.items.pista.title", video_url: reelPista.url, thumb_url: null, product_name: "reels.items.pista.product", product_price: 4.5, product_image: imgWhiteMac, product_slug: "p-pista", author_id: null, created_at: "2025-01-01T00:00:00Z" },
  { id: "local-triple", slug: "reel-triple", title: "reels.items.triple.title", video_url: reelTriple.url, thumb_url: null, product_name: "reels.items.triple.product", product_price: 4.75, product_image: imgDoubleChoc, product_slug: "p-triple", author_id: null, created_at: "2025-01-01T00:00:00Z" },
  { id: "local-snicker", slug: "reel-snicker", title: "reels.items.snicker.title", video_url: reelSnicker.url, thumb_url: null, product_name: "reels.items.snicker.product", product_price: 3.95, product_image: imgSnicker, product_slug: "p-snicker", author_id: null, created_at: "2025-01-01T00:00:00Z" },
  { id: "local-oatmeal", slug: "reel-oatmeal", title: "reels.items.oatmeal.title", video_url: reelOatmeal.url, thumb_url: null, product_name: "reels.items.oatmeal.product", product_price: 3.75, product_image: imgOatmeal, product_slug: "p-oatmeal", author_id: null, created_at: "2025-01-01T00:00:00Z" },
  { id: "local-cchunk", slug: "reel-cchunk", title: "reels.items.cchunk.title", video_url: reelCchunk.url, thumb_url: null, product_name: "reels.items.cchunk.product", product_price: 3.95, product_image: imgChocChunk, product_slug: "p-cchunk", author_id: null, created_at: "2025-01-01T00:00:00Z" },
  { id: "local-mint", slug: "reel-mint", title: "reels.items.mint.title", video_url: reelMint.url, thumb_url: null, product_name: "reels.items.mint.product", product_price: 4.5, product_image: imgMint, product_slug: "p-mint", author_id: null, created_at: "2025-01-01T00:00:00Z" },
  { id: "local-mm", slug: "reel-mm", title: "reels.items.mm.title", video_url: reelMM.url, thumb_url: null, product_name: "reels.items.mm.product", product_price: 4.5, product_image: imgMM, product_slug: "p-mm", author_id: null, created_at: "2025-01-01T00:00:00Z" },
];

const REELS_STORAGE_BUCKET = "reels-media";
const REELS_STORAGE_MARKER = `/storage/v1/object/public/${REELS_STORAGE_BUCKET}/`;
const REELS_STORAGE_LEGACY_MARKER = "/storage/v1/object/public/reels/";

function normalizePotentialVideoUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let text = raw.trim().replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  if (!text) return null;
  if (!/^https?:\/\//i.test(text)) {
    if (/^(www\.)?(instagram|tiktok|facebook|fb|youtube|youtu|vm\.tiktok|vt\.tiktok|m\.tiktok|m\.facebook|m\.youtube)\./i.test(text)) {
      text = `https://${text}`;
    }
  }

  const instagram = text.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:[\w.-]+\/)?(reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i);
  if (instagram) {
    const kind = instagram[1].toLowerCase() === "reels" ? "reel" : instagram[1].toLowerCase();
    return `https://www.instagram.com/${kind}/${instagram[2]}/`;
  }
  const instagramShare = text.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/share\/(?:reel\/)?([A-Za-z0-9_-]+)/i);
  if (instagramShare) return `https://www.instagram.com/share/reel/${instagramShare[1]}/`;

  const tiktok = text.match(/(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([\w.-]+)\/(video|photo)\/(\d+)/i);
  if (tiktok) return `https://www.tiktok.com/@${tiktok[1]}/${tiktok[2].toLowerCase()}/${tiktok[3]}`;
  const tiktokShort = text.match(/(?:https?:\/\/)?((?:vm|vt)\.tiktok\.com\/[A-Za-z0-9_-]+\/?)/i);
  if (tiktokShort) return `https://${tiktokShort[1]}`;
  const tiktokEmbed = text.match(/(?:https?:\/\/)?(?:www\.)?tiktok\.com\/(?:v\/|embed\/v2\/)(\d+)/i);
  if (tiktokEmbed) return `https://www.tiktok.com/embed/v2/${tiktokEmbed[1]}`;

  const youtubeId =
    text.match(/(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]+)/i)?.[1] ||
    text.match(/(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/(?:watch\?(?:.*&)?v=|live\/|embed\/)([A-Za-z0-9_-]+)/i)?.[1] ||
    text.match(/(?:https?:\/\/)?youtu\.be\/([A-Za-z0-9_-]+)/i)?.[1];
  if (youtubeId) return `https://www.youtube.com/shorts/${youtubeId}`;

  const facebook = text.match(/https?:\/\/(?:www\.|m\.)?facebook\.com\/[^\s"'<>]+/i)?.[0] || text.match(/https?:\/\/fb\.watch\/[^\s"'<>]+/i)?.[0];
  if (facebook) return facebook.replace(/^https?:\/\/m\.facebook\.com/i, "https://www.facebook.com");

  const direct = text.match(/https?:\/\/[^\s"'<>]+?\.(?:mp4|webm|mov|m4v)(?:\?[^\s"'<>]*)?/i)?.[0];
  if (direct) return direct;

  return /^https?:\/\//i.test(text) ? text : null;
}

function getReelStoragePath(url: string | null | undefined) {
  if (!url) return null;
  let markerIndex = url.indexOf(REELS_STORAGE_MARKER);
  let markerLen = REELS_STORAGE_MARKER.length;
  if (markerIndex === -1) {
    markerIndex = url.indexOf(REELS_STORAGE_LEGACY_MARKER);
    markerLen = REELS_STORAGE_LEGACY_MARKER.length;
  }
  if (markerIndex === -1) return null;
  const encodedPath = url.slice(markerIndex + markerLen).split("?")[0];
  try {
    return decodeURIComponent(encodedPath);
  } catch {
    return encodedPath;
  }
}

async function signStoredReelVideos(rows: DbReel[]) {
  const paths = Array.from(
    new Set(
      rows.flatMap((r) => [getReelStoragePath(r.video_url), getReelStoragePath(r.thumb_url)])
        .filter(Boolean) as string[],
    ),
  );
  if (!paths.length) return rows;

  const { data, error } = await supabase.storage
    .from(REELS_STORAGE_BUCKET)
    .createSignedUrls(paths, 60 * 60 * 24);
  if (error || !data) return rows;

  const signedByPath = new Map<string, string>();
  data.forEach((item) => {
    if (item.path && item.signedUrl) signedByPath.set(item.path, item.signedUrl);
  });

  return rows.map((row) => {
    const videoPath = getReelStoragePath(row.video_url);
    const thumbPath = getReelStoragePath(row.thumb_url);
    return {
      ...row,
      video_url: videoPath && signedByPath.has(videoPath) ? signedByPath.get(videoPath)! : row.video_url,
      thumb_url: thumbPath && signedByPath.has(thumbPath) ? signedByPath.get(thumbPath)! : row.thumb_url,
    };
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

// nameKey is the i18n key we persist in product_name for new reels so any
// language switch localizes automatically. name is the Spanish label shown
// inside the admin form select — the DB never sees it after this change.
const PRODUCT_OPTIONS = [
  { slug: "p-doublechoc", nameKey: "reels.items.nutella.product", name: "Galleta Explosiva de Nutella", price: 4.95, image: imgDoubleChoc },
  { slug: "p-cc", nameKey: "reels.items.cookiescream.product", name: "Cookies & Cream Premium", price: 4.25, image: imgCookiesCream },
  { slug: "p-pb", nameKey: "reels.items.pb.product", name: "Mantequilla de Maní Crujiente", price: 3.75, image: imgPB },
  { slug: "p-cchunk", nameKey: "reels.items.cchunk.product", name: "Doble Chispas de Chocolate", price: 3.95, image: imgChocChunk },
  { slug: "p-mint", nameKey: "reels.items.mint.product", name: "Menta y Chocolate Dark", price: 4.5, image: imgMint },
  { slug: "p-pista", nameKey: "reels.items.pista.product", name: "Pistacho y Chocolate Blanco", price: 4.5, image: imgWhiteMac },
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
  let url = normalizePotentialVideoUrl(raw) ?? raw.trim();
  if (!url) return null;
  // Tolerate URLs pegadas sin protocolo
  if (!/^https?:\/\//i.test(url)) {
    if (/^(www\.)?(instagram|tiktok|facebook|fb|youtube|youtu|vm\.tiktok|vt\.tiktok|m\.tiktok|m\.facebook|m\.youtube)\./i.test(url)) {
      url = `https://${url}`;
    } else {
      return null;
    }
  }

  // Normaliza subdominios móviles
  const normalized = url
    .replace(/^https?:\/\/m\.facebook\.com/i, "https://www.facebook.com")
    .replace(/^https?:\/\/m\.youtube\.com/i, "https://www.youtube.com")
    .replace(/^https?:\/\/music\.youtube\.com/i, "https://www.youtube.com")
    .replace(/^https?:\/\/m\.tiktok\.com/i, "https://www.tiktok.com");

  // Instagram: /reel/, /reels/, /p/, /tv/, /share/reel/
  const ig =
    normalized.match(/instagram\.com\/(?:[\w.-]+\/)?(reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i) ||
    normalized.match(/instagram\.com\/share\/(?:reel\/)?([A-Za-z0-9_-]+)/i);
  if (ig) {
    const kindRaw = ig.length === 3 ? ig[1] : "reel";
    const kind = kindRaw.toLowerCase() === "reels" ? "reel" : kindRaw.toLowerCase();
    const code = ig.length === 3 ? ig[2] : ig[1];
    return {
      platform: "instagram",
      embedUrl: `https://www.instagram.com/${kind}/${code}/embed/captioned/`,
      originalUrl: url,
      label: "Instagram",
    };
  }

  // TikTok: /@user/video/{id}, /v/{id}, /embed/v2/{id}, /t/{code}, /photo/{id}
  const tt =
    normalized.match(/tiktok\.com\/(?:@[\w.-]+\/(?:video|photo)\/|v\/|embed\/v2\/)(\d+)/i);
  if (tt) {
    return {
      platform: "tiktok",
      embedUrl: `https://www.tiktok.com/embed/v2/${tt[1]}`,
      originalUrl: url,
      label: "TikTok",
    };
  }
  if (/(?:vm|vt)\.tiktok\.com\//i.test(url) || /tiktok\.com\/t\//i.test(normalized)) {
    return {
      platform: "tiktok",
      embedUrl: `https://www.tiktok.com/embed?lang=en&url=${encodeURIComponent(url)}`,
      originalUrl: url,
      label: "TikTok",
    };
  }

  // Facebook: reel, watch, videos, share/v|r, fb.watch
  if (
    /facebook\.com\/(?:reel|watch|share\/(?:v|r|video)|[\w.-]+\/videos|video\.php)/i.test(normalized) ||
    /fb\.watch\//i.test(url)
  ) {
    return {
      platform: "facebook",
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
        url,
      )}&show_text=false&width=560&t=0`,
      originalUrl: url,
      label: "Facebook",
    };
  }

  // YouTube Shorts / watch / live / embed / youtu.be
  const yt =
    normalized.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]+)/i) ||
    normalized.match(/youtube\.com\/(?:watch\?(?:.*&)?v=|live\/|embed\/)([A-Za-z0-9_-]+)/i) ||
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

// Acepta enlaces directos a un archivo de video (.mp4, .webm, .mov, .m4v),
// incluyendo Lovable Cloud Storage signed URLs.
function isDirectVideoUrl(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const url = normalizePotentialVideoUrl(raw) ?? raw.trim();
  if (!/^https?:\/\//i.test(url)) return false;
  const path = url.split("?")[0].toLowerCase();
  return /\.(mp4|webm|mov|m4v)$/i.test(path);
}

// ============ Native-app deep link per platform ============
interface PlatformAppLink {
  Icon: ComponentType<{ className?: string }>;
  label: string;
  colorClass: string;
  /** iOS custom scheme (opens app via URL scheme). */
  iosAppUrl: string | null;
  /** Android Intent URI with package + https fallback baked in. */
  androidIntentUrl: string | null;
  /** Universal/web URL (also works on desktop). */
  webUrl: string;
}

function stripScheme(url: string): string {
  return url.replace(/^https?:\/\//i, "");
}

function buildAndroidIntent(url: string, pkg: string): string {
  // https scheme + S.browser_fallback_url so Chrome opens the web URL if the app isn't installed.
  const noScheme = stripScheme(url);
  const fallback = encodeURIComponent(url);
  return `intent://${noScheme}#Intent;scheme=https;package=${pkg};S.browser_fallback_url=${fallback};end`;
}

function getPlatformAppLink(embed: EmbedInfo): PlatformAppLink {
  const url = embed.originalUrl;
  switch (embed.platform) {
    case "instagram": {
      const m = url.match(/instagram\.com\/(reel|p|tv)\/([A-Za-z0-9_-]+)/i);
      const shortcode = m?.[2] ?? null;
      return {
        Icon: InstagramIcon,
        label: "Abrir en Instagram",
        colorClass: "text-pink-500",
        iosAppUrl: shortcode ? `instagram://media?shortcode=${shortcode}` : null,
        androidIntentUrl: buildAndroidIntent(url, "com.instagram.android"),
        webUrl: url,
      };
    }
    case "tiktok": {
      const m = url.match(/tiktok\.com\/@([\w.-]+)\/video\/(\d+)/i);
      const videoId = m?.[2] ?? null;
      return {
        Icon: Music2,
        label: "Abrir en TikTok",
        colorClass: "text-black",
        // snssdk1233 is TikTok's internal scheme; falls back to web automatically.
        iosAppUrl: videoId ? `snssdk1233://aweme/detail/${videoId}` : null,
        androidIntentUrl: buildAndroidIntent(url, "com.zhiliaoapp.musically"),
        webUrl: url,
      };
    }
    case "facebook": {
      return {
        Icon: FacebookIcon,
        label: "Abrir en Facebook",
        colorClass: "text-blue-500",
        iosAppUrl: `fb://facewebmodal/f?href=${encodeURIComponent(url)}`,
        androidIntentUrl: buildAndroidIntent(url, "com.facebook.katana"),
        webUrl: url,
      };
    }
    case "youtube": {
      const m =
        url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]+)/i) ||
        url.match(/youtube\.com\/watch\?v=([A-Za-z0-9_-]+)/i) ||
        url.match(/youtu\.be\/([A-Za-z0-9_-]+)/i);
      const videoId = m?.[1] ?? null;
      return {
        Icon: YoutubeIcon,
        label: "Abrir en YouTube",
        colorClass: "text-red-500",
        iosAppUrl: videoId ? `youtube://watch?v=${videoId}` : null,
        androidIntentUrl: buildAndroidIntent(url, "com.google.android.youtube"),
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

function detectPlatform(): "ios" | "android" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function openInNativeApp(link: PlatformAppLink) {
  if (typeof window === "undefined") return;
  const platform = detectPlatform();

  // Android: intent:// handles app open + web fallback natively in Chrome.
  if (platform === "android" && link.androidIntentUrl) {
    window.location.href = link.androidIntentUrl;
    return;
  }

  // iOS: try custom scheme, fall back to web URL if app isn't installed.
  if (platform === "ios" && link.iosAppUrl) {
    const start = Date.now();
    const fallback = window.setTimeout(() => {
      // If we're still here after ~1.2s, the app didn't open.
      if (Date.now() - start < 2000 && document.visibilityState === "visible") {
        window.location.href = link.webUrl;
      }
    }, 1200);
    window.addEventListener(
      "pagehide",
      () => window.clearTimeout(fallback),
      { once: true },
    );
    window.location.href = link.iosAppUrl;
    return;
  }

  // Desktop / unknown: open the web URL in a new tab.
  window.open(link.webUrl, "_blank", "noopener,noreferrer");
}


// ============ Embed thumbnail resolver (TikTok / YouTube oEmbed) ============
const EMBED_THUMB_CACHE = new Map<string, string | null>();

function getYouTubeId(url: string): string | null {
  const m =
    url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]+)/i) ||
    url.match(/youtube\.com\/(?:watch\?(?:.*&)?v=|live\/|embed\/)([A-Za-z0-9_-]+)/i) ||
    url.match(/youtu\.be\/([A-Za-z0-9_-]+)/i);
  return m?.[1] ?? null;
}

function getStaticEmbedThumbnail(embed: EmbedInfo | null): string | null {
  if (!embed) return null;
  if (embed.platform === "youtube") {
    const id = getYouTubeId(embed.originalUrl);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  }
  return null;
}

async function resolveEmbedThumbnail(embed: EmbedInfo | null): Promise<string | null> {
  const staticThumb = getStaticEmbedThumbnail(embed);
  if (staticThumb) return staticThumb;
  if (!embed || embed.platform !== "tiktok") return null;
  try {
    const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(embed.originalUrl)}`);
    if (!response.ok) return null;
    const data = (await response.json()) as { thumbnail_url?: string };
    return data.thumbnail_url ?? null;
  } catch {
    return null;
  }
}

function createVideoThumbnailBlob(file: File): Promise<Blob | null> {
  if (typeof document === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    let done = false;
    const finish = (blob: Blob | null) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
      resolve(blob);
    };
    const capture = () => {
      const w = video.videoWidth || 720;
      const h = video.videoHeight || 1280;
      if (!w || !h) return finish(null);
      const maxWidth = 720;
      const scale = Math.min(1, maxWidth / w);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return finish(null);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => finish(blob), "image/jpeg", 0.82);
    };
    const timer = window.setTimeout(() => finish(null), 5000);
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.addEventListener("loadedmetadata", () => {
      try {
        const target = Number.isFinite(video.duration) && video.duration > 0.35 ? 0.25 : 0;
        if (target > 0) video.currentTime = target;
        else capture();
      } catch {
        capture();
      }
    });
    video.addEventListener("seeked", capture, { once: true });
    video.addEventListener("error", () => finish(null), { once: true });
    video.src = url;
  });
}

function useEmbedThumbnail(embed: EmbedInfo | null): string | null {
  const url = embed?.originalUrl ?? "";
  const [thumb, setThumb] = useState<string | null>(() => {
    if (!embed) return null;
    const staticThumb = getStaticEmbedThumbnail(embed);
    if (staticThumb) return staticThumb;
    return EMBED_THUMB_CACHE.get(url) ?? null;
  });

  useEffect(() => {
    if (!embed) return;
    if (embed.platform === "youtube") return;
    if (EMBED_THUMB_CACHE.has(url)) {
      setThumb(EMBED_THUMB_CACHE.get(url) ?? null);
      return;
    }
    const oembed =
      embed.platform === "tiktok"
        ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
        : null;
    if (!oembed) {
      EMBED_THUMB_CACHE.set(url, null);
      return;
    }
    let cancelled = false;
    fetch(oembed)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { thumbnail_url?: string } | null) => {
        const t = data?.thumbnail_url ?? null;
        EMBED_THUMB_CACHE.set(url, t);
        if (!cancelled) setThumb(t);
      })
      .catch(() => {
        EMBED_THUMB_CACHE.set(url, null);
      });
    return () => {
      cancelled = true;
    };
  }, [embed, url]);

  return thumb;
}

// ============ Main: Facebook-style Reels row ============
export function CookiesTV() {
  const { user } = useAuth();
  const [reels, setReels] = useState<DbReel[]>([]);
  const reelsRef = useRef(reels);
  useEffect(() => { reelsRef.current = reels; }, [reels]);
  const [loading, setLoading] = useState(true);
  const [adminOpen, setAdminOpen] = useState(false);
  const [editingReel, setEditingReel] = useState<DbReel | null>(null);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [globalMuted, setGlobalMuted] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Canonical catalog from Supabase `productos` — Reels resolve their
  // linked product against this map so name, price and id in the cart
  // match /shop exactly.
  const { data: productos } = useQuery({
    queryKey: ["productos"],
    queryFn: () => listProductos(),
    staleTime: 60_000,
  });
  const productosById = useMemo(() => {
    const m = new Map<string, Producto>();
    (productos ?? []).forEach((p) => m.set(p.id, p));
    return m;
  }, [productos]);



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
        // `reels` table not available in this environment — fall back to
        // the original local reels so the carousel keeps working.
        setReels(LOCAL_FALLBACK_REELS);
        setLoading(false);
        return;
      }
      // Merge DB rows with local reels by slug so bundled video/thumb/image
      // assets fill in any columns that were seeded as NULL. Rows the DB
      // doesn't know about still show up via the local fallback.
      const localBySlug = new Map(LOCAL_FALLBACK_REELS.map((r) => [r.slug, r]));
      const dbRows = (data ?? []) as DbReel[];
      const merged: DbReel[] = dbRows.map((row) => {
        const local = row.slug ? localBySlug.get(row.slug) : undefined;
        if (!local) return row;
        return {
          ...row,
          video_url: row.video_url ?? local.video_url,
          thumb_url: row.thumb_url ?? local.thumb_url,
          product_image: row.product_image ?? local.product_image,
          product_name: row.product_name ?? local.product_name,
          product_price: row.product_price ?? local.product_price,
          product_slug: row.product_slug ?? local.product_slug,
          title: row.title ?? local.title,
        };
      });
      // Append any local reels not represented in the DB (defensive).
      const seenSlugs = new Set(merged.map((r) => r.slug));
      for (const local of LOCAL_FALLBACK_REELS) {
        if (!seenSlugs.has(local.slug)) merged.push(local);
      }
      const signedRows = await signStoredReelVideos(merged);
      if (cancelled) return;
      const playable = signedRows.filter(hasPlayableSource);
      setReels(playable.length ? playable : LOCAL_FALLBACK_REELS);
      setLoading(false);

      const ids = playable.map((r) => r.id);
      if (ids.length) {
        const [{ data: likeRows }, { data: commentRows }, { data: myLikeRows }] = await Promise.all([
          supabase.rpc("reel_like_counts", { reel_ids: ids }),
          supabase.rpc("reel_comment_counts", { reel_ids: ids }),
          user
            ? supabase.from("reel_likes").select("reel_id").in("reel_id", ids).eq("user_id", user.id)
            : Promise.resolve({ data: [] }),
        ]);
        if (cancelled) return;
        const lc: Record<string, number> = {};
        const mine = new Set<string>();
        (likeRows ?? []).forEach((l: { reel_id: string; like_count: number }) => {
          lc[l.reel_id] = Number(l.like_count) || 0;
        });
        (myLikeRows ?? []).forEach((l: { reel_id: string }) => {
          mine.add(l.reel_id);
        });
        const cc: Record<string, number> = {};
        (commentRows ?? []).forEach((c: { reel_id: string; comment_count: number }) => {
          cc[c.reel_id] = Number(c.comment_count) || 0;
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

  // Realtime aggregates — only subscribe to comments (reel_likes is not
  // broadcast to avoid leaking other users' identities via Realtime).
  useEffect(() => {
    const ch = supabase
      .channel("reels-aggregates")
      .on("postgres_changes", { event: "*", schema: "public", table: "reel_comments" }, (payload) => {
        const row = (payload.new ?? payload.old) as { reel_id: string } | null;
        if (!row) return;
        setCommentCounts((prev) => {
          const delta = payload.eventType === "INSERT" ? 1 : payload.eventType === "DELETE" ? -1 : 0;
          return { ...prev, [row.reel_id]: Math.max(0, (prev[row.reel_id] ?? 0) + delta) };
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reels" }, async (payload) => {
        const newRow = payload.new as DbReel;
        if (reelsRef.current.some((r) => r.id === newRow.id)) return;
        const [signed] = await signStoredReelVideos([newRow]);
        if (!hasPlayableSource(signed)) return;
        setReels((prev) => (prev.some((r) => r.id === signed.id) ? prev : [signed, ...prev]));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "reels" }, (payload) => {
        const oldRow = payload.old as { id: string } | null;
        if (!oldRow?.id) return;
        setReels((prev) => prev.filter((r) => r.id !== oldRow.id));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "reels" }, async (payload) => {
        const newRow = payload.new as DbReel;
        const [signed] = await signStoredReelVideos([newRow]);
        setReels((prev) => prev.map((r) => (r.id === signed.id ? { ...r, ...signed } : r)));
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
          </div>
          {canManageAllReels && (
            <button
              type="button"
              onClick={() => setAdminOpen(true)}
              className="shrink-0 rounded-full bg-[#1a0f0a] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#3d2418]"
            >
              + Nuevo Reel
            </button>
          )}
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
                canDelete={canManageAllReels}
                onDelete={() => handleDelete(r.id)}
                canEdit={canManageAllReels}
                onEdit={() => setEditingReel(r)}
                onExpand={() => setExpandedIndex(index)}
                productosById={productosById}
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

      {editingReel && (
        <AdminModal
          editing={editingReel}
          onClose={() => setEditingReel(null)}
          onPublish={(updated) => {
            setReels((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            setEditingReel(null);
            toast.success("¡Reel actualizado!");
          }}
        />
      )}

      {expandedIndex !== null && reels[expandedIndex] && (
        <ExpandedReelModal
          reels={reels}
          initialIndex={expandedIndex}
          onClose={() => setExpandedIndex(null)}
          likeCounts={likeCounts}
          commentCounts={commentCounts}
          myLikes={myLikes}
          onToggleLike={(id) => toggleLike(id)}
          onOpenComments={(id) => setCommentsFor(id)}
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
  canEdit,
  onEdit,
  isFirst,
  onExpand,
  productosById,
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
  canEdit: boolean;
  onEdit: () => void;
  isFirst?: boolean;
  onExpand: () => void;
  productosById: Map<string, Producto>;
}) {
  const { t } = useTranslation(); // subscribe so reel titles re-render on language change
  const cart = useCart();
  const gate = useSubscriptionGate();
  const cardRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [inView, setInView] = useState(false);
  const [burst, setBurst] = useState(false);

  const fallbackCookieVideo = FALLBACK_VIDEO[reel.slug] || FALLBACK_VIDEO["reel-1"] || "";
  const videoSrc = reel.video_url || fallbackCookieVideo || "";
  // Canonical productos row for this reel (source of truth for id/name/price/image
  // shown on the "Comprar" tile and added to the cart). Falls back to legacy
  // reel.product_* fields only when no matching row exists yet.
  const producto = resolveProductoForReel(reel.product_slug, productosById);
  const productImg =
    producto?.imagen_url ||
    reel.product_image ||
    (reel.product_slug ? FALLBACK_PRODUCT_IMG[reel.product_slug] : "") ||
    "";
  const effectiveVideoUrl = reel.video_url;
  const embed = useMemo(() => parseEmbed(effectiveVideoUrl), [effectiveVideoUrl]);
  const isEmbed = !!embed;
  const embedThumb = useEmbedThumbnail(embed);
  const posterUrl = reel.thumb_url || embedThumb || productImg || undefined;
  const firstExternalOnly = false;

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
    // Prefer the canonical `productos` row so the cart holds the same UUID,
    // name and price as /shop. Fallback to the reel's own fields for legacy
    // rows whose product_slug has no matching seeded product.
    if (producto) {
      const nameKey = translateReelKey(reel.product_name, reel.product_slug);
      const displayName = nameKey && i18n.exists(nameKey) ? i18n.t(nameKey) : producto.nombre;
      gate.guard(() => {
        cart.add({
          id: producto.id,
          name: displayName,
          nameKey,
          price: Number(producto.precio),
          image: producto.imagen_url || productImg,
        });
        toast.success(t("reels.addedToCart", { name: displayName, defaultValue: "{{name}} added to cart" }));
      });
      return;
    }
    const name = translateReelText(reel.product_name, reel.product_slug);
    const price = reel.product_price;
    if (!name || price == null) return;
    gate.guard(() => {
      cart.add({
        id: `reel-${reel.product_slug || reel.id}`,
        name,
        nameKey: translateReelKey(reel.product_name, reel.product_slug),
        price: Number(price),
        image: productImg,
      });
      toast.success(t("reels.addedToCart", { name, defaultValue: "{{name}} added to cart" }));
    });
  };

  const shareUrl = () => {
    if (firstExternalOnly && embed) return embed.originalUrl;
    // Always share a link to the dedicated reel page so social platforms
    // (WhatsApp, Facebook, Instagram, etc.) preview THIS reel — title,
    // thumbnail and video — instead of the full website homepage.
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://oys1.lovable.app";
    return `${origin}/reel/${encodeURIComponent(reel.slug || reel.id)}`;
  };
  const shareTitle = () => {
    const t = translateReelText(reel.title);
    const p = translateReelText(reel.product_name, reel.product_slug);
    return t ? `${t} · ${BRAND}` : p ? `${p} · ${BRAND}` : `Mira este reel de ${BRAND}`;
  };

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
      {/* Al expirar volvemos al video original de galletas — sin bloqueo */}


      {canEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          aria-label="Editar reel"
          title="Editar / reemplazar reel"
          className="absolute right-12 top-2 z-40 grid h-9 w-9 place-items-center rounded-full bg-amber-400 text-[#1a0f0a] shadow-lg ring-1 ring-white/30 backdrop-blur transition hover:bg-amber-300 active:scale-95"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Eliminar reel"
          title="Eliminar reel"
          className="absolute right-2 top-2 z-40 grid h-9 w-9 place-items-center rounded-full bg-red-600/90 text-white shadow-lg ring-1 ring-white/30 backdrop-blur transition hover:bg-red-700 active:scale-95"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      {firstExternalOnly ? (
        <>
          {productImg ? (
            <img
              src={productImg}
              alt={translateReelText(reel.product_name, reel.product_slug) || ""}
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
        (() => {
          const appLink = getPlatformAppLink(embed!);
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openInNativeApp(appLink);
              }}
              aria-label={`${appLink.label} — ${embed!.label}`}
              title={appLink.label}
              className="absolute inset-0 h-full w-full"
            >
              {posterUrl ? (
                <img
                  src={posterUrl}
                  alt={translateReelText(reel.title) || `${embed!.label} preview`}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" />
              )}
              {/* Big centered play with platform mark */}
              <span className="absolute inset-0 grid place-items-center">
                <span className="relative grid h-16 w-16 place-items-center rounded-full bg-white/95 shadow-xl ring-2 ring-white/60">
                  <Play className="h-7 w-7 fill-[#1a0f0a] text-[#1a0f0a]" />
                  <span className="absolute -bottom-1 -right-1">
                    <PlatformMark embed={embed!} className="h-7 w-7" />
                  </span>
                </span>
              </span>
              {/* "Open in {platform}" CTA pill */}
              <span className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/85 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-lg ring-1 ring-white/20 backdrop-blur">
                <span className="inline-flex items-center gap-1.5">
                  <ExternalLink className="h-3 w-3" />
                  {appLink.label}
                </span>
              </span>
            </button>
          );
        })()
      ) : videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          poster={posterUrl}
          playsInline
          loop
          muted
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-white/60">Sin video</div>
      )}

      {/* gradient overlays — softer over iframe so native controls remain visible */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 ${
          isEmbed ? "h-14 bg-gradient-to-b from-black/40 to-transparent" : "h-24 bg-gradient-to-b from-black/50 to-transparent"
        }`}
      />
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 ${
          isEmbed
            ? "h-32 bg-gradient-to-t from-black/85 via-black/40 to-transparent"
            : "h-1/2 bg-gradient-to-t from-black/85 via-black/40 to-transparent"
        }`}
      />

      {/* Center play overlay when paused — tap to open fullscreen with all features */}
      {!isEmbed && !playing && videoSrc && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
          aria-label="Reproducir en pantalla completa"
          className="absolute inset-0 z-10 grid place-items-center"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white/90 shadow-lg ring-2 ring-white/40">
            <Play className="h-6 w-6 fill-[#1a0f0a] text-[#1a0f0a]" />
          </span>
        </button>
      )}

      {/* Right rail actions */}
      {!firstExternalOnly && <div className="absolute bottom-32 right-2.5 z-20 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleLike}
          aria-label={t("reels.like", "Me gusta")}
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
          aria-label={t("reels.comments", "Comentarios")}
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
              aria-label={t("reels.share", "Compartir")}
              className="flex flex-col items-center gap-0.5"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-black/50 backdrop-blur transition hover:bg-black/70">
                <Share2 className="h-4 w-4 text-white" />
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>{t("reels.shareOn", "Compartir en")}</DropdownMenuLabel>
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
              aria-label={t("reels.thanksAria", "Dar las gracias")}
              className="flex flex-col items-center gap-0.5"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-[0_4px_14px_-2px_rgba(245,158,11,0.55)] ring-1 ring-amber-300/60 transition hover:from-amber-200 hover:to-amber-400">
                <HandHeart className="h-4 w-4 text-amber-950" strokeWidth={2.4} />
              </span>
              <span className="text-[10px] font-semibold text-white drop-shadow">{t("reels.thanks", "Gracias")}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex items-center gap-2">
              <HandHeart className="h-4 w-4 text-amber-500" /> {t("reels.sendThanks", "Enviar Gracias")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {[1, 3, 5, 10].map((amount) => (
              <DropdownMenuItem
                key={amount}
                onClick={() =>
                  toast.success(t("reels.thanksSentTitle", "¡Gracias enviado! 🧡"), {
                    description: t("reels.thanksSentDesc", { amount, defaultValue: "Has apoyado este reel con {{amount}} €." }),
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
                toast.success(t("reels.otherAmountSoonTitle", "Pronto podrás elegir otro monto"), {
                  description: t("reels.otherAmountSoonDesc", "Estamos preparando los pagos. ¡Gracias por tu apoyo!"),
                })
              }
            >
              <Plus /> {t("reels.otherAmount", "Otro monto…")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>}

      {/* Ad badge — visible whenever the reel is marked as a sponsored ad */}
      {reel.is_ad && (
        <div className="pointer-events-none absolute right-2 top-12 z-30 inline-flex items-center gap-1 rounded-md bg-amber-400 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#1a0f0a] shadow ring-1 ring-black/10">
          Ad
          {reel.sponsor_name && (
            <span className="ml-1 max-w-[90px] truncate text-[9px] font-bold normal-case tracking-normal opacity-80">
              · {reel.sponsor_name}
            </span>
          )}
        </div>
      )}

      {/* Bottom fixed info */}
      {!firstExternalOnly && <div className="absolute inset-x-3 bottom-3 z-10 space-y-2">
        <p className="line-clamp-2 text-[13px] font-semibold leading-tight text-white drop-shadow">
          {translateReelText(reel.title) || "¡Saliendo del horno! 🍪 Temp. 1"}
        </p>
        {reel.is_ad && reel.cta_url ? (
          <a
            href={reel.cta_url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={(e) => e.stopPropagation()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-3 py-2.5 text-center text-[12px] font-extrabold text-[#1a0f0a] shadow-md ring-1 ring-amber-300 transition hover:bg-amber-300"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {reel.cta_label?.trim() || t("reels.moreInfo", "Más información")}
          </a>
        ) : reel.product_name && (
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
                {producto
                  ? (() => {
                      const k = translateReelKey(reel.product_name, reel.product_slug);
                      return k && i18n.exists(k) ? t(k) : producto.nombre;
                    })()
                  : translateReelText(reel.product_name, reel.product_slug)}
              </span>
              <span className="block text-[11px] font-extrabold text-amber-300">
                ${Number(producto?.precio ?? reel.product_price ?? 0).toFixed(2)}
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold ring-1 ring-white/40">
              <ShoppingCart className="h-3 w-3" />
              {t("reels.buy", "Comprar")}
            </span>
          </button>
        )}
      </div>}

    </article>
  );
}

// ============ Fullscreen vertical swiper through all reels ============
function ExpandedReelModal({
  reels,
  initialIndex,
  onClose,
  likeCounts,
  commentCounts,
  myLikes,
  onToggleLike,
  onOpenComments,
}: {
  reels: DbReel[];
  initialIndex: number;
  onClose: () => void;
  likeCounts: Record<string, number>;
  commentCounts: Record<string, number>;
  myLikes: Set<string>;
  onToggleLike: (reelId: string) => void;
  onOpenComments: (reelId: string) => void;
}) {
  const { t } = useTranslation(); // re-render reel labels on language change
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: "y",
    loop: reels.length > 1,
    startIndex: initialIndex,
    dragFree: false,
    skipSnaps: false,
  });
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [burst, setBurst] = useState(false);
  const [, setPlayTick] = useState(0);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);

  const current = reels[selectedIndex] ?? reels[0];
  const currentLikes = likeCounts[current.id] ?? 0;
  const currentComments = commentCounts[current.id] ?? 0;
  const currentLiked = myLikes.has(current.id);

  // Track selected slide
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi]);

  // Play active video, pause + mute all others. Single source of truth for
  // "only the active reel plays" — covered by src/lib/reel-playback.test.ts.
  useEffect(() => {
    return syncReelPlayback(videoRefs.current, selectedIndex);
  }, [selectedIndex]);

  // Reflect the active video's actual play/pause state in the overlay.
  useEffect(() => {
    const v = videoRefs.current[selectedIndex];
    if (!v) return;
    const tick = () => setPlayTick((n) => n + 1);
    v.addEventListener("play", tick);
    v.addEventListener("pause", tick);
    return () => {
      v.removeEventListener("play", tick);
      v.removeEventListener("pause", tick);
    };
  }, [selectedIndex]);



  // Pause the active video when the tab is hidden; resume when visible.
  useEffect(() => {
    const onVis = () => {
      const active = videoRefs.current[selectedIndex];
      if (!active) return;
      if (document.hidden) {
        try {
          active.pause();
        } catch {
          /* noop */
        }
      } else {
        active.play().catch(() => {
          active.muted = true;
          active.play().catch(() => {});
        });
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [selectedIndex]);



  // Body scroll lock + keyboard nav + mouse wheel nav + best-effort fullscreen
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Try to enter fullscreen so the browser toolbar disappears (mobile + desktop).
    const docEl = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
    };
    const req = docEl.requestFullscreen ?? docEl.webkitRequestFullscreen;
    if (req && !document.fullscreenElement) {
      req.call(docEl).catch(() => {});
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") emblaApi?.scrollPrev();
      else if (e.key === "ArrowDown" || e.key === "ArrowRight") emblaApi?.scrollNext();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    };
  }, [emblaApi, onClose]);

  // Mouse wheel navigation (desktop) — throttled to one snap per gesture
  useEffect(() => {
    if (!emblaApi) return;
    let cooling = false;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (cooling) return;
      if (Math.abs(e.deltaY) < 10 && Math.abs(e.deltaX) < 10) return;
      const forward = (Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX) > 0;
      if (forward) emblaApi.scrollNext();
      else emblaApi.scrollPrev();
      cooling = true;
      window.setTimeout(() => {
        cooling = false;
      }, 450);
    };
    const node = emblaApi.rootNode();
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [emblaApi]);


  const handleLike = useCallback(() => {
    if (!currentLiked) {
      setBurst(true);
      window.setTimeout(() => setBurst(false), 600);
    }
    onToggleLike(current.id);
  }, [currentLiked, current.id, onToggleLike]);

  const shareUrl = () => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://oys1.lovable.app";
    return `${origin}/reel/${encodeURIComponent(current.slug || current.id)}`;
  };
  const shareTitle = () => {
    const tt = translateReelText(current.title);
    const pp = translateReelText(current.product_name, current.product_slug);
    return tt ? `${tt} · ${BRAND}` : pp ? `${pp} · ${BRAND}` : `Mira este reel de ${BRAND}`;
  };
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
      if (navigator.share) await navigator.share({ title: shareTitle(), url: shareUrl() });
      else await copyLink();
    } catch {
      /* cancelled */
    }
  };
  const openShare = (
    target: "facebook" | "whatsapp" | "twitter" | "telegram" | "email" | "instagram" | "tiktok",
  ) => {
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
        href = isMobile ? `https://wa.me/?text=${msg}` : `https://web.whatsapp.com/send?text=${msg}`;
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
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black md:bg-gradient-to-b md:from-zinc-950 md:via-black md:to-zinc-950"
      role="dialog"
      aria-modal="true"
      aria-label="Reproductor en pantalla completa"
    >
      {/* Centered 9:16 stage — fullscreen on mobile, cinematic frame on desktop */}
      <div
        className="relative h-full w-full overflow-hidden bg-black md:h-auto md:aspect-[9/16] md:w-[min(420px,calc(100dvh*9/16))] md:rounded-2xl md:shadow-2xl md:ring-1 md:ring-white/10"
      >
        {/* Close button (inside frame so it stays within video boundaries) */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute z-30 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
          style={{
            top: "max(env(safe-area-inset-top), 0.75rem)",
            right: "max(env(safe-area-inset-right), 0.75rem)",
          }}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Embla vertical swiper — one slide per reel */}
        <div ref={emblaRef} className="h-full w-full overflow-hidden">
          <div className="flex h-full w-full flex-col">
            {reels.map((r, i) => {
              const embed = parseEmbed(r.video_url);
              const src = r.video_url || FALLBACK_VIDEO[r.slug] || "";
              return (
                <div
                  key={r.id}
                  className="relative flex h-full w-full shrink-0 grow-0 basis-full items-center justify-center bg-black"
                >
                  {embed ? (
                    <iframe
                      src={embed.embedUrl}
                      title={translateReelText(r.title) || `${embed.label} reel`}
                      allow="autoplay; encrypted-media; picture-in-picture; clipboard-write; web-share"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                      className="h-full w-full border-0"
                      style={{ aspectRatio: "9 / 16" }}
                    />
                  ) : src ? (
                    <>
                      <video
                        ref={(el) => {
                          videoRefs.current[i] = el;
                        }}
                        src={src}
                        playsInline
                        loop
                        preload={Math.abs(i - selectedIndex) <= 1 ? "auto" : "metadata"}
                        onClick={() => {
                          if (i !== selectedIndex) return;
                          const v = videoRefs.current[i];
                          if (!v) return;
                          if (v.paused) {
                            v.play().catch(() => {
                              v.muted = true;
                              v.play().catch(() => {});
                            });
                          } else {
                            v.pause();
                          }
                          // Force re-render so the play overlay updates.
                          setPlayTick((n) => n + 1);
                        }}
                        className="h-full w-full cursor-pointer object-contain"
                      />
                      {i === selectedIndex && videoRefs.current[i]?.paused && (
                        <button
                          type="button"
                          aria-label="Reproducir"
                          onClick={() => {
                            const v = videoRefs.current[i];
                            v?.play().catch(() => {
                              if (!v) return;
                              v.muted = true;
                              v.play().catch(() => {});
                            });
                            setPlayTick((n) => n + 1);
                          }}
                          className="pointer-events-auto absolute inset-0 z-10 grid place-items-center bg-black/20"
                        >
                          <span className="grid h-20 w-20 place-items-center rounded-full bg-white/90 shadow-2xl backdrop-blur">
                            <Play className="h-8 w-8 fill-black text-black" />
                          </span>
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="grid h-full w-full place-items-center text-white/60">
                      Sin video
                    </div>
                  )}


                  {/* Subtle bottom gradient for overlay legibility */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  {/* Title overlay (per-video) — bottom-left, inside the frame */}
                  <div
                    className="pointer-events-none absolute left-0 z-10 pl-5"
                    style={{
                      bottom: "calc(max(env(safe-area-inset-bottom), 0px) + 4.5rem)",
                      right: "5.5rem",
                    }}
                  >
                    <p className="line-clamp-2 text-sm font-semibold text-white drop-shadow-lg">
                      {translateReelText(r.title)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      {/* Right-side action rail — overlay, vertical (inside 9:16 frame on desktop) */}
      <div
        className="absolute right-3 z-20 flex flex-col items-center gap-4"
        style={{ bottom: "calc(max(env(safe-area-inset-bottom), 0px) + 4.5rem)" }}
      >
        <button
          type="button"
          onClick={handleLike}
          aria-label={t("reels.like", "Me gusta")}
          className="relative flex flex-col items-center gap-0.5 transition active:scale-90"
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-black/55 backdrop-blur transition hover:bg-black/75">
            <Heart
              className={`h-6 w-6 transition ${currentLiked ? "fill-rose-500 text-rose-500" : "text-white"}`}
            />
          </span>
          <span className="text-[11px] font-bold text-white drop-shadow">
            {formatCount(currentLikes)}
          </span>
          {burst && (
            <span className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 animate-ping text-rose-400">
              <Heart className="h-9 w-9 fill-rose-500 text-rose-500" />
            </span>
          )}
        </button>


        <button
          type="button"
          onClick={() => onOpenComments(current.id)}
          aria-label={t("reels.comments", "Comentarios")}
          className="flex flex-col items-center gap-0.5"
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-sky-500/80 backdrop-blur transition hover:bg-sky-500">
            <MessageCircle className="h-6 w-6 text-white" />
          </span>
          <span className="text-[11px] font-bold text-white drop-shadow">
            {formatCount(currentComments)}
          </span>
        </button>

        <DropdownMenu open={shareMenuOpen} onOpenChange={setShareMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t("reels.share", "Compartir")}
              className="flex flex-col items-center gap-0.5"
              onClick={async (e) => {
                // Prefer native OS share sheet (Instagram, TikTok, WhatsApp, etc.)
                if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
                  e.preventDefault();
                  try {
                    await navigator.share({ title: shareTitle(), url: shareUrl() });
                  } catch (err) {
                    // User cancelled — do nothing. Other errors → fall back to menu.
                    if ((err as { name?: string })?.name !== "AbortError") {
                      setShareMenuOpen(true);
                    }
                  }
                }
                // No native share → let the dropdown open normally.
              }}
            >
              <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500/80 backdrop-blur transition hover:bg-emerald-500">
                <Share2 className="h-5 w-5 text-white" />
              </span>
              <span className="text-[11px] font-bold text-white drop-shadow">{t("reels.share", "Compartir")}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[110] w-52">
            <DropdownMenuLabel>{t("reels.shareOn", "Compartir en")}</DropdownMenuLabel>
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
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={t("reels.thanksAria", "Dar las gracias")} className="flex flex-col items-center gap-0.5">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-[0_4px_14px_-2px_rgba(245,158,11,0.6)] ring-1 ring-amber-300/60 transition hover:from-amber-200 hover:to-amber-400">
                <HandHeart className="h-5 w-5 text-amber-950" strokeWidth={2.4} />
              </span>
              <span className="text-[11px] font-semibold text-white drop-shadow">{t("reels.thanks", "Gracias")}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[110] w-56">
            <DropdownMenuLabel className="flex items-center gap-2">
              <HandHeart className="h-4 w-4 text-amber-500" /> {t("reels.sendThanks", "Enviar Gracias")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {[1, 3, 5, 10].map((amount) => (
              <DropdownMenuItem
                key={amount}
                onClick={() =>
                  toast.success(t("reels.thanksSentTitle", "¡Gracias enviado! 🧡"), {
                    description: t("reels.thanksSentDesc", { amount, defaultValue: "Has apoyado este reel con {{amount}} €." }),
                  })
                }
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-700">€</span>
                {amount} €
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                toast.success(t("reels.otherAmountSoonTitle", "Pronto podrás elegir otro monto"), {
                  description: t("reels.otherAmountSoonDesc", "Estamos preparando los pagos. ¡Gracias por tu apoyo!"),
                })
              }
            >
              <Plus /> {t("reels.otherAmount", "Otro monto…")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
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
        const { data: profs } = await supabase.rpc("get_public_profiles", { ids });
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
          const { data } = await supabase.rpc("get_public_profiles", { ids: [row.user_id] });
          const first = (data ?? [])[0] as { display_name: string | null } | undefined;
          if (first?.display_name) name = first.display_name;
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
  editing,
}: {
  onClose: () => void;
  onPublish: (r: DbReel) => void;
  editing?: DbReel | null;
}) {
  const { user } = useAuth();
  const isEdit = Boolean(editing);
  const initialMode: "file" | "embed" = editing?.video_url && /^https?:\/\//i.test(editing.video_url) && !editing.video_url.includes("blob:") ? "embed" : "file";
  const [mode, setMode] = useState<"file" | "embed">(initialMode);
  const [title, setTitle] = useState(editing?.title ?? "");
  const [productSlug, setProductSlug] = useState(editing?.product_slug ?? PRODUCT_OPTIONS[0].slug);
  const [link, setLink] = useState(editing && initialMode === "embed" ? (editing.video_url ?? "") : "");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [isAd, setIsAd] = useState<boolean>(Boolean(editing?.is_ad));
  const [sponsorName, setSponsorName] = useState(editing?.sponsor_name ?? "");
  const [ctaLabel, setCtaLabel] = useState(editing?.cta_label ?? "");
  const [ctaUrl, setCtaUrl] = useState(editing?.cta_url ?? "");

  const preview = useMemo(() => parseEmbed(link), [link]);
  const directVideo = useMemo(() => isDirectVideoUrl(link), [link]);
  const linkIsValid = Boolean(preview) || directVideo;
  const fileUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => () => { if (fileUrl) URL.revokeObjectURL(fileUrl); }, [fileUrl]);


  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Añade un título"); return; }

    setSubmitting(true);
    let videoUrl = "";
    let thumbUrl = editing?.thumb_url ?? null;

    if (mode === "embed") {
      const trimmed = link.trim();
      if (!trimmed && isEdit) {
        // En modo edición: mantener el video actual si no se cambió
        videoUrl = editing?.video_url ?? "";
      } else if (!trimmed || !linkIsValid) {
        toast.error("Pega un enlace válido (Instagram, TikTok, Facebook, YouTube o un .mp4)");
        setSubmitting(false);
        return;
      } else {
        videoUrl = normalizePotentialVideoUrl(trimmed) ?? trimmed;
        thumbUrl = (await resolveEmbedThumbnail(parseEmbed(videoUrl))) ?? thumbUrl;
      }
    } else {
      if (!file) {
        if (isEdit) {
          // En modo edición: conservar el video actual si no se sube uno nuevo
          videoUrl = editing?.video_url ?? "";
        } else {
          toast.error("Selecciona un archivo de video");
          setSubmitting(false);
          return;
        }
      } else {
      if (file.size > 100 * 1024 * 1024) {
        toast.error("El archivo supera los 100 MB");
        setSubmitting(false);
        return;
      }
      const ALLOWED_MIME = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"];
      const ALLOWED_EXT = ["mp4", "webm", "mov", "m4v"];
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      if (!ALLOWED_MIME.includes(file.type) || !ALLOWED_EXT.includes(ext)) {
        toast.error("Formato no soportado. Usa MP4, WebM, MOV o M4V.");
        setSubmitting(false);
        return;
      }
      // Object URL = instantánea, se muestra en el feed inmediatamente
      videoUrl = URL.createObjectURL(file);

      // Subida a Storage — ESPERAMOS a que termine para que la BD guarde
      // la URL pública real (no el blob local que solo existe en este navegador).
      if (user) {
        const uploadId = Date.now();
        const path = `${user.id}/${uploadId}.${ext}`;
        setUploadPct(20);
        const safeContentType = ALLOWED_MIME.includes(file.type) ? file.type : "video/mp4";
        const { error: upErr } = await supabase.storage
          .from("reels")
          .upload(path, file, { contentType: safeContentType, upsert: false });
        setUploadPct(100);
        if (upErr) {
          toast.error("No se pudo subir el video. Intenta de nuevo.");
          setSubmitting(false);
          return;
        }
        const { data: pub } = supabase.storage.from("reels").getPublicUrl(path);
        if (pub?.publicUrl) videoUrl = pub.publicUrl;
        const thumbBlob = await createVideoThumbnailBlob(file);
        if (thumbBlob) {
          const thumbPath = `${user.id}/${uploadId}.jpg`;
          const { error: thumbErr } = await supabase.storage
            .from("reels")
            .upload(thumbPath, thumbBlob, { contentType: "image/jpeg", upsert: false });
          if (!thumbErr) {
            const { data: thumbPub } = supabase.storage.from("reels").getPublicUrl(thumbPath);
            thumbUrl = thumbPub?.publicUrl ?? null;
          }
        }
      }
      }
    }


    const product = PRODUCT_OPTIONS.find((p) => p.slug === productSlug) ?? PRODUCT_OPTIONS[0];

    const adFields = {
      is_ad: isAd,
      sponsor_name: isAd ? (sponsorName.trim() || null) : null,
      cta_label: isAd ? (ctaLabel.trim() || null) : null,
      cta_url: isAd ? (ctaUrl.trim() || null) : null,
    };

    if (!user) {
      toast.error("Debes iniciar sesión para publicar un reel.");
      setSubmitting(false);
      return;
    }

    if (isEdit && editing) {
      // EDITAR: reemplazar reel existente sin poner tiempo de expiración
      // Si no se cambió el video, conservar el actual
      const finalVideoUrl = mode === "embed"
        ? videoUrl
        : (file ? videoUrl : (editing.video_url ?? ""));

      const updatedReel: DbReel = {
        ...editing,
        title: title.trim(),
        video_url: finalVideoUrl,
        thumb_url: thumbUrl,
        product_name: product.nameKey,
        product_price: product.price,
        product_image: product.image,
        product_slug: product.slug,
        expires_at: null,
        ...adFields,
      };
      if (!editing.id.startsWith("local-")) {
        const { error } = await supabase
          .from("reels")
          .update({
            title: updatedReel.title,
            video_url: finalVideoUrl,
            thumb_url: thumbUrl,
            product_name: product.nameKey,
            product_price: product.price,
            product_image: product.image,
            product_slug: product.slug,
            expires_at: null,
            ...adFields,
          })
          .eq("id", editing.id);
        if (error) {
          console.error("reel-update error", error);
          toast.error("No se pudo guardar el reel para todos. Intenta de nuevo.");
          setSubmitting(false);
          return;
        }
      }

      onPublish(updatedReel);
      setSubmitting(false);
      return;
    }

    const slug = `r-${Date.now()}`;
    const { data: savedReel, error } = await supabase
      .from("reels")
      .insert({
        slug,
        title: title.trim(),
        video_url: videoUrl,
        thumb_url: thumbUrl,
        product_name: product.nameKey,
        product_price: product.price,
        product_image: product.image,
        product_slug: product.slug,
        author_id: user.id,
        expires_at: null,
        ...adFields,
      })
      .select("*")
      .single();

    if (error || !savedReel) {
      console.error("reel-insert error", error);
      toast.error("No se pudo guardar el reel para todos. Intenta de nuevo.");
      setSubmitting(false);
      return;
    }

    onPublish(savedReel as DbReel);
    setSubmitting(false);
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
          <h3 className="text-lg font-extrabold text-[#1a0f0a]">{isEdit ? "✏️ Editar Reel" : "🎬 Nuevo Reel"}</h3>
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
                  type="text"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="Pega aquí el enlace (Link) de tu Reel de Instagram, TikTok o Facebook"
                  className="w-full rounded-md border border-[#ddd] pl-9 pr-3 py-2 text-sm focus:border-[#c8956d] focus:outline-none focus:ring-1 focus:ring-[#c8956d]"
                  maxLength={500}
                />
              </div>
              <p className="mt-1 text-[10px] text-[#666]">
                Instagram (/reel/, /reels/, /p/, /tv/, /share/), TikTok (vm.tiktok, /t/, /@user/video/),
                Facebook (/reel/, /watch, /share/v/, fb.watch), YouTube (Shorts, watch, youtu.be) o un enlace directo .mp4 / .webm / .mov.
              </p>
              {link && !linkIsValid && (
                <p className="mt-1 text-[10px] font-semibold text-rose-600">
                  ⚠️ No reconocemos este enlace. Asegúrate de copiarlo desde "Compartir → Copiar enlace" y que sea público.
                </p>
              )}
              {preview && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                  ✓ {preview.label} detectado
                </div>
              )}
              {!preview && directVideo && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                  ✓ Video directo detectado
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

          {/* Anuncio nativo (opcional) */}
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isAd}
                onChange={(e) => setIsAd(e.target.checked)}
                className="h-4 w-4 accent-amber-500"
              />
              <span className="text-xs font-bold text-[#1a0f0a]">
                📣 Marcar como anuncio (mostrará el badge "Ad")
              </span>
            </label>

            {isAd && (
              <div className="mt-3 space-y-2">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-semibold text-[#1a0f0a]">
                    Patrocinador (opcional)
                  </span>
                  <input
                    type="text"
                    value={sponsorName}
                    onChange={(e) => setSponsorName(e.target.value)}
                    placeholder="Ej. Marca Acme"
                    maxLength={60}
                    className="w-full rounded-md border border-[#ddd] px-3 py-2 text-sm focus:border-[#c8956d] focus:outline-none focus:ring-1 focus:ring-[#c8956d]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-semibold text-[#1a0f0a]">
                    Texto del botón (CTA)
                  </span>
                  <input
                    type="text"
                    value={ctaLabel}
                    onChange={(e) => setCtaLabel(e.target.value)}
                    placeholder="Más información"
                    maxLength={40}
                    className="w-full rounded-md border border-[#ddd] px-3 py-2 text-sm focus:border-[#c8956d] focus:outline-none focus:ring-1 focus:ring-[#c8956d]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-semibold text-[#1a0f0a]">
                    Enlace del botón (URL)
                  </span>
                  <input
                    type="url"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    placeholder="https://..."
                    maxLength={500}
                    className="w-full rounded-md border border-[#ddd] px-3 py-2 text-sm focus:border-[#c8956d] focus:outline-none focus:ring-1 focus:ring-[#c8956d]"
                  />
                </label>
                <p className="text-[10px] text-[#666]">
                  Cuando el reel es un anuncio, el botón "Comprar" se reemplaza por tu CTA con enlace externo.
                </p>
              </div>
            )}
          </div>


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
              {isEdit ? "Guardar cambios" : "Publicar"}
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
