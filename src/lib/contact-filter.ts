/**
 * Filtro para impedir que se compartan números de teléfono, correos
 * o apps de contacto/pago a través del chat de pedidos.
 * Se usa en el servidor (fuente de verdad) y también en el navegador.
 */

export const CONTACT_BLOCK_MESSAGE =
  "Por seguridad, no se pueden compartir números ni contactos.";

/** Palabras prohibidas (se detectan aunque las separen espacios o símbolos). */
const BANNED_WORDS = ["whatsapp", "wasap", "telegram", "cashapp", "zelle", "venmo"];

/** Números escritos en palabras (es / en). */
const NUMBER_WORDS = [
  // español
  "cero", "uno", "una", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez",
  "once", "doce", "trece", "catorce", "quince", "dieciseis", "dieciséis", "diecisiete", "dieciocho",
  "diecinueve", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa", "cien",
  // inglés
  "zero", "oh", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen",
  "nineteen", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety", "hundred",
];

const EMAIL_RE = /[A-Z0-9._%+-]+\s*(?:@|\(at\)|\[at\]|\sat\s)\s*[A-Z0-9.-]+\s*(?:\.|\(dot\)|\sdot\s)\s*[A-Z]{2,}/i;

/** Quita acentos y pasa a minúsculas. */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Convierte letras/símbolos usados para disfrazar dígitos. */
function unleet(text: string): string {
  return text
    .replace(/[oO]/g, "0")
    .replace(/[lLiI|]/g, "1")
    .replace(/[eE]/g, "3")
    .replace(/[sS]/g, "5");
}

/** true si el texto contiene 7 o más dígitos seguidos (ignorando separadores). */
function hasLongDigitRun(text: string): boolean {
  // Elimina separadores comunes entre dígitos: espacios, guiones, puntos, paréntesis, +
  const collapsed = text.replace(/(?<=\d)[\s._\-()+/]+(?=\d)/g, "");
  return /\d{7,}/.test(collapsed);
}

/** true si hay 7 o más números escritos en palabras dentro del texto. */
function hasSpelledNumberRun(text: string): boolean {
  const tokens = normalize(text).split(/[^a-z]+/).filter(Boolean);
  let run = 0;
  for (const t of tokens) {
    if (NUMBER_WORDS.includes(t)) {
      run += 1;
      if (run >= 7) return true;
    } else {
      run = 0;
    }
  }
  return false;
}

/** true si aparece alguna palabra prohibida, aunque esté separada por símbolos. */
function hasBannedWord(text: string): boolean {
  const squashed = normalize(text).replace(/[^a-z]/g, "");
  return BANNED_WORDS.some((w) => squashed.includes(w));
}

export type ContactCheck = { ok: true } | { ok: false; reason: string };

/** Revisa un mensaje antes de guardarlo. */
export function checkMessageForContacts(rawBody: string): ContactCheck {
  const body = rawBody ?? "";
  const normalized = normalize(body);

  if (EMAIL_RE.test(body)) return { ok: false, reason: "email" };
  if (hasBannedWord(body)) return { ok: false, reason: "banned_word" };
  if (hasLongDigitRun(body)) return { ok: false, reason: "digits" };
  if (hasLongDigitRun(unleet(normalized))) return { ok: false, reason: "digits_disguised" };
  if (hasSpelledNumberRun(body)) return { ok: false, reason: "spelled_numbers" };

  return { ok: true };
}
