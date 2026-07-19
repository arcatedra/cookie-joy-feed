import * as React from 'react'
import { render } from '@react-email/components'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { TEMPLATES } from '@/lib/email-templates/registry'



const SITE_NAME = 'HAZOREX'
const SENDER_DOMAIN = 'notify.hazorex.com'
const FROM_DOMAIN = 'origen.management'

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

export const Route = createFileRoute('/api/public/hooks/notify-order')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !serviceKey) {
          console.error('notify-order: missing env')
          return new Response('Server misconfigured', { status: 500 })
        }

        const supabase = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })


        const { data: secretRow } = await supabase
          .from('internal_hook_config')
          .select('value')
          .eq('key', 'notify_order_secret')
          .maybeSingle()
        const secret = secretRow?.value ?? ''

        // Aceptamos el secreto vía x-webhook-secret (como lo envía el trigger
        // de Postgres) o Authorization: Bearer <secret>.
        const headerSecret = request.headers.get('x-webhook-secret') ?? ''
        const auth = request.headers.get('authorization') ?? ''
        const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
        const provided = headerSecret || bearer
        if (!secret || provided !== secret) {
          return new Response('Unauthorized', { status: 401 })
        }

        let body: {
          type?: string
          table?: string
          record?: {
            id?: string
            type?: string
            payload?: Record<string, unknown>
            processed?: boolean
          }
        }
        try {
          body = await request.json()
        } catch {
          return new Response('Invalid body', { status: 400 })
        }

        const rec = body.record
        if (!rec?.id || !rec.type) {
          return new Response('Missing record', { status: 400 })
        }

        // Idempotencia: si ya está procesada, no reenviamos.
        if (rec.processed) {
          return Response.json({ success: true, skipped: 'already_processed' })
        }

        try {
          if (rec.type === 'delivery_completed') {
            await handleDeliveryCompleted(supabase, rec.id, rec.payload ?? {})
          } else {
            // Tipo desconocido: lo marcamos procesado para no reintentar en bucle.
            console.warn('notify-order: unknown type', rec.type)
          }

          await supabase
            .from('notification_queue')
            .update({ processed: true, processed_at: new Date().toISOString() })
            .eq('id', rec.id)

          return Response.json({ success: true })
        } catch (err) {
          console.error('notify-order: error processing', err)
          const { data: current } = await supabase
            .from('notification_queue')
            .select('attempts')
            .eq('id', rec.id)
            .maybeSingle()
          await supabase
            .from('notification_queue')
            .update({
              attempts: (current?.attempts ?? 0) + 1,
              last_error: String(err instanceof Error ? err.message : err).slice(0, 500),
            })
            .eq('id', rec.id)
          // Devolvemos 200 para que pg_net no reintente en loop; queda registrado.
          return Response.json({ success: false, logged: true })
        }
      },
    },
  },
})

async function handleDeliveryCompleted(
  supabase: SupabaseClient,
  notificationId: string,
  payload: Record<string, unknown>,
) {

  const orderId = String(payload.order_id ?? '')
  const photoUrl = typeof payload.photo_url === 'string' ? payload.photo_url : ''
  if (!orderId) throw new Error('payload.order_id requerido')

  const { data: order, error: orderErr } = await supabase
    .from('subscription_orders')
    .select('id, customer_id, recipient_name, delivery_address, package_code')
    .eq('id', orderId)
    .maybeSingle()
  if (orderErr || !order) throw new Error(`Pedido no encontrado: ${orderErr?.message ?? orderId}`)

  const { data: authUser, error: authErr } = await (supabase as any).auth.admin.getUserById(
    order.customer_id,
  )
  if (authErr) throw new Error(`No se pudo leer el usuario: ${authErr.message}`)
  const recipient = String(authUser?.user?.email ?? '').toLowerCase()
  if (!recipient) throw new Error('El cliente no tiene email')

  // Nombre para saludo: profiles.full_name o recipient_name como fallback.
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', order.customer_id)
    .maybeSingle()
  const customerName =
    (profile?.full_name as string | undefined) || order.recipient_name || ''

  const messageId = `delivery-completed-${notificationId}`
  const idempotencyKey = messageId

  // Supresión
  const { data: suppressed } = await supabase
    .from('suppressed_emails')
    .select('id')
    .eq('email', recipient)
    .maybeSingle()
  if (suppressed) {
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'delivery-completed',
      recipient_email: recipient,
      status: 'suppressed',
    })
    return
  }

  // Token de unsubscribe (reutilizar o crear)
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

  const tpl = TEMPLATES['delivery-completed']
  const element = React.createElement(tpl.component, {
    customerName,
    deliveryAddress: order.delivery_address ?? '',
    photoUrl,
    packageCode: order.package_code ?? '',
  })
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject = typeof tpl.subject === 'function' ? tpl.subject({}) : tpl.subject

  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: 'delivery-completed',
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
      label: 'delivery-completed',
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })
  if (enqErr) {
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'delivery-completed',
      recipient_email: recipient,
      status: 'failed',
      error_message: 'enqueue failed',
    })
    throw new Error(`enqueue failed: ${enqErr.message}`)
  }

  console.log('delivery-completed queued', { recipient: redact(recipient), orderId })
}
