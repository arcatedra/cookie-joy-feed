import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { render } from "@react-email/components";
import { TEMPLATES } from "@/lib/email-templates/registry";

const SITE_NAME = "origen-com";
const SENDER_DOMAIN = "notify.origen.management";
const FROM_DOMAIN = "origen.management";

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function notifyWinner(args: {
  email: string;
  winnerName: string;
  prizeUsd: number;
  drawDate: string;
  claimDeadline: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const template = TEMPLATES["winner-notification"];
  if (!template) return;
  const recipient = args.email.toLowerCase();

  // Suppression check
  const { data: suppressed } = await supabaseAdmin
    .from("suppressed_emails")
    .select("id")
    .eq("email", recipient)
    .maybeSingle();
  if (suppressed) return;

  // Idempotency: avoid re-sending the same winner notification.
  const messageId = `winner-${args.drawDate}-${recipient}`;
  const { data: already } = await supabaseAdmin
    .from("email_send_log")
    .select("id")
    .eq("message_id", messageId)
    .in("status", ["sent", "pending"])
    .maybeSingle();
  if (already) return;

  // Unsubscribe token
  const { data: existingToken } = await supabaseAdmin
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", recipient)
    .maybeSingle();
  let unsubscribeToken = existingToken?.token as string | undefined;
  if (!unsubscribeToken) {
    unsubscribeToken = generateToken();
    await supabaseAdmin.from("email_unsubscribe_tokens").upsert(
      { token: unsubscribeToken, email: recipient },
      { onConflict: "email", ignoreDuplicates: true },
    );
    const { data: stored } = await supabaseAdmin
      .from("email_unsubscribe_tokens").select("token").eq("email", recipient).maybeSingle();
    if (stored) unsubscribeToken = stored.token as string;
  }

  const deadlineFmt = new Date(args.claimDeadline).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const claimUrl = `https://hazorex.com/claim/${args.drawDate}`;
  const data = {
    winnerName: args.winnerName || "Ganador/a",
    prizeUsd: `$${args.prizeUsd.toFixed(2)}`,
    drawDate: args.drawDate,
    claimUrl,
    deadline: deadlineFmt,
  };
  const html = await render(React.createElement(template.component, data));
  const text = await render(React.createElement(template.component, data), { plainText: true });
  const subject = typeof template.subject === "function" ? template.subject(data) : template.subject;

  await supabaseAdmin.from("email_send_log").insert({
    message_id: messageId,
    template_name: "winner-notification",
    recipient_email: recipient,
    status: "pending",
  });

  await supabaseAdmin.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: recipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: "transactional",
      label: "winner-notification",
      idempotency_key: messageId,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  });

  await supabaseAdmin
    .from("winner_claims")
    .update({ notified_at: new Date().toISOString() })
    .eq("draw_date", args.drawDate)
    .is("notified_at", null);
}

export const Route = createFileRoute("/api/public/hooks/run-daily-draw")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? request.headers.get("x-api-key");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }

        let testMode = false;
        try {
          const body = (await request.json().catch(() => ({}))) as { test_mode?: boolean };
          testMode = Boolean(body?.test_mode);
        } catch {
          testMode = false;
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // TEST MODE: ensure sponsor_address is valid so run_daily_draw doesn't reject
        if (testMode) {
          const { data: cfg } = await supabaseAdmin
            .from("sweepstakes_config")
            .select("sponsor_address")
            .eq("id", true)
            .maybeSingle();
          const addr = (cfg?.sponsor_address ?? "").trim();
          const invalid =
            !addr || addr.length < 10 || /completar/i.test(addr) || /\[.*\]/.test(addr);
          if (invalid) {
            await supabaseAdmin
              .from("sweepstakes_config")
              .update({ sponsor_address: "123 Test Street, Miami, FL 33101, USA" })
              .eq("id", true);
          }
        }

        // Cutoff sweep (idempotent): close entries 5 min before scheduled_at
        await supabaseAdmin.rpc("close_draws_for_cutoff");
        // Expire stale claims (idempotent)
        await supabaseAdmin.rpc("expire_winner_claims");

        const { data, error } = await supabaseAdmin.rpc("run_daily_draw");
        if (error) {
          console.error("[run-daily-draw] rpc error", error);
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        const row = Array.isArray(data) ? data[0] : data;
        let simulated = false;
        let simulatedWinner: { display_name: string; prize_usd: number; draw_date: string } | null = null;

        // TEST MODE: if no entries today (rolled_over), simulate a winner from recent participants
        if (testMode && row?.status === "rolled_over") {
          const { data: entries } = await supabaseAdmin
            .from("daily_draw_entries")
            .select("display_name, subject_email, draw_date")
            .order("created_at", { ascending: false })
            .limit(50);
          if (entries && entries.length > 0) {
            const pick = entries[Math.floor(Math.random() * entries.length)];
            const prize = Number(row.prize_usd ?? 0) || 100;
            const drawDate = row.draw_date as string;
            await supabaseAdmin
              .from("winner_announcements")
              .upsert(
                {
                  draw_date: drawDate,
                  winner_display_name: pick.display_name ?? "Participante",
                  prize_usd: prize,
                  seed_hash: `sim-${Date.now()}`,
                  published_at: new Date().toISOString(),
                },
                { onConflict: "draw_date" },
              );
            simulated = true;
            simulatedWinner = {
              display_name: pick.display_name ?? "Participante",
              prize_usd: prize,
              draw_date: drawDate,
            };
          }
        }

        // Notify real winner via email
        try {
          if (row?.status === "completed" && row.winner_display_name) {
            const { data: claim } = await supabaseAdmin
              .from("winner_claims")
              .select("email, display_name, prize_usd, claim_deadline")
              .eq("draw_date", row.draw_date)
              .maybeSingle();
            if (claim?.email) {
              await notifyWinner({
                email: claim.email as string,
                winnerName: (claim.display_name as string) ?? "Ganador/a",
                prizeUsd: Number(claim.prize_usd),
                drawDate: row.draw_date as string,
                claimDeadline: claim.claim_deadline as string,
              });
            }
          }
        } catch (e) {
          console.error("[run-daily-draw] notify error", e);
        }

        return Response.json({ ok: true, result: data, simulated, simulatedWinner });
      },
      GET: async () => new Response("Method Not Allowed", { status: 405 }),
    },
  },
});
