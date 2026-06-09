import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

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
  const { data } = await supabase.storage.from("reels").createSignedUrl(path, 60 * 60);
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
    if (!reel) return { meta: [{ title: "Reel · ZENDA Cookies" }] };
    const title = reel.title || reel.product_name || "Mira este reel";
    const fullTitle = `${title} · ZENDA Cookies`;
    const description = reel.product_name
      ? `${reel.product_name} en ZENDA Cookies. Mira el reel y descubre nuestras galletas artesanales.`
      : "Mira este reel de ZENDA Cookies — galletas artesanales premium.";
    const image = reel.thumb_url || reel.product_image || undefined;
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
  notFoundComponent: () => (
    <div className="flex min-h-[60vh] items-center justify-center px-4 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Reel no encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Es posible que este reel haya sido eliminado.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  ),
  component: ReelPage,
});

function ReelPage() {
  const { reel } = Route.useLoaderData();
  const title = reel.title || reel.product_name || "Reel";
  const poster = reel.thumb_url || reel.product_image || undefined;

  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-4 py-6">
      <h1 className="mb-4 w-full text-center text-xl font-semibold text-foreground">{title}</h1>
      <div className="relative aspect-[9/16] w-full max-w-sm overflow-hidden rounded-2xl bg-black shadow-xl ring-1 ring-black/10">
        {reel.video_url ? (
          <video
            src={reel.video_url}
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
          <div className="grid h-full w-full place-items-center text-white/60">Sin video</div>
        )}
      </div>
      {reel.product_name && (
        <p className="mt-4 text-sm text-muted-foreground">
          Producto: <span className="font-medium text-foreground">{reel.product_name}</span>
        </p>
      )}
      <Link
        to="/"
        className="mt-6 inline-flex w-full max-w-sm items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Ver más reels
      </Link>
    </main>
  );
}
