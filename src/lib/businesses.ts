/**
 * Hazorex — Módulo de negocios (multi-vendor).
 * Helpers cliente para postulación, catálogo y ofertas.
 * Usa el cliente Supabase del navegador (RLS aplica).
 */
import { supabase } from "@/integrations/supabase/client";

export type BusinessStatus = "pendiente" | "aprobado" | "rechazado" | "suspendido";
export type BusinessType = "supermercado" | "tienda" | "panaderia" | "farmacia" | "otro";
export type DiscountType = "porcentaje" | "monto_fijo";

export interface Business {
  id: string;
  owner_user_id: string;
  business_name: string;
  business_type: BusinessType;
  email: string;
  phone: string;
  address: string;
  city: string | null;
  status: BusinessStatus;
  rejection_reason: string | null;
  logo_url: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessProduct {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  stock_quantity: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessOffer {
  id: string;
  business_id: string;
  product_id: string | null;
  discount_type: DiscountType;
  discount_value: number;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessRegistrationInput {
  business_name: string;
  business_type: BusinessType;
  email: string;
  phone: string;
  address: string;
  city?: string | null;
  logo_url?: string | null;
}

const db = supabase as any;

export async function registerBusiness(input: BusinessRegistrationInput): Promise<Business> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Debes iniciar sesión para registrar un negocio.");

  const { data, error } = await db
    .from("businesses")
    .insert({ ...input, owner_user_id: uid })
    .select()
    .single();
  if (error) throw error;
  return data as Business;
}

export async function fetchMyBusiness(): Promise<Business | null> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return null;
  const { data, error } = await db
    .from("businesses")
    .select("*")
    .eq("owner_user_id", uid)
    .maybeSingle();
  if (error) throw error;
  return (data as Business) ?? null;
}

export async function updateMyBusiness(
  id: string,
  patch: Partial<BusinessRegistrationInput>
): Promise<Business> {
  const { data, error } = await db
    .from("businesses")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Business;
}

export async function fetchApprovedBusinesses(filters?: {
  type?: BusinessType;
  city?: string;
}): Promise<Business[]> {
  let q = db.from("businesses").select("*").eq("status", "aprobado");
  if (filters?.type) q = q.eq("business_type", filters.type);
  if (filters?.city) q = q.eq("city", filters.city);
  const { data, error } = await q.order("business_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Business[];
}

// -------- Products --------

export async function fetchBusinessProducts(businessId: string): Promise<BusinessProduct[]> {
  const { data, error } = await db
    .from("business_products")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BusinessProduct[];
}

export async function upsertProduct(
  businessId: string,
  product: Partial<BusinessProduct> & { name: string; price: number }
): Promise<BusinessProduct> {
  const payload = { ...product, business_id: businessId };
  const { data, error } = await db
    .from("business_products")
    .upsert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as BusinessProduct;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await db.from("business_products").delete().eq("id", id);
  if (error) throw error;
}

// -------- Offers --------

export async function fetchBusinessOffers(businessId: string): Promise<BusinessOffer[]> {
  const { data, error } = await db
    .from("business_offers")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BusinessOffer[];
}

export async function upsertOffer(
  businessId: string,
  offer: Partial<BusinessOffer> & { discount_type: DiscountType; discount_value: number }
): Promise<BusinessOffer> {
  const payload = { ...offer, business_id: businessId };
  const { data, error } = await db
    .from("business_offers")
    .upsert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as BusinessOffer;
}

export async function deleteOffer(id: string): Promise<void> {
  const { error } = await db.from("business_offers").delete().eq("id", id);
  if (error) throw error;
}

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  supermercado: "Supermercado",
  tienda: "Tienda",
  panaderia: "Panadería",
  farmacia: "Farmacia",
  otro: "Otro",
};

export const BUSINESS_STATUS_LABELS: Record<BusinessStatus, string> = {
  pendiente: "Pendiente de revisión",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  suspendido: "Suspendido",
};
