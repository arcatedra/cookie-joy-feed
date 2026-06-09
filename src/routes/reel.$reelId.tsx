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

async function fetchReel(reelId: string): Promise<ReelMeta | null> {
  // Try by id first, then by slug (since shareUrl uses reel.id which is a uuid)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reelId);
  const query = supabase
    .from("reels")
    .select("id, slug, title, video_url, thumb_url, product_name, product_image")
    .limit(1);
  const { data } = isUuid
    ? await query.eq("id", reelId).maybeSingle()
    : await query.eq("slug", reelId).maybeSingle();
  return (data as ReelMeta | null) ?? null;
}

export const Route = createFileRoute("/reel/$reelId")({
  loader: async ({ params }) => {
    const reel = await fetchReel(params.reelId);
    if (!reel) throw notFound();
    return { reel };
  },
  head: ({ loaderData }) => {
    const reel = loaderData?.reel;
    if (!reel) {
      return { meta: [{ title: "Reel · OyS Cookies" }] };
    }
    const title = reel.title || reel.product_name || "Mira este reel";
    const fullTitle = `${title} · OyS Cookies`;
    const description = reel.product_name
      ? `${reel.product_name} en OyS Cookies. Mira el reel y descubre nuestras galletas artesanales.`
      : "Mira este reel de OyS Cookies — galletas artesanales premium.";
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
      meta.push({ property: "og:video:url", content: reel.video_url });
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

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold text-foreground">{title}</h1>
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl bg-black shadow-lg">
        {reel.video_url ? (
          <video
            src={reel.video_url}
            poster={reel.thumb_url || reel.product_image || undefined}
            controls
            autoPlay
            playsInline
            loop
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-white/60">Sin video</div>
        )}
      </div>
      {reel.product_name && (
        <p className="mt-4 text-sm text-muted-foreground">
          Producto: <span className="font-medium text-foreground">{reel.product_name}</span>
        </p>
      )}
      <div className="mt-6 flex gap-2">
        <Link
          to="/"
          search={{ reel: reel.id } as never}
          className="inline-flex flex-1 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Ver más reels
        </Link>
      </div>
    </main>
  );
}
