import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

async function requireAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc('has_role', {
    _user_id: ctx.userId,
    _role: 'admin',
  })
  if (error || !data) throw new Error('FORBIDDEN')
}

export const getSecurityAuditLog = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number }) => input ?? {})
  .handler(async ({ data, context }) => {
    await requireAdmin(context)
    const limit = Math.min(Math.max(data?.limit ?? 50, 1), 200)
    const { data: rows, error } = await context.supabase
      .from('security_audit_log')
      .select('id, event, table_name, row_count, actor_role, actor_uid, details, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw new Error(error.message)
    return rows ?? []
  })

export const getCronStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context)
    const { data, error } = await context.supabase.rpc('cron_status')
    if (error) throw new Error(error.message)
    return data ?? []
  })

export const getSoftDeleted = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context)
    const { data, error } = await context.supabase.rpc('list_soft_deleted', { p_limit: 200 })
    if (error) throw new Error(error.message)
    return data ?? []
  })

export const restoreSoftDeleted = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { table: string; id: string }) =>
    z
      .object({
        table: z.enum(['profiles', 'donations', 'subscriptions', 'winner_claims']),
        id: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context)
    const { data: ok, error } = await context.supabase.rpc('restore_row', {
      p_table: data.table,
      p_id: data.id,
    })
    if (error) throw new Error(error.message)
    return { restored: Boolean(ok) }
  })

export const getBackupInventory = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data: rootEntries, error: listErr } = await supabaseAdmin.storage
      .from('backups')
      .list('', { limit: 1000, sortBy: { column: 'name', order: 'desc' } })
    if (listErr) throw new Error(listErr.message)

    const dateRe = /^\d{4}-\d{2}-\d{2}$/
    const dayFolders = (rootEntries ?? []).filter((e) => dateRe.test(e.name)).slice(0, 30)
    const days = await Promise.all(
      dayFolders.map(async (f) => {
        const { data: files } = await supabaseAdmin.storage
          .from('backups')
          .list(f.name, { limit: 100 })
        const totalBytes = (files ?? []).reduce(
          (n, fi) => n + (fi.metadata?.size ?? 0),
          0,
        )
        return {
          date: f.name,
          file_count: files?.length ?? 0,
          total_bytes: totalBytes,
        }
      }),
    )

    const { data: weeklyEntries } = await supabaseAdmin.storage
      .from('backups')
      .list('weekly', { limit: 200, sortBy: { column: 'name', order: 'desc' } })

    return {
      days,
      weekly: (weeklyEntries ?? []).map((w) => ({ name: w.name })),
    }
  })
