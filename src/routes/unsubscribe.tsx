import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'

export const Route = createFileRoute('/unsubscribe')({
  component: UnsubscribePage,
  head: () => ({ meta: [{ title: i18n.t('unsubscribe.metaTitle') }] }),
})

type State = 'loading' | 'valid' | 'invalid' | 'already' | 'done' | 'error'

function UnsubscribePage() {
  const { t } = useTranslation()
  const [state, setState] = useState<State>('loading')
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const tk = new URLSearchParams(window.location.search).get('token')
    setToken(tk)
    if (!tk) { setState('invalid'); return }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(tk)}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}))
        if (!r.ok) setState('invalid')
        else if (j.valid) setState('valid')
        else if (j.reason === 'already_unsubscribed') setState('already')
        else setState('invalid')
      })
      .catch(() => setState('error'))
  }, [])

  const confirm = async () => {
    if (!token) return
    setState('loading')
    try {
      const r = await fetch('/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const j = await r.json().catch(() => ({}))
      if (j.success) setState('done')
      else if (j.reason === 'already_unsubscribed') setState('already')
      else setState('error')
    } catch { setState('error') }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md bg-card rounded-2xl p-8 shadow-sm text-center">
        <h1 className="font-display text-2xl text-primary tracking-widest mb-2">AMYRAX</h1>
        <h2 className="text-lg font-semibold mb-4">{t('unsubscribe.heading')}</h2>
        {state === 'loading' && <p className="text-muted-foreground">{t('unsubscribe.loading')}</p>}
        {state === 'valid' && (
          <>
            <p className="text-muted-foreground mb-6">{t('unsubscribe.confirmQuestion')}</p>
            <button onClick={confirm} className="bg-primary text-primary-foreground rounded-full px-6 py-3 font-medium">
              {t('unsubscribe.confirmBtn')}
            </button>
          </>
        )}
        {state === 'done' && <p className="text-muted-foreground">{t('unsubscribe.done')}</p>}
        {state === 'already' && <p className="text-muted-foreground">{t('unsubscribe.already')}</p>}
        {state === 'invalid' && <p className="text-muted-foreground">{t('unsubscribe.invalid')}</p>}
        {state === 'error' && <p className="text-destructive">{t('unsubscribe.error')}</p>}
      </div>
    </main>
  )
}
