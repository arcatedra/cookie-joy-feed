import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Check, ExternalLink, Loader2, Search, X } from "lucide-react";
import {
  normalizeBaseName,
  primaryCandidates,
  similarCandidates,
} from "@/lib/domain-suggestions";
import { buyUrlFor, pricingFor } from "@/lib/domain-pricing";

type CheckResult = {
  domain: string;
  status: "available" | "taken" | "unknown";
  registrar?: string;
  registeredOn?: string;
};

async function fetchDomain(domain: string): Promise<CheckResult> {
  const res = await fetch(`/api/public/domain-check?domain=${encodeURIComponent(domain)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as CheckResult;
}

export const Route = createFileRoute("/domains")({
  head: () => ({
    meta: [
      { title: "Domain Search — Check availability & alternatives" },
      {
        name: "description",
        content:
          "Search domain availability across .com, .net, .io, .co and more. See estimated prices and similar name alternatives.",
      },
      { property: "og:title", content: "Domain Search — Check availability & alternatives" },
      {
        property: "og:description",
        content:
          "Search domain availability across .com, .net, .io, .co and more. See estimated prices and similar name alternatives.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: DomainsPage,
});

function DomainsPage() {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");

  const base = useMemo(() => normalizeBaseName(query), [query]);
  const primary = useMemo(() => (base ? primaryCandidates(base) : []), [base]);
  const similar = useMemo(() => (base ? similarCandidates(base) : []), [base]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold text-foreground">{t("domains.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("domains.subtitle")}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(input);
        }}
        className="mt-6 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("domains.placeholder")}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label={t("domains.placeholder")}
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Search className="h-4 w-4" />
          {t("domains.search")}
        </button>
      </form>

      {base && (
        <>
          <Section title={t("domains.mainResults", { base })} domains={primary} />
          <Section title={t("domains.similarAlternatives")} domains={similar} />
          <p className="mt-6 text-xs text-muted-foreground">{t("domains.priceDisclaimer")}</p>
        </>
      )}
    </main>
  );
}

function Section({ title, domains }: { title: string; domains: string[] }) {
  const { t } = useTranslation();
  const results = useQueries({
    queries: domains.map((d) => ({
      queryKey: ["domain-check", d],
      queryFn: () => fetchDomain(d),
      staleTime: 10 * 60 * 1000,
    })),
  });

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <ul className="overflow-hidden rounded-md border border-border bg-card">
        {domains.map((domain, i) => {
          const q = results[i];
          const data = q.data;
          const price = pricingFor(domain);
          return (
            <li
              key={domain}
              className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                {q.isLoading ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                ) : data?.status === "available" ? (
                  <Check className="h-4 w-4 shrink-0 text-green-600" />
                ) : data?.status === "taken" ? (
                  <X className="h-4 w-4 shrink-0 text-red-500" />
                ) : (
                  <span className="h-4 w-4 shrink-0 rounded-full bg-muted" />
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{domain}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {q.isLoading
                      ? t("domains.checking")
                      : data?.status === "available"
                        ? t("domains.available")
                        : data?.status === "taken"
                          ? data.registrar
                            ? t("domains.takenBy", { registrar: data.registrar })
                            : t("domains.taken")
                          : t("domains.unknown")}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {price && (
                  <span className="text-xs text-muted-foreground">
                    ~${price.priceUsd}
                    {price.note === "promo" ? "*" : ""}
                  </span>
                )}
                {data?.status === "available" && (
                  <a
                    href={buyUrlFor(domain)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    {t("domains.buy")}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
