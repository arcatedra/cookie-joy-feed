import { DEFAULT_TLDS } from "./domain-pricing";

// Strip a TLD if user typed one (e.g. "mahanaix.com" -> "mahanaix").
export function normalizeBaseName(input: string): string {
  const cleaned = input.trim().toLowerCase().replace(/[^a-z0-9-.]/g, "");
  const firstDot = cleaned.indexOf(".");
  const base = firstDot >= 0 ? cleaned.slice(0, firstDot) : cleaned;
  return base.replace(/^-+|-+$/g, "");
}

export function primaryCandidates(base: string, tlds: string[] = DEFAULT_TLDS): string[] {
  return tlds.map((tld) => `${base}.${tld}`);
}

const PREFIXES = ["get", "try", "my", "the", "go"];
const SUFFIXES = ["hq", "app", "io", "hub", "co", "labs"];

export function similarCandidates(base: string): string[] {
  const set = new Set<string>();
  for (const p of PREFIXES) set.add(`${p}${base}.com`);
  for (const s of SUFFIXES) set.add(`${base}${s}.com`);
  // A few alternate TLDs of the bare name too
  set.add(`${base}.xyz`);
  set.add(`${base}.online`);
  set.add(`${base}.dev`);
  return Array.from(set).slice(0, 10);
}
