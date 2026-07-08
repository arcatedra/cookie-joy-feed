// ⚠️ Reemplaza estos placeholders por las URLs reales de tus redes sociales.
export const SOCIAL_URLS = {
  tiktok: "https://www.tiktok.com/@origen",
  instagram: "https://www.instagram.com/origen",
  facebook: "https://www.facebook.com/origen",
} as const;

export type MissionKey = "tiktok" | "instagram" | "facebook";

export const MISSIONS: Record<
  MissionKey,
  { label: string; seconds: number; reward: number; url: string }
> = {
  tiktok: { label: "TikTok", seconds: 60, reward: 3, url: SOCIAL_URLS.tiktok },
  instagram: { label: "Instagram", seconds: 45, reward: 3, url: SOCIAL_URLS.instagram },
  facebook: { label: "Facebook", seconds: 30, reward: 3, url: SOCIAL_URLS.facebook },
};

export const SPIN_COST = 10;

export type Prize = {
  key: string;
  label: string;
  weight: number;
  hasCoupon: boolean;
  color: string;
};

// Pesos servidor-only (cliente solo recibe metadata visual).
export const PRIZES: Prize[] = [
  { key: "discount_10", label: "10% de descuento", weight: 18, hasCoupon: true, color: "#1e3a5f" },
  { key: "free_shipping", label: "Envío gratis", weight: 15, hasCoupon: true, color: "#3b2417" },
  { key: "surprise_flavor", label: "Sabor sorpresa", weight: 10, hasCoupon: true, color: "#c9a36b" },
  { key: "try_again", label: "Sigue intentando", weight: 25, hasCoupon: false, color: "#1e3a5f" },
  { key: "discount_5", label: "5% de descuento", weight: 20, hasCoupon: true, color: "#3b2417" },
  { key: "try_again_2", label: "Casi lo logras", weight: 8, hasCoupon: false, color: "#c9a36b" },
  { key: "free_cookie", label: "Galleta gratis", weight: 3, hasCoupon: true, color: "#1e3a5f" },
  { key: "try_again_3", label: "Sigue intentando", weight: 1, hasCoupon: false, color: "#3b2417" },
];

export type TokenPackage = {
  id: "stars_starter" | "stars_popular" | "stars_premium";
  tokens: number;
  priceUsd: number;
  /** i18n key under `ruleta.packages.<id>.label` */
  labelKey: string;
  /** i18n key under `ruleta.packages.<id>.tagline` */
  taglineKey: string;
  featured?: boolean;
};

export const TOKEN_PACKAGES: readonly TokenPackage[] = [
  {
    id: "stars_starter",
    tokens: 10,
    priceUsd: 1.99,
    labelKey: "ruleta.packages.starter.label",
    taglineKey: "ruleta.packages.starter.tagline",
  },
  {
    id: "stars_popular",
    tokens: 30,
    priceUsd: 4.99,
    labelKey: "ruleta.packages.popular.label",
    taglineKey: "ruleta.packages.popular.tagline",
    featured: true,
  },
  {
    id: "stars_premium",
    tokens: 150,
    priceUsd: 9.99,
    labelKey: "ruleta.packages.premium.label",
    taglineKey: "ruleta.packages.premium.tagline",
  },
] as const;


