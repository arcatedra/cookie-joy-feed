import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ReferralHistoryItem {
  referee_display_name: string;
  invited_at: string;
  reward_granted: boolean;
  rewarded_at: string | null;
}

export interface ReferralProfileSummary {
  referralCode: string | null;
  stars: number;
  invited: number;
}

export const getMyReferralProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReferralProfileSummary> => {
    const { data, error } = await context.supabase.rpc("get_my_referral_profile");
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : null;
    return {
      referralCode: (row?.referral_code ?? null) as string | null,
      stars: Number(row?.stars_count ?? 0),
      invited: Number(row?.invited_count ?? 0),
    };
  });

export const getMyReferralHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ items: ReferralHistoryItem[] }> => {
    const { data, error } = await context.supabase.rpc("get_my_referrals");
    if (error) throw error;
    return {
      items: (data ?? []).map((row: {
        referee_display_name: string | null;
        invited_at: string;
        reward_granted: boolean;
        rewarded_at: string | null;
      }) => ({
        referee_display_name: row.referee_display_name ?? "Amigo",
        invited_at: row.invited_at,
        reward_granted: row.reward_granted,
        rewarded_at: row.rewarded_at,
      })),
    };
  });
