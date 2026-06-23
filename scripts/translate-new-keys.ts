#!/usr/bin/env bun
// Translate new EN keys into es, pt, fr, it, zh, fil — preserving existing translations.
import fs from "node:fs";
import path from "node:path";

const LOCALES = ["es", "pt", "fr", "it", "zh", "fil"] as const;
const LANG_NAMES: Record<string, string> = {
  es: "Spanish",
  pt: "Portuguese",
  fr: "French",
  it: "Italian",
  zh: "Simplified Chinese (Mandarin)",
  fil: "Filipino (Tagalog)",
};

const NEW_TOP_KEYS = [
  "donate", "shop", "product", "reel", "searchPage", "historial",
  "trust", "terms", "sweepstakesRules", "unsubscribe", "claim",
];

const enPath = path.join("src/locales/en/translation.json");
const en = JSON.parse(fs.readFileSync(enPath, "utf-8"));

const apiKey = process.env.LOVABLE_API_KEY!;
if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

function pick(obj: any, keys: string[]) {
  const out: any = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out;
}

const sourceSubset = pick(en, NEW_TOP_KEYS);

async function translateTo(lang: string, source: any): Promise<any> {
  const langName = LANG_NAMES[lang];
  const prompt = `Translate the VALUES of this JSON object from English to ${langName}.

STRICT RULES:
- Preserve every key exactly. Do NOT rename, add, or remove keys.
- Preserve the JSON structure and nesting exactly.
- Preserve placeholders like {{name}}, {{count}}, {{amount}}, {{date}}, etc. exactly.
- Preserve HTML-like tags and entities, emojis, line breaks, currency symbols ($), and numbers as-is.
- Do NOT translate brand names: AMYRAX, ORIGEN, HAZOREX, HAZOREX ORIGEN, PayPal, Zelle, Stripe, Shopify, Google, Lovable Cloud, IRS, W-9, 1099-MISC, AMOE, KYC, SHA-256, UUID, Apple Pay.
- Keep email addresses and URLs untouched.
- Return ONLY valid JSON — no markdown, no commentary, no code fences.

Input JSON:
${JSON.stringify(source, null, 2)}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
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
    throw new Error(`AI ${lang} ${res.status}: ${text.slice(0, 500)}`);
  }
  const j = await res.json();
  const content = j.choices[0].message.content;
  return JSON.parse(content);
}

await Promise.all(
  LOCALES.map(async (lang) => {
    const filePath = `src/locales/${lang}/translation.json`;
    const existing = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    console.log(`[${lang}] translating ${NEW_TOP_KEYS.length} sections…`);
    const translated = await translateTo(lang, sourceSubset);
    const merged = { ...existing, ...translated };
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2) + "\n");
    console.log(`[${lang}] ✓ wrote ${filePath}`);
  }),
);
console.log("Done.");
