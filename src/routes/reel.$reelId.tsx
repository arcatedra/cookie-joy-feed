import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import i18n from "@/i18n";

interface ReelMeta {
  id: string;
  slug: string;
  title: string | null;
  video_url: string | null;
  thumb_url: string | null;
  product_name: string | null;
  product_image: string | null;
}

const REELS_STORAGE_MARKER = "/storage/v1/object/public/reels/";

type EmbedPlatform = "instagram" | "tiktok" | "facebook" | "youtube";
interface EmbedInfo {
  platform: EmbedPlatform;
  embedUrl: string;
  originalUrl: string;
  label: string;
}

function normalizePotentialVideoUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let text = raw.trim();
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
  const tiktok = text.match(/(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([\w.-]+)\/(video|photo)\/(\d+)/i);
  if (tiktok) return `https://www.tiktok.com/@${tiktok[1]}/${tiktok[2].toLowerCase()}/${tiktok[3]}`;
  const tiktokShort = text.match(/(?:https?:\/\/)?((?:vm|vt)\.tiktok\.com\/[A-Za-z0-9_-]+\/?)/i);
  if (tiktokShort) return `https://${tiktokShort[1]}`;
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

function parseEmbed(raw: string | null | undefined): EmbedInfo | null {
  const url = normalizePotentialVideoUrl(raw);
  if (!url) return null;
  const normalized = url
    .replace(/^https?:\/\/m\.facebook\.com/i, "https://www.facebook.com")
    .replace(/^https?:\/\/m\.youtube\.com/i, "https://www.youtube.com")
    .replace(/^https?:\/\/m\.tiktok\.com/i, "https://www.tiktok.com");

  const ig = normalized.match(/instagram\.com\/(?:[\w.-]+\/)?(reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i);
  if (ig) {
    const kind = ig[1].toLowerCase() === "reels" ? "reel" : ig[1].toLowerCase();
    return { platform: "instagram", embedUrl: `https://www.instagram.com/${kind}/${ig[2]}/embed/captioned/`, originalUrl: url, label: "Instagram" };
  }
  const tt = normalized.match(/tiktok\.com\/(?:@[\w.-]+\/(?:video|photo)\/|v\/|embed\/v2\/)(\d+)/i);
  if (tt) return { platform: "tiktok", embedUrl: `https://www.tiktok.com/embed/v2/${tt[1]}`, originalUrl: url, label: "TikTok" };
  if (/(?:vm|vt)\.tiktok\.com\//i.test(url)) {
    return { platform: "tiktok", embedUrl: `https://www.tiktok.com/embed?lang=en&url=${encodeURIComponent(url)}`, originalUrl: url, label: "TikTok" };
  }
  if (/facebook\.com\/(?:reel|watch|share\/(?:v|r|video)|[\w.-]+\/videos|video\.php)/i.test(normalized) || /fb\.watch\//i.test(url)) {
    return { platform: "facebook", embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=560&t=0`, originalUrl: url, label: "Facebook" };
  }
  const yt =
    normalized.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]+)/i) ||
    normalized.match(/youtube\.com\/(?:watch\?(?:.*&)?v=|live\/|embed\/)([A-Za-z0-9_-]+)/i) ||
    url.match(/youtu\.be\/([A-Za-z0-9_-]+)/i);
  if (yt) return { platform: "youtube", embedUrl: `https://www.youtube.com/embed/${yt[1]}?rel=0&playsinline=1`, originalUrl: url, label: "YouTube" };
  return null;
}

function getYouTubeId(url: string): string | null {
  const m =
    url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]+)/i) ||
    url.match(/youtube\.com\/(?:watch\?(?:.*&)?v=|live\/|embed\/)([A-Za-z0-9_-]+)/i) ||
    url.match(/youtu\.be\/([A-Za-z0-9_-]+)/i);
  return m?.[1] ?? null;
}

function getPreviewImage(reel: ReelMeta): string | undefined {
  const embed = parseEmbed(reel.video_url);
  const youtubeId = embed?.platform === "youtube" ? getYouTubeId(embed.originalUrl) : null;
  const image = reel.thumb_url || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null) || reel.product_image;
  return image && /^https:\/\//i.test(image) ? image : undefined;
}

