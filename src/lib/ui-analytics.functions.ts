import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  eventName: z.string().min(1).max(120),
  eventData: z.record(z.unknown()).optional(),
  sessionId: z.string().min(1).max(120).optional(),
});

export const logUiEvent = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { error } = await sb.from("ui_analytics_events").insert({
      event_name: data.eventName,
      event_data: data.eventData ?? {},
      session_id: data.sessionId ?? null,
    });
    if (error) {
      console.error("[ui-analytics] insert error", error);
      return { ok: false as const };
    }
    return { ok: true as const };
  });
