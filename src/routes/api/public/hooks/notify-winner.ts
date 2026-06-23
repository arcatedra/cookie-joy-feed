import * as React from 'react'
import { render } from '@react-email/components'
import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'origen-com'
const SENDER_DOMAIN = 'notify.origen.management'
const FROM_DOMAIN = 'origen.management'
const PUBLIC_BASE_URL = 'https://www.origen.management'

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function redact(email: string | null | undefined) {
  if (!email) return '***'
  const [l, d] = email.split('@')
  return l && d ? `${l[0]}***@${d}` : '***'
}

export const Route = createFileRoute('/api/public/hooks/notify-winner')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !serviceKey) {
          console.error('notify-winner: missing env')
          return new Response('Server misconfigured', { status: 500 })
        }

        const supabase = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })

        // Shared secret lives in internal_hook_config so the DB trigger and
        // this route read from the same source of truth.
        const { data: secretRow } = await supabase
          .from('internal_hook_config')
          .select('value')
          .eq('key', 'notify_winner_secret')
          .maybeSingle()
        const secret = secretRow?.value ?? ''

        const auth = request.headers.get('authorization') ?? ''
        const provided = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
        if (!secret || provided !== secret) {
          return new Response('Unauthorized', { status: 401 })
        }

        let drawDate: string
        let claimId: string | undefined
        try {
          const body = (await request.json()) as { draw_date?: string; claim_id?: string }
          drawDate = String(body.draw_date ?? '')
          claimId = body.claim_id
          if (!drawDate) throw new Error('draw_date required')
        } catch {
          return new Response('Invalid body', { status: 400 })
        }


        const claimQuery = supabase
          .from('winner_claims')
          .select('id, draw_date, email, display_name, prize_usd, claim_deadline, notified_at')
          .eq('draw_date', drawDate)
          .maybeSingle()

        const { data: claim, error: claimErr } = claimId
          ? await supabase
              .from('winner_claims')
              .select('id, draw_date, email, display_name, prize_usd, claim_deadline, notified_at')
              .eq('id', claimId)
              .maybeSingle()
          : await claimQuery

        if (claimErr || !claim) {
          console.error('notify-winner: claim lookup failed', claimErr)
          return new Response('Claim not found', { status: 404 })
        }

        if (claim.notified_at) {
          return Response.json({ success: true, skipped: 'already_notified' })
        }

        const recipient = (claim.email ?? '').toLowerCase()
        if (!recipient) {
          console.warn('notify-winner: claim has no email', { drawDate })
          return Response.json({ success: false, reason: 'no_email' })
        }

        const messageId = `winner-claim-${claim.id}`
        const idempotencyKey = messageId

        // Suppression check
        const { data: suppressed } = await supabase
          .from('suppressed_emails')
          .select('id')
          .eq('email', recipient)
          .maybeSingle()

        if (suppressed) {
          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: 'winner-notification',
            recipient_email: recipient,
            status: 'suppressed',
          })
          return Response.json({ success: false, reason: 'suppressed' })
        }

        // Unsubscribe token (reuse or create)
        let unsubscribeToken: string
        const { data: existing } = await supabase
          .from('email_unsubscribe_tokens')
          .select('token, used_at')
          .eq('email', recipient)
          .maybeSingle()

        if (existing?.token && !existing.used_at) {
          unsubscribeToken = existing.token
        } else {
          unsubscribeToken = generateToken()
          await supabase
            .from('email_unsubscribe_tokens')
            .upsert(
              { token: unsubscribeToken, email: recipient },
              { onConflict: 'email', ignoreDuplicates: true },
            )
          const { data: stored } = await supabase
            .from('email_unsubscribe_tokens')
            .select('token')
            .eq('email', recipient)
            .maybeSingle()
          if (stored?.token) unsubscribeToken = stored.token
        }

        // Format display values
        const prizeNum = Number(claim.prize_usd ?? 0)
        const prizeUsd = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(prizeNum)
        const deadline = new Date(claim.claim_deadline).toLocaleString('es-ES', {
          dateStyle: 'long',
          timeStyle: 'short',
          timeZone: 'America/New_York',
        })
        const claimUrl = `${PUBLIC_BASE_URL}/claim/${claim.draw_date}`

        const template = TEMPLATES['winner-notification']
        const element = React.createElement(template.component, {
          winnerName: claim.display_name || 'Ganador/a',
          prizeUsd,
          drawDate: claim.draw_date,
          claimUrl,
          deadline,
        })
        const html = await render(element)
        const text = await render(element, { plainText: true })

        const subject =
          typeof template.subject === 'function'
            ? template.subject({ prizeUsd, drawDate: claim.draw_date })
            : template.subject

        await supabase.from('email_send_log').insert({
          message_id: messageId,
          template_name: 'winner-notification',
          recipient_email: recipient,
          status: 'pending',
        })

        const { error: enqErr } = await supabase.rpc('enqueue_email', {
          queue_name: 'transactional_emails',
          payload: {
            message_id: messageId,
            to: recipient,
            from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject,
            html,
            text,
            purpose: 'transactional',
            label: 'winner-notification',
            idempotency_key: idempotencyKey,
            unsubscribe_token: unsubscribeToken,
            queued_at: new Date().toISOString(),
          },
        })

        if (enqErr) {
          console.error('notify-winner: enqueue failed', enqErr)
          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: 'winner-notification',
            recipient_email: recipient,
            status: 'failed',
            error_message: 'enqueue failed',
          })
          return new Response('Enqueue failed', { status: 500 })
        }

        await supabase
          .from('winner_claims')
          .update({ notified_at: new Date().toISOString() })
          .eq('id', claim.id)

        console.log('Winner notification queued', {
          drawDate,
          recipient: redact(recipient),
        })

        return Response.json({ success: true, queued: true })
      },
    },
  },
})
