import { supabase } from '@/integrations/supabase/client'

export interface SendTransactionalEmailArgs {
  templateName: string
  recipientEmail: string
  idempotencyKey: string
  templateData?: Record<string, unknown>
}

export async function sendTransactionalEmail(args: SendTransactionalEmailArgs) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('No session — must be signed in to send emails')

  const res = await fetch('/lovable/email/transactional/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(args),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Email send failed (${res.status}): ${text}`)
  }
  return res.json()
}