function getReelStoragePath(videoUrl: string | null | undefined) {
  if (!videoUrl) return null;
  const i = videoUrl.indexOf(REELS_STORAGE_MARKER);
  if (i === -1) return null;
  const encoded = videoUrl.slice(i + REELS_STORAGE_MARKER.length).split("?")[0];
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

async function signIfNeeded(videoUrl: string | null) {
  const path = getReelStoragePath(videoUrl);
  if (!path) return videoUrl;
  const { data } = await supabase.storage.from("reels").createSignedUrl(path, 60 * 60 * 24);
  return data?.signedUrl ?? videoUrl;
}

async function fetchReel(reelId: string): Promise<ReelMeta | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reelId);
  const q = supabase
    .from("reels")
    .select("id, slug, title, video_url, thumb_url, product_name, product_image")
    .limit(1);
  const { data } = isUuid
    ? await q.eq("id", reelId).maybeSingle()
    : await q.eq("slug", reelId).maybeSingle();
  if (!data) return null;
  const reel = data as ReelMeta;
  reel.video_url = await signIfNeeded(reel.video_url);
  return reel;
}

export const Route = createFileRoute("/reel/$reelId")({
  loader: async ({ params }) => {
    const reel = await fetchReel(params.reelId);
    if (!reel) throw notFound();
    return { reel };
  },
  head: ({ loaderData }) => {
    const reel = loaderData?.reel;
    if (!reel) return { meta: [{ title: i18n.t("reel.metaTitleFallback") }] };
    const title = reel.title || reel.product_name || i18n.t("reel.defaultTitle");
    const fullTitle = `${title} ${i18n.t("reel.metaTitleSuffix")}`;
    const description = reel.product_name
      ? i18n.t("reel.metaDescWithProduct", { product: reel.product_name })
      : i18n.t("reel.metaDescDefault");
    const image = getPreviewImage(reel);
    const meta: Array<Record<string, string>> = [
      { title: fullTitle },
      { name: "description", content: description },
      { property: "og:title", content: fullTitle },
      { property: "og:description", content: description },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
      { name: "twitter:title", content: fullTitle },
      { name: "twitter:description", content: description },
    ];
    if (image) {
      meta.push({ property: "og:image", content: image });
      meta.push({ name: "twitter:image", content: image });
    }
    if (reel.video_url) {
      meta.push({ property: "og:video", content: reel.video_url });
      meta.push({ property: "og:video:secure_url", content: reel.video_url });
      meta.push({ property: "og:video:type", content: "video/mp4" });
    }
    return { meta };
  },
  notFoundComponent: () => <ReelNotFound />,
  component: ReelPage,
});

function ReelNotFound() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 text-center">
      <div>
        <h1 className="text-2xl font-semibold">{t("reel.notFoundTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("reel.notFoundDesc")}</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {t("reel.backHome")}
        </Link>
      </div>
    </div>
  );
}

function ReelPage() {
  const { t } = useTranslation();
  const { reel } = Route.useLoaderData();
  const title = reel.title || reel.product_name || t("reel.fallbackTitle");
  const embed = parseEmbed(reel.video_url);
  const poster = reel.thumb_url || reel.product_image || undefined;
  const videoUrl = normalizePotentialVideoUrl(reel.video_url) || reel.video_url;

  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-4 py-6">
      <h1 className="mb-4 w-full text-center text-xl font-semibold text-foreground">{title}</h1>
      <div className="relative aspect-[9/16] w-full max-w-sm overflow-hidden rounded-2xl bg-black shadow-xl ring-1 ring-black/10">
        {embed ? (
          <iframe
            src={embed.embedUrl}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; clipboard-write; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : videoUrl ? (
          <video
            src={videoUrl}
            poster={poster}
            controls
            autoPlay
            playsInline
            loop
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : poster ? (
          <img src={poster} alt={title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-white/60">
            {t("reel.noVideo")}
          </div>
        )}
      </div>
      {reel.product_name && (
        <p className="mt-4 text-sm text-muted-foreground">
          {t("reel.productLabel")}
          <span className="font-medium text-foreground">{reel.product_name}</span>
        </p>
      )}
      <Link
        to="/"
        className="mt-6 inline-flex w-full max-w-sm items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        {t("reel.moreReels")}
      </Link>
    </main>
  );
}
