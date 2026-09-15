import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShieldAlert, RefreshCw } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/admin/violaciones')({
  ssr: false,
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw redirect({ to: '/auth' })
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    })
    if (!isAdmin) throw redirect({ to: '/' })
  },
  head: () => ({
    meta: [
      { title: 'Intentos de compartir contactos — Admin Hazorex' },
      { name: 'description', content: 'Registro de mensajes bloqueados por intentar compartir números o contactos en el chat.' },
      { property: 'og:title', content: 'Intentos de compartir contactos — Admin Hazorex' },
      { property: 'og:description', content: 'Registro interno de mensajes bloqueados en el chat de pedidos.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: AdminViolacionesPage,
})

type Row = {
  id: string
  order_id: string | null
  user_id: string
  role: string
  texto_intentado: string
  created_at: string
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
}

function AdminViolacionesPage() {
  const q = useQuery({
    queryKey: ['policy-violations'],
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            order: (c: string, o: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: Row[] | null; error: { message: string } | null }>
            }
          }
        }
      })
        .from('policy_violations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw new Error(error.message)
      return data ?? []
    },
  })

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[#1e3a5f]">
          <ShieldAlert className="size-6 text-red-600" />
          Intentos de compartir contactos
        </h1>
        <Button variant="outline" size="sm" onClick={() => q.refetch()} disabled={q.isFetching}>
          <RefreshCw className={`mr-2 size-4 ${q.isFetching ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <p className="mb-6 text-sm text-muted-foreground">
        Mensajes que el sistema bloqueó por contener números de teléfono, correos o apps de contacto.
        Estos mensajes nunca se guardaron en el chat.
      </p>

      {q.isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
      {q.error && <p className="text-sm text-red-600">No se pudo cargar la lista.</p>}
      {q.data?.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No hay intentos registrados.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {q.data?.map((r) => (
          <Card key={r.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-medium">
                <Badge variant={r.role === 'driver' ? 'default' : 'secondary'}>
                  {r.role === 'driver' ? 'Repartidor' : 'Cliente'}
                </Badge>
                <span className="text-muted-foreground">{fmt(r.created_at)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="whitespace-pre-wrap break-words rounded-lg bg-muted px-3 py-2">
                {r.texto_intentado}
              </p>
              <p className="text-xs text-muted-foreground">
                Persona: {r.user_id}
                {r.order_id ? ` · Pedido: ${r.order_id}` : ''}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}
