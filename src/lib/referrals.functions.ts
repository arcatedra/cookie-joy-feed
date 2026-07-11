import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ReferralHistoryItem {
  referee_display_name: string;
  invited_at: string;
  reward_granted: boolean;
  rewarded_at: string | null;
}

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
