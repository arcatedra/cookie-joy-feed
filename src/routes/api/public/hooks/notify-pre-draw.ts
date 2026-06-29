import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { render } from "@react-email/components";

const SITE_NAME = "origen-com";
const SENDER_DOMAIN = "notify.origen.management";
const FROM_DOMAIN = "origen.management";
const PUBLIC_DRAW_URL = "https://www.hazorex.com/";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function formatDrawTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
      timeZoneName: "short",
    });
  } catch {
    return "8:00 PM ET";
  }
}

export const Route = createFileRoute("/api/public/hooks/notify-pre-draw")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.PRE_DRAW_NOTIFY_SECRET;
        if (!expected) return new Response("Server misconfigured", { status: 500 });

        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (!token || !timingSafeEqual(token, expected)) {
          return new Response(null, { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Find today's open draw with scheduled_at in the 3–7 min window, not yet notified.
        const now = new Date();
        const windowStart = new Date(now.getTime() + 3 * 60_000).toISOString();
        const windowEnd = new Date(now.getTime() + 7 * 60_000).toISOString();

        const { data: drawRows, error: drawErr } = await supabaseAdmin
          .from("daily_draws")
          .select("id, draw_date, scheduled_at, prize_usd, notified_5min_at, status")
          .in("status", ["open", "closed"])
          .gte("scheduled_at", windowStart)
          .lte("scheduled_at", windowEnd)
          .is("notified_5min_at", null)
          .order("scheduled_at", { ascending: true })
          .limit(1);

        if (drawErr) {
          console.error("notify-pre-draw: query error", drawErr);
          return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
        }
        const draw = drawRows?.[0];
        if (!draw) {
          return Response.json({ ok: true, skipped: "no_draw_in_window" });
        }

        // Atomically claim it (only proceed if we win the race)
        const { data: claimed, error: claimErr } = await supabaseAdmin
          .from("daily_draws")
          .update({ notified_5min_at: now.toISOString() })
          .eq("id", draw.id)
          .is("notified_5min_at", null)
          .select("id")
          .maybeSingle();
        if (claimErr || !claimed) {
          return Response.json({ ok: true, skipped: "already_notified" });
        }

        // Fetch opted-in users with email
        const { data: profiles, error: pErr } = await supabaseAdmin
          .from("profiles")
          .select("id, email, notify_before_draw, deleted_at")
          .eq("notify_before_draw", true)
          .is("deleted_at", null)
          .not("email", "is", null);

        if (pErr) {
          console.error("notify-pre-draw: profiles error", pErr);
          return Response.json({ ok: false, error: "profiles_failed" }, { status: 500 });
        }

        const drawTime = formatDrawTime(draw.scheduled_at);
        const prizeUsd = `$${Number(draw.prize_usd ?? 0).toFixed(2)}`;

        // ===== Browser push notifications (fire in parallel) =====
        let pushSent = 0;
        let pushFailed = 0;
        let pushExpired = 0;
        try {
          const optedInIds = (profiles ?? []).map((p) => p.id as string);
          if (optedInIds.length > 0) {
            const { data: subs } = await supabaseAdmin
              .from("push_subscriptions")
              .select("id, endpoint, p256dh, auth, user_id")
              .in("user_id", optedInIds);

            if (subs && subs.length > 0) {
              const { buildPushPayload } = await import("@block65/webcrypto-web-push");
              const vapid = {
                subject: process.env.VAPID_SUBJECT ?? "mailto:noreply@origen.management",
                publicKey: process.env.VAPID_PUBLIC_KEY,
                privateKey: process.env.VAPID_PRIVATE_KEY,
              };

              if (!vapid.publicKey || !vapid.privateKey) {
                console.warn("notify-pre-draw: VAPID keys not configured; skipping push");
              } else {
                const message = {
                  data: {
                    title: "🎰 El sorteo gira en 5 minutos",
                    body: `Premio actual ${prizeUsd}. Entra para ver el giro en vivo.`,
                    url: PUBLIC_DRAW_URL,
                    tag: `pre-draw-${draw.draw_date}`,
                  },
                  options: { ttl: 300, urgency: "high" as const, topic: "pre-draw" },
                };

                await Promise.all(
                  subs.map(async (s) => {
                    try {
                      const payload = await buildPushPayload(
                        message,
                        {
                          endpoint: s.endpoint as string,
                          expirationTime: null,
                          keys: { p256dh: s.p256dh as string, auth: s.auth as string },
                        },
                        vapid,
                      );
                      const resp = await fetch(s.endpoint as string, {
                        method: payload.method,
                        headers: payload.headers,
                        body: payload.body,
                      });
                      if (resp.status === 404 || resp.status === 410) {
                        pushExpired++;
                        await supabaseAdmin.from("push_subscriptions").delete().eq("id", s.id);
                      } else if (!resp.ok) {
                        pushFailed++;
                        console.warn("push failed", resp.status, await resp.text().catch(() => ""));
                      } else {
                        pushSent++;
                        await supabaseAdmin
                          .from("push_subscriptions")
                          .update({ last_used_at: new Date().toISOString() })
                          .eq("id", s.id);
                      }
                    } catch (err) {
                      pushFailed++;
                      console.warn("push error", err);
                    }
                  }),
                );
              }
            }
          }
        } catch (err) {
          console.error("notify-pre-draw: push block error", err);
        }

        const { template } = await import("@/lib/email-templates/pre-draw-notification");
        const subject = typeof template.subject === "string" ? template.subject : (template.subject as (d: Record<string, unknown>) => string)({});

        // Pre-render once (same content for everyone)
        const Component = template.component;
        const html = await render(
          React.createElement(Component, { drawTime, prizeUsd, drawUrl: PUBLIC_DRAW_URL }),
        );
        const text = await render(
          React.createElement(Component, { drawTime, prizeUsd, drawUrl: PUBLIC_DRAW_URL }),
          { plainText: true },
        );

        let enqueued = 0;
        let suppressedCount = 0;
        const errors: string[] = [];

        for (const p of profiles ?? []) {
          const email = (p.email as string | null)?.toLowerCase();
          if (!email) continue;

          // Check suppression
          const { data: suppressed } = await supabaseAdmin
            .from("suppressed_emails")
            .select("id")
            .eq("email", email)
            .maybeSingle();
          if (suppressed) {
            suppressedCount++;
            continue;
          }

          // Ensure unsubscribe token
          let unsubscribeToken: string | null = null;
          const { data: existingTok } = await supabaseAdmin
            .from("email_unsubscribe_tokens")
            .select("token, used_at")
            .eq("email", email)
            .maybeSingle();
          if (existingTok && !existingTok.used_at) {
            unsubscribeToken = existingTok.token as string;
          } else if (!existingTok) {
            unsubscribeToken = randomHex(32);
            await supabaseAdmin
              .from("email_unsubscribe_tokens")
              .upsert(
                { token: unsubscribeToken, email },
                { onConflict: "email", ignoreDuplicates: true },
              );
          }

          const messageId = crypto.randomUUID();
          const idempotencyKey = `pre-draw-${draw.draw_date}-${p.id}`;

          await supabaseAdmin.from("email_send_log").insert({
            message_id: messageId,
            template_name: "pre-draw-notification",
            recipient_email: email,
            status: "pending",
          });

          const { error: enqErr } = await supabaseAdmin.rpc("enqueue_email", {
            queue_name: "transactional_emails",
            payload: {
              message_id: messageId,
              to: email,
              from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
              sender_domain: SENDER_DOMAIN,
              subject,
              html,
              text,
              purpose: "transactional",
              label: "pre-draw-notification",
              idempotency_key: idempotencyKey,
              unsubscribe_token: unsubscribeToken,
              queued_at: new Date().toISOString(),
            },
          });

          if (enqErr) {
            errors.push(`${email}: ${enqErr.message}`);
            await supabaseAdmin.from("email_send_log").insert({
              message_id: messageId,
              template_name: "pre-draw-notification",
              recipient_email: email,
              status: "failed",
              error_message: enqErr.message,
            });
          } else {
            enqueued++;
          }
        }

        return Response.json({
          ok: true,
          draw_date: draw.draw_date,
          enqueued,
          suppressed: suppressedCount,
          errors: errors.length,
        });
      },
    },
  },
});
