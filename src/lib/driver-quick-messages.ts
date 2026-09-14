/**
 * Los cinco mensajes rápidos del repartidor, traducidos a los idiomas del sitio.
 * Se usan tanto en la pantalla del repartidor como en el aviso (push) al cliente.
 */
export const QUICK_MESSAGE_KEYS = [
  "on_the_way",
  "ten_minutes",
  "outside",
  "left_at_door",
  "failed",
] as const;

export type QuickMessageKey = (typeof QUICK_MESSAGE_KEYS)[number];

type Dict = Record<QuickMessageKey, string>;

export const QUICK_MESSAGES: Record<string, Dict> = {
  es: {
    on_the_way: "Voy en camino",
    ten_minutes: "Llego en 10 minutos",
    outside: "Estoy afuera",
    left_at_door: "Dejé tu pedido en la puerta",
    failed: "No pude entregar",
  },
  en: {
    on_the_way: "I'm on my way",
    ten_minutes: "Arriving in 10 minutes",
    outside: "I'm outside",
    left_at_door: "I left your order at the door",
    failed: "I couldn't deliver",
  },
  pt: {
    on_the_way: "Estou a caminho",
    ten_minutes: "Chego em 10 minutos",
    outside: "Estou lá fora",
    left_at_door: "Deixei o seu pedido na porta",
    failed: "Não consegui entregar",
  },
  fr: {
    on_the_way: "Je suis en route",
    ten_minutes: "J'arrive dans 10 minutes",
    outside: "Je suis dehors",
    left_at_door: "J'ai laissé votre commande devant la porte",
    failed: "Je n'ai pas pu livrer",
  },
  it: {
    on_the_way: "Sto arrivando",
    ten_minutes: "Arrivo tra 10 minuti",
    outside: "Sono fuori",
    left_at_door: "Ho lasciato il tuo ordine alla porta",
    failed: "Non sono riuscito a consegnare",
  },
  de: {
    on_the_way: "Ich bin unterwegs",
    ten_minutes: "Ich komme in 10 Minuten",
    outside: "Ich bin draußen",
    left_at_door: "Ich habe deine Bestellung an der Tür gelassen",
    failed: "Ich konnte nicht zustellen",
  },
  fil: {
    on_the_way: "Papunta na ako",
    ten_minutes: "Dadating ako sa loob ng 10 minuto",
    outside: "Nasa labas na ako",
    left_at_door: "Iniwan ko ang order mo sa pintuan",
    failed: "Hindi ko naihatid",
  },
  ja: {
    on_the_way: "向かっています",
    ten_minutes: "10分で到着します",
    outside: "外に着きました",
    left_at_door: "ご注文をドアの前に置きました",
    failed: "配達できませんでした",
  },
  zh: {
    on_the_way: "我正在路上",
    ten_minutes: "10 分钟后到达",
    outside: "我已在门外",
    left_at_door: "您的订单已放在门口",
    failed: "无法完成配送",
  },
};

export const PUSH_TITLE: Record<string, string> = {
  es: "Tu repartidor",
  en: "Your courier",
  pt: "O seu entregador",
  fr: "Votre livreur",
  it: "Il tuo corriere",
  de: "Dein Kurier",
  fil: "Ang iyong rider",
  ja: "配達員",
  zh: "您的配送员",
};

/** Idioma soportado más cercano; español por defecto. */
export function normalizeLocale(locale: string | null | undefined): string {
  const base = (locale ?? "es").toLowerCase().split(/[-_]/)[0] ?? "es";
  return base in QUICK_MESSAGES ? base : "es";
}

export function quickMessageText(key: QuickMessageKey, locale?: string | null): string {
  const dict = QUICK_MESSAGES[normalizeLocale(locale)] ?? QUICK_MESSAGES["es"]!;
  return dict[key];
}
