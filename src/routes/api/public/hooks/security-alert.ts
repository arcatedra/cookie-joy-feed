import * as React from 'react'
import { render } from '@react-email/components'
import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'origen-com'
const SENDER_DOMAIN = 'notify.origen.management'
const FROM_DOMAIN = 'origen.management'
const PANEL_URL = 'https://www.origen.management/admin/security'

export const Route = createFileRoute('/api/public/hooks/security-alert')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !serviceKey) {
          return new Response('Server misconfigured', { status: 500 })
        }

        const supabase = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })

        const { data: secretRow } = await supabase
          .from('internal_hook_config')
          .select('value')
          .eq('key', 'security_alert_secret')
          .maybeSingle()
        const secret = secretRow?.value ?? ''
        const auth = request.headers.get('authorization') ?? ''
        const provided = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
        if (!secret || provided !== secret) {
          return new Response('Unauthorized', { status: 401 })
        }

        let payload: {
          audit_id?: number
          table_name?: string
          row_count?: number
          actor_role?: string
          created_at?: string
        }
        try {
          payload = await request.json()
        } catch {
          return new Response('Invalid body', { status: 400 })
        }

        // Recipient list: every admin user with an email on their profile
        const { data: adminRows } = await supabase
          .from('user_roles')
          .select('user_id, profiles!inner(email)')
          .eq('role', 'admin')
        type AdminRow = { user_id: string; profiles: { email: string | null } | null }
        const recipients = Array.from(
          new Set(
            ((adminRows ?? []) as unknown as AdminRow[])
              .map((r) => (r.profiles?.email ?? '').toLowerCase())
              .filter((e) => e.length > 0),
          ),
        )

        if (recipients.length === 0) {
          return Response.json({ ok: true, skipped: 'no_admin_recipients' })
        }

        const template = TEMPLATES['security-alert']
        const props = {
          tableName: payload.table_name ?? '—',
          rowCount: Number(payload.row_count ?? 0),
          actorRole: payload.actor_role ?? 'unknown',
          occurredAt: payload.created_at ?? new Date().toISOString(),
          panelUrl: PANEL_URL,
        }
        const element = React.createElement(template.component, props)
        const html = await render(element)
        const text = await render(element, { plainText: true })
        const subject =
          typeof template.subject === 'function' ? template.subject(props) : template.subject

        const sent: string[] = []
        for (const to of recipients) {
          // Per-minute dedupe key
          const minute = Math.floor(Date.now() / 60_000)
          const messageId = `security-alert-${payload.table_name ?? 'unknown'}-${minute}-${to}`

          // Suppression check
          const { data: suppressed } = await supabase
            .from('suppressed_emails')
            .select('id')
            .eq('email', to)
            .maybeSingle()
          if (suppressed) continue

          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: 'security-alert',
            recipient_email: to,
            status: 'pending',
          })

          const { error: enqErr } = await supabase.rpc('enqueue_email', {
            queue_name: 'transactional_emails',
            payload: {
              message_id: messageId,
              to,
              from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
              sender_domain: SENDER_DOMAIN,
              subject,
              html,
              text,
              purpose: 'transactional',
              label: 'security-alert',
              idempotency_key: messageId,
              queued_at: new Date().toISOString(),
            },
          })
          if (enqErr) {
            console.error('security-alert enqueue failed', enqErr)
            continue
          }
          sent.push(to)
        }

        return Response.json({ ok: true, sent_count: sent.length })
      },
      GET: async () => new Response('Method Not Allowed', { status: 405 }),
    },
  },
})
