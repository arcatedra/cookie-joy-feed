#!/usr/bin/env bun
// Fill in ALL missing translation keys per language using es as the reference.
import fs from "node:fs";

const LANGS = ["en", "pt", "fr", "de", "it", "zh", "ja", "fil"] as const;
const LANG_NAMES: Record<string, string> = {
  en: "English",
  pt: "Portuguese (Brazil)",
  fr: "French",
  de: "German",
  it: "Italian",
  zh: "Simplified Chinese (Mandarin)",
  ja: "Japanese",
  fil: "Filipino (Tagalog)",
};

const apiKey = process.env.LOVABLE_API_KEY!;
if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

type J = any;
const readJson = (p: string): J => JSON.parse(fs.readFileSync(p, "utf-8"));

const es = readJson("src/locales/es/translation.json");

// Build "missing subtree": walk es; if a leaf key path is missing/empty in target, include it.
function buildMissing(ref: J, tgt: J): J | undefined {
  if (typeof ref !== "object" || ref === null || Array.isArray(ref)) {
    // leaf
    if (tgt === undefined || tgt === null || tgt === "") return ref;
    return undefined;
  }
  const out: J = {};
  for (const k of Object.keys(ref)) {
    const sub = buildMissing(ref[k], tgt && typeof tgt === "object" ? tgt[k] : undefined);
    if (sub !== undefined) out[k] = sub;
  }
  return Object.keys(out).length ? out : undefined;
}

function deepMerge(a: J, b: J): J {
  if (typeof a !== "object" || a === null || Array.isArray(a)) return b;
  if (typeof b !== "object" || b === null || Array.isArray(b)) return b;
  const out: J = { ...a };
  for (const k of Object.keys(b)) {
    out[k] = k in a ? deepMerge(a[k], b[k]) : b[k];
  }
  return out;
}

// Chunk missing subtree into ≤ N top-level slices to keep prompts small.
function chunk(obj: J, maxTopKeys = 6): J[] {
  const keys = Object.keys(obj);
  const chunks: J[] = [];
  for (let i = 0; i < keys.length; i += maxTopKeys) {
    const slice: J = {};
    for (const k of keys.slice(i, i + maxTopKeys)) slice[k] = obj[k];
    chunks.push(slice);
  }
  return chunks;
}

async function translate(lang: string, source: J): Promise<J> {
  const prompt = `Translate the VALUES of this JSON from Spanish (es) into ${LANG_NAMES[lang]}.

STRICT RULES:
- Preserve every key exactly. Do NOT rename, add, or remove keys.
- Preserve JSON structure and nesting.
- Preserve placeholders like {{name}}, {{count}}, {{amount}}, {{date}} exactly.
- Preserve HTML/JSX tags, emojis, line breaks, currency symbols, and numbers.
- Do NOT translate brand names: HAZOREX, ORIGEN, PayPal, Zelle, Stripe, Shopify, Google, Apple Pay, Lovable Cloud, IRS, W-9, 1099-MISC, AMOE, KYC, SHA-256, UUID, Porsenge.
- Keep email addresses and URLs untouched.
- Return ONLY valid JSON — no markdown, no commentary, no code fences.

Input JSON:
${JSON.stringify(source, null, 2)}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: "You are a precise translator that outputs only valid JSON." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${lang} ${res.status}: ${text.slice(0, 400)}`);
  }
  const j = await res.json();
  return JSON.parse(j.choices[0].message.content);
}

for (const lang of LANGS) {
  const path = `src/locales/${lang}/translation.json`;
  const cur = readJson(path);
  const missing = buildMissing(es, cur);
  if (!missing) {
    console.log(`[${lang}] complete, skipping`);
    continue;
  }
  const topKeys = Object.keys(missing);
  console.log(`[${lang}] missing top-level sections: ${topKeys.length} (${topKeys.join(", ")})`);
  const parts = chunk(missing, 6);
  let merged = cur;
  for (let i = 0; i < parts.length; i++) {
    console.log(`[${lang}]  chunk ${i + 1}/${parts.length} keys=${Object.keys(parts[i]).join(",")}`);
    const t = await translate(lang, parts[i]);
    merged = deepMerge(merged, t);
  }
  fs.writeFileSync(path, JSON.stringify(merged, null, 2) + "\n");
  console.log(`[${lang}] ✓ wrote`);
}
console.log("Done.");
