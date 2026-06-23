import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import {
  getSecurityAuditLog,
  getCronStatus,
  getSoftDeleted,
  restoreSoftDeleted,
  getBackupInventory,
} from '@/lib/security.functions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShieldAlert, RefreshCw, Database, Clock, Trash2 } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/admin/security')({
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
    meta: [{ title: 'Panel de seguridad — Origen' }, { name: 'robots', content: 'noindex' }],
  }),
  component: AdminSecurityPage,
})

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium' })
}

function AdminSecurityPage() {
  const router = useRouter()
  const auditFn = useServerFn(getSecurityAuditLog)
  const cronFn = useServerFn(getCronStatus)
  const trashFn = useServerFn(getSoftDeleted)
  const backupsFn = useServerFn(getBackupInventory)
  const restoreFn = useServerFn(restoreSoftDeleted)

  const audit = useQuery({
    queryKey: ['security', 'audit'],
    queryFn: () => auditFn({ data: { limit: 50 } }),
  })
  const cron = useQuery({ queryKey: ['security', 'cron'], queryFn: () => cronFn() })
  const trash = useQuery({ queryKey: ['security', 'trash'], queryFn: () => trashFn() })
  const backups = useQuery({ queryKey: ['security', 'backups'], queryFn: () => backupsFn() })

  const [eventFilter, setEventFilter] = useState<'all' | 'bulk_delete_blocked' | 'bulk_delete_bypassed'>('all')

  const restore = useMutation({
    mutationFn: (input: { table: string; id: string }) => restoreFn({ data: input as any }),
    onSuccess: () => router.invalidate(),
  })

  const auditRows =
    (audit.data ?? []).filter((r: any) =>
      eventFilter === 'all' ? true : r.event === eventFilter,
    )

  const refresh = () => {
    audit.refetch()
    cron.refetch()
    trash.refetch()
    backups.refetch()
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="size-7 text-destructive" />
          <div>
            <h1 className="text-2xl font-bold">Panel de seguridad</h1>
            <p className="text-sm text-muted-foreground">
              Intentos de borrado bloqueados, estado de backups, tareas programadas y papelera.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="size-4 mr-2" /> Refrescar
        </Button>
      </div>

      {/* ── Audit log ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5" /> Intentos de borrado bloqueados
          </CardTitle>
          <div className="flex gap-1">
            {(['all', 'bulk_delete_blocked', 'bulk_delete_bypassed'] as const).map((k) => (
              <Button
                key={k}
                size="sm"
                variant={eventFilter === k ? 'default' : 'outline'}
                onClick={() => setEventFilter(k)}
              >
                {k === 'all' ? 'Todos' : k === 'bulk_delete_blocked' ? 'Bloqueados' : 'Permitidos'}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {audit.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : auditRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin eventos registrados. Esto es buena señal: nadie ha intentado un borrado masivo.
            </p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="py-2">Evento</th>
                    <th>Tabla</th>
                    <th className="text-right">Filas</th>
                    <th>Rol</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {auditRows.map((r: any) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2">
                        <Badge
                          variant={r.event === 'bulk_delete_blocked' ? 'destructive' : 'secondary'}
                        >
                          {r.event}
                        </Badge>
                      </td>
                      <td className="font-mono text-xs">{r.table_name}</td>
                      <td className="text-right font-mono">{r.row_count}</td>
                      <td className="text-xs">{r.actor_role ?? '—'}</td>
                      <td className="text-xs text-muted-foreground">{formatDate(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* ── Cron status ───────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5" /> Tareas programadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cron.isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : (cron.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin tareas registradas.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {(cron.data ?? []).map((j: any) => (
                  <li key={j.jobname} className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-xs truncate">{j.jobname}</div>
                      <div className="text-xs text-muted-foreground">{j.schedule}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant={j.last_status === 'succeeded' ? 'default' : 'secondary'}>
                        {j.last_status ?? 'nunca'}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDate(j.last_start)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ── Backups ───────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-5" /> Backups
            </CardTitle>
          </CardHeader>
          <CardContent>
            {backups.isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xs uppercase text-muted-foreground mb-1">Últimos 30 días</p>
                  <ul className="space-y-1 text-sm max-h-48 overflow-auto">
                    {(backups.data?.days ?? []).map((d: any) => (
                      <li key={d.date} className="flex justify-between font-mono text-xs">
                        <span>{d.date}</span>
                        <span className="text-muted-foreground">
                          {d.file_count} arch · {formatBytes(d.total_bytes)}
                          {d.file_count < 12 && (
                            <Badge variant="destructive" className="ml-2 text-[10px]">
                              incompleto
                            </Badge>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground mb-1">
                    Archivo semanal ({backups.data?.weekly?.length ?? 0})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(backups.data?.weekly ?? [])
                      .slice(0, 6)
                      .map((w: any) => w.name)
                      .join(', ') || 'Vacío'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Trash ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="size-5" /> Papelera (30 días)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trash.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : (trash.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Papelera vacía.</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="py-2">Tabla</th>
                    <th>Identificación</th>
                    <th>Borrado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(trash.data ?? []).map((r: any) => (
                    <tr key={`${r.table_name}-${r.id}`} className="border-b last:border-0">
                      <td className="py-2 font-mono text-xs">{r.table_name}</td>
                      <td className="text-xs">{r.label}</td>
                      <td className="text-xs text-muted-foreground">{formatDate(r.deleted_at)}</td>
                      <td className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={restore.isPending}
                          onClick={() => restore.mutate({ table: r.table_name, id: r.id })}
                        >
                          Restaurar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
