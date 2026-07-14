import * as React from 'react'
import { render } from '@react-email/components'
import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { createHash } from 'node:crypto'
import { TEMPLATES } from '@/lib/email-templates/registry'

/**
 * CSP violation report receiver.
 *
 * - Logs every violation to the worker console (CSP_VIOLATION).
 * - Persists violations in public.csp_violations, deduped by fingerprint
 *   (directive + blocked + source + line + column).
 * - For directive `style-src-attr`, sends an email alert to every admin
 *   the first time a fingerprint appears, then at most once per 24h per
 *   fingerprint. Prevents alert storms while surfacing new regressions.
 */

const SITE_NAME = 'origen-com'
const SENDER_DOMAIN = 'notify.hazorex.com'
const FROM_DOMAIN = 'origen.management'
const PANEL_URL = 'https://www.origen.management/admin/csp-violations'
const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, application/csp-report, application/reports+json',
  'Access-Control-Max-Age': '86400',
} as const

type LegacyReport = { 'csp-report'?: Record<string, unknown> }
type ModernReport = { type?: string; body?: Record<string, unknown> }

type Summary = {
  directive?: string
  blocked?: string
  source?: string
  line?: unknown
  column?: unknown
  sample?: string
  documentURL?: string
  disposition?: string
}

function summarize(body: Record<string, unknown>): Summary {
  const pick = (k: string) => (typeof body[k] === 'string' ? (body[k] as string) : undefined)
  return {
    directive:
      pick('effectiveDirective') ||
      pick('effective-directive') ||
      pick('violatedDirective') ||
      pick('violated-directive'),
    blocked: pick('blockedURL') || pick('blocked-uri') || pick('blockedURI'),
    source: pick('sourceFile') || pick('source-file'),
    line: body['lineNumber'] ?? body['line-number'],
    column: body['columnNumber'] ?? body['column-number'],
    sample: pick('sample') || pick('scriptSample'),
    documentURL: pick('documentURL') || pick('document-uri'),
    disposition: pick('disposition'),
  }
}

function fingerprintOf(s: Summary): string {
  const parts = [
    s.directive ?? '',
    s.blocked ?? '',
    s.source ?? '',
    String(s.line ?? ''),
    String(s.column ?? ''),
  ].join('|')
  return createHash('sha256').update(parts).digest('hex').slice(0, 32)
}

async function persistAndMaybeAlert(
  supabase: ReturnType<typeof createClient>,
  summary: Summary,
  userAgent: string,
) {
  const directive = summary.directive ?? ''
  if (!directive) return

  const fingerprint = fingerprintOf(summary)
  const lineNum = Number.isFinite(Number(summary.line)) ? Number(summary.line) : null
  const colNum = Number.isFinite(Number(summary.column)) ? Number(summary.column) : null

  // Fetch existing row
  const { data: existing } = await supabase
    .from('csp_violations')
    .select('id, occurrence_count, last_alert_sent_at, first_seen_at')
    .eq('fingerprint', fingerprint)
    .maybeSingle()

  const now = new Date()
  let isNewFingerprint = false
  let lastAlertAt: string | null = null

  if (existing) {
    lastAlertAt = (existing.last_alert_sent_at as string | null) ?? null
    await supabase
      .from('csp_violations')
      .update({
        occurrence_count: ((existing.occurrence_count as number) ?? 0) + 1,
        last_seen_at: now.toISOString(),
      })
      .eq('id', existing.id as string)
  } else {
    isNewFingerprint = true
    await supabase.from('csp_violations').insert({
      fingerprint,
      directive,
      blocked_uri: summary.blocked ?? null,
      source_file: summary.source ?? null,
      line_number: lineNum,
      column_number: colNum,
      sample: summary.sample ?? null,
      document_url: summary.documentURL ?? null,
      user_agent: userAgent || null,
      disposition: summary.disposition ?? null,
      first_seen_at: now.toISOString(),
      last_seen_at: now.toISOString(),
      occurrence_count: 1,
    })
  }

  // Only alert for style-src-attr regressions (the enforced-CSP report-only signal)
  if (!directive.includes('style-src-attr')) return

  const cooledDown =
    !lastAlertAt || now.getTime() - new Date(lastAlertAt).getTime() > ALERT_COOLDOWN_MS
  if (!isNewFingerprint && !cooledDown) return

  await sendAlertToAdmins(supabase, fingerprint, summary, userAgent, now)
}

