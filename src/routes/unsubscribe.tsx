import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/unsubscribe')({
  component: UnsubscribePage,
  head: () => ({ meta: [{ title: 'Cancelar suscripción · OriGen' }] }),
})

type State = 'loading' | 'valid' | 'invalid' | 'already' | 'done' | 'error'

function UnsubscribePage() {
  const [state, setState] = useState<State>('loading')
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token')
    setToken(t)
    if (!t) { setState('invalid'); return }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(t)}`)
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
        <h1 className="font-display text-2xl text-primary tracking-widest mb-2">OriGen</h1>
        <h2 className="text-lg font-semibold mb-4">Cancelar suscripción de correo</h2>
        {state === 'loading' && <p className="text-muted-foreground">Cargando…</p>}
        {state === 'valid' && (
          <>
            <p className="text-muted-foreground mb-6">
              ¿Confirmas que deseas dejar de recibir correos de OriGen?
            </p>
            <button onClick={confirm} className="bg-primary text-primary-foreground rounded-full px-6 py-3 font-medium">
              Confirmar cancelación
            </button>
          </>
        )}
        {state === 'done' && <p className="text-muted-foreground">Listo. Ya no recibirás más correos.</p>}
        {state === 'already' && <p className="text-muted-foreground">Este correo ya estaba dado de baja.</p>}
        {state === 'invalid' && <p className="text-muted-foreground">Enlace inválido o expirado.</p>}
        {state === 'error' && <p className="text-destructive">Ocurrió un error. Inténtalo de nuevo.</p>}
      </div>
    </main>
  )
}
