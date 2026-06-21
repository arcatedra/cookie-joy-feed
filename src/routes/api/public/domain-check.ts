import { createFileRoute } from "@tanstack/react-router";

type CheckResult = {
  domain: string;
  status: "available" | "taken" | "unknown";
  registrar?: string;
  registeredOn?: string;
  error?: string;
};

// Simple in-memory cache (per worker instance) to avoid hammering RDAP.
const cache = new Map<string, { at: number; result: CheckResult }>();
const TTL_MS = 10 * 60 * 1000;

const DOMAIN_RE = /^(?=.{1,253}$)[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

async function checkDomain(domain: string): Promise<CheckResult> {
  const key = domain.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.result;

  let result: CheckResult;
  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(key)}`, {
      headers: { Accept: "application/rdap+json" },
    });
    if (res.status === 404) {
      result = { domain: key, status: "available" };
    } else if (res.ok) {
      const data = (await res.json()) as {
        entities?: Array<{ roles?: string[]; vcardArray?: unknown[] }>;
        events?: Array<{ eventAction?: string; eventDate?: string }>;
      };
      let registrar: string | undefined;
      const registrarEntity = data.entities?.find((e) => e.roles?.includes("registrar"));
      if (registrarEntity && Array.isArray(registrarEntity.vcardArray)) {
        const vcard = registrarEntity.vcardArray[1] as Array<unknown> | undefined;
        if (Array.isArray(vcard)) {
          const fn = vcard.find(
            (item): item is [string, object, string, string] =>
              Array.isArray(item) && item[0] === "fn",
          );
          if (fn) registrar = String(fn[3]);
        }
      }
      const reg = data.events?.find((e) => e.eventAction === "registration");
      result = {
        domain: key,
        status: "taken",
        registrar,
        registeredOn: reg?.eventDate,
      };
    } else {
      result = { domain: key, status: "unknown", error: `HTTP ${res.status}` };
    }
  } catch (err) {
    result = { domain: key, status: "unknown", error: (err as Error).message };
  }

  cache.set(key, { at: Date.now(), result });
  return result;
}

export const Route = createFileRoute("/api/public/domain-check")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const domain = (url.searchParams.get("domain") ?? "").trim().toLowerCase();
        if (!domain || !DOMAIN_RE.test(domain)) {
          return Response.json(
            { error: "Invalid domain" } satisfies { error: string },
            { status: 400 },
          );
        }
        const result = await checkDomain(domain);
        return Response.json(result, {
          headers: { "Cache-Control": "public, max-age=600" },
        });
      },
    },
  },
});