async function sendAlertToAdmins(
  supabase: ReturnType<typeof createClient>,
  fingerprint: string,
  summary: Summary,
  userAgent: string,
  now: Date,
) {
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
  if (recipients.length === 0) return

  const template = TEMPLATES['csp-violation-alert']
  if (!template) return
  const props = {
    directive: summary.directive ?? 'style-src-attr',
    blocked: summary.blocked ?? '—',
    source: summary.source ?? '—',
    line: (summary.line as number | string | undefined) ?? '—',
    column: (summary.column as number | string | undefined) ?? '—',
    sample: summary.sample ?? '',
    documentUrl: summary.documentURL ?? '—',
    userAgent: userAgent || '—',
    panelUrl: PANEL_URL,
    occurredAt: now.toISOString(),
  }
  const element = React.createElement(template.component, props)
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject = typeof template.subject === 'function' ? template.subject(props) : template.subject

  for (const to of recipients) {
    const { data: suppressed } = await supabase
      .from('suppressed_emails')
      .select('id')
      .eq('email', to)
      .maybeSingle()
    if (suppressed) continue

    const messageId = `csp-alert-${fingerprint}-${Math.floor(now.getTime() / ALERT_COOLDOWN_MS)}-${to}`

    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'csp-violation-alert',
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
        label: 'csp-violation-alert',
        idempotency_key: messageId,
        queued_at: now.toISOString(),
      },
    })
    if (enqErr) {
      console.error('csp-violation-alert enqueue failed', enqErr)
    }
  }

  await supabase
    .from('csp_violations')
    .update({ last_alert_sent_at: now.toISOString() })
    .eq('fingerprint', fingerprint)
}

export const Route = createFileRoute('/api/public/csp-report')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),

      POST: async ({ request }) => {
        try {
          const raw = await request.text()
          if (!raw) return new Response(null, { status: 204, headers: CORS_HEADERS })

          if (raw.length > 16_000) {
            console.warn('CSP_VIOLATION oversized payload dropped', { bytes: raw.length })
            return new Response(null, { status: 204, headers: CORS_HEADERS })
          }

          let parsed: unknown
          try {
            parsed = JSON.parse(raw)
          } catch {
            return new Response(null, { status: 204, headers: CORS_HEADERS })
          }

          const userAgent = request.headers.get('user-agent') ?? ''

          const summaries: Summary[] = []
          if (Array.isArray(parsed)) {
            for (const entry of parsed as ModernReport[]) {
              if (entry?.type !== 'csp-violation' || !entry.body) continue
              summaries.push(summarize(entry.body))
            }
          } else if (parsed && typeof parsed === 'object') {
            const body = (parsed as LegacyReport)['csp-report']
            if (body && typeof body === 'object') {
              summaries.push(summarize(body as Record<string, unknown>))
            }
          }

          for (const s of summaries) {
            console.warn('CSP_VIOLATION', { ...s, userAgent })
          }

          const supabaseUrl = process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
          if (supabaseUrl && serviceKey && summaries.length > 0) {
            const supabase = createClient(supabaseUrl, serviceKey, {
              auth: { persistSession: false, autoRefreshToken: false },
            })
            for (const s of summaries) {
              try {
                await persistAndMaybeAlert(supabase, s, userAgent)
              } catch (err) {
                console.error('CSP_VIOLATION persist error', err)
              }
            }
          }

          return new Response(null, { status: 204, headers: CORS_HEADERS })
        } catch (err) {
          console.error('CSP_VIOLATION handler error', err)
          return new Response(null, { status: 204, headers: CORS_HEADERS })
        }
      },
    },
  },
})
