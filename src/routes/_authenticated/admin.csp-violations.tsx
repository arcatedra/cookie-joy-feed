import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShieldAlert, RefreshCw, BellRing } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/_authenticated/admin/csp-violations')({
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
      { title: 'Violaciones CSP — Admin' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: AdminCspViolationsPage,
})

type Row = {
  id: string
  fingerprint: string
  directive: string
  blocked_uri: string | null
  source_file: string | null
  line_number: number | null
  column_number: number | null
  sample: string | null
  document_url: string | null
  user_agent: string | null
  occurrence_count: number
  first_seen_at: string
  last_seen_at: string
  last_alert_sent_at: string | null
}

function fmt(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium' })
}

function AdminCspViolationsPage() {
  const [directiveFilter, setDirectiveFilter] = useState<'all' | 'style-src-attr'>('all')

  const q = useQuery({
    queryKey: ['csp-violations', directiveFilter],
    queryFn: async () => {
      let query = supabase
        .from('csp_violations')
        .select('*')
        .order('last_seen_at', { ascending: false })
        .limit(200)
      if (directiveFilter === 'style-src-attr') {
        query = query.ilike('directive', '%style-src-attr%')
      }
      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as unknown as Row[]
    },
  })

  const rows = q.data ?? []
  const totalOccurrences = rows.reduce((s, r) => s + (r.occurrence_count ?? 0), 0)
  const styleSrcAttrCount = rows.filter((r) => r.directive.includes('style-src-attr')).length
  const alertedCount = rows.filter((r) => r.last_alert_sent_at).length

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <ShieldAlert className="w-6 h-6 text-amber-600" />
        <h1 className="text-2xl font-bold">Violaciones CSP</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => q.refetch()}
          className="ml-auto"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Huellas únicas</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{rows.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ocurrencias totales</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalOccurrences}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">style-src-attr</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-amber-600">{styleSrcAttrCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><BellRing className="w-3 h-3" /> Alertadas</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{alertedCount}</p></CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={directiveFilter === 'all' ? 'default' : 'outline'}
          onClick={() => setDirectiveFilter('all')}
        >Todas</Button>
        <Button
          size="sm"
          variant={directiveFilter === 'style-src-attr' ? 'default' : 'outline'}
          onClick={() => setDirectiveFilter('style-src-attr')}
        >Solo style-src-attr</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Historial (últimas 200)</CardTitle></CardHeader>
        <CardContent className="p-0">
          {q.isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Cargando…</p>
          ) : rows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Sin violaciones registradas 🎉</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="p-3">Directiva</th>
                    <th className="p-3">Recurso</th>
                    <th className="p-3">Origen</th>
                    <th className="p-3">Ocurrencias</th>
                    <th className="p-3">Primera vez</th>
                    <th className="p-3">Última vez</th>
                    <th className="p-3">Última alerta</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t align-top">
                      <td className="p-3">
                        <Badge variant={r.directive.includes('style-src-attr') ? 'default' : 'secondary'}>
                          {r.directive}
                        </Badge>
                      </td>
                      <td className="p-3 max-w-[220px] truncate" title={r.blocked_uri ?? ''}>{r.blocked_uri ?? '—'}</td>
                      <td className="p-3 max-w-[260px] break-all text-xs text-muted-foreground">
                        {r.source_file ?? '—'}
                        {r.line_number != null ? `:${r.line_number}` : ''}
                        {r.column_number != null ? `:${r.column_number}` : ''}
                      </td>
                      <td className="p-3 font-mono">{r.occurrence_count}</td>
                      <td className="p-3 text-xs">{fmt(r.first_seen_at)}</td>
                      <td className="p-3 text-xs">{fmt(r.last_seen_at)}</td>
                      <td className="p-3 text-xs">
                        {r.last_alert_sent_at ? (
                          <span className="inline-flex items-center gap-1 text-amber-600">
                            <BellRing className="w-3 h-3" />
                            {fmt(r.last_alert_sent_at)}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Las alertas por email se envían a todos los administradores en la primera detección de cada huella nueva
        de <code>style-src-attr</code> y, tras ese envío, como máximo una vez cada 24h por huella.
      </p>
    </div>
  )
}
