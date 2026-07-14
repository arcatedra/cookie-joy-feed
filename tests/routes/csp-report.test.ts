/**
 * Integration tests for POST /api/public/csp-report.
 *
 * Verifies:
 *  1. Parseo — legacy `{ "csp-report": {...} }` y modernos `[{ type, body }]`.
 *  2. Persistencia — inserta en `csp_violations` con los campos esperados.
 *  3. Idempotencia por huella — segundo report con el mismo fingerprint
 *     hace UPDATE (occurrence_count++) en vez de crear una fila nueva.
 *  4. Fingerprints distintos crean filas distintas.
 *  5. Payloads inválidos / vacíos / oversize → 204 sin escribir DB.
 *  6. Directivas != style-src-attr no disparan alerta de email.
 *
 * Ejecutar: bunx vitest run tests/routes/csp-report.test.ts
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

process.env.SUPABASE_URL = 'https://fake.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-role-key'

// ── Fake Supabase client ────────────────────────────────────────────────────
type Row = Record<string, any>
const tables: Record<string, Row[]> = {
  csp_violations: [],
  user_roles: [], // empty → sendAlertToAdmins is a no-op after this
  suppressed_emails: [],
  email_send_log: [],
}
const rpcCalls: { name: string; args: unknown }[] = []
let nextId = 1

function resetState() {
  for (const k of Object.keys(tables)) tables[k] = []
  rpcCalls.length = 0
  nextId = 1
}

type Filter = { col: string; val: unknown }
function makeQuery(table: string) {
  const filters: Filter[] = []
  let selectMode = false
  let updatePayload: Row | null = null
  let insertPayload: Row | null = null

  const applyFilters = (rows: Row[]) =>
    rows.filter((r) => filters.every((f) => r[f.col] === f.val))

  const chain: any = {
    select: (_cols?: string) => {
      selectMode = true
      return chain
    },
    eq: (col: string, val: unknown) => {
      filters.push({ col, val })
      return chain
    },
    maybeSingle: async () => {
      const rows = applyFilters(tables[table] ?? [])
      return { data: rows[0] ?? null, error: null }
    },
    insert: (payload: Row) => {
      insertPayload = { id: `row-${nextId++}`, ...payload }
      tables[table] = tables[table] ?? []
      tables[table].push(insertPayload)
      return {
        select: () => ({
          single: async () => ({ data: insertPayload, error: null }),
        }),
        then: (resolve: (v: any) => void) =>
          resolve({ data: insertPayload, error: null }),
      }
    },
    update: (payload: Row) => {
      updatePayload = payload
      return {
        eq: (col: string, val: unknown) => {
          filters.push({ col, val })
          const rows = applyFilters(tables[table] ?? [])
          for (const r of rows) Object.assign(r, updatePayload)
          return Promise.resolve({ data: rows, error: null })
        },
      }
    },
    // fallback thenable in case awaited directly
    then: (resolve: (v: any) => void) => {
      if (selectMode) {
        resolve({ data: applyFilters(tables[table] ?? []), error: null })
      } else {
        resolve({ data: null, error: null })
      }
    },
  }
  return chain
}

const fakeClient = {
  from: (table: string) => makeQuery(table),
  rpc: async (name: string, args: unknown) => {
    rpcCalls.push({ name, args })
    return { data: null, error: null }
  },
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => fakeClient,
}))

// Avoid pulling the whole email registry (heavy React templates); the alert
// path only needs a component + subject.
vi.mock('@/lib/email-templates/registry', () => ({
  TEMPLATES: {
    'csp-violation-alert': {
      component: () => null,
      subject: 'CSP violation alert (test)',
    },
  },
}))

// ── Load route after mocks ──────────────────────────────────────────────────
const { Route } = await import('@/routes/api/public/csp-report')
const POST = (Route.options as any).server.handlers.POST as (ctx: {
  request: Request
}) => Promise<Response>

function post(body: unknown, opts: { raw?: boolean } = {}) {
  const payload = opts.raw ? (body as string) : JSON.stringify(body)
  return POST({
    request: new Request('http://localhost/api/public/csp-report', {
      method: 'POST',
      headers: { 'content-type': 'application/csp-report', 'user-agent': 'vitest' },
      body: payload,
    }),
  })
}

const legacyReport = (overrides: Partial<Row> = {}) => ({
  'csp-report': {
    'effective-directive': 'style-src-attr',
    'blocked-uri': 'inline',
    'source-file': 'https://hazorex.com/app.js',
    'line-number': 42,
    'column-number': 7,
    'document-uri': 'https://hazorex.com/',
    disposition: 'report',
    ...overrides,
  },
})

// ── Tests ───────────────────────────────────────────────────────────────────
beforeEach(() => resetState())

describe('POST /api/public/csp-report — parseo', () => {
  it('acepta el formato legacy `{ "csp-report": {...} }` y persiste una fila', async () => {
    const res = await post(legacyReport())
    expect(res.status).toBe(204)
    expect(tables.csp_violations).toHaveLength(1)
    const row = tables.csp_violations[0]
    expect(row.directive).toBe('style-src-attr')
    expect(row.blocked_uri).toBe('inline')
    expect(row.source_file).toBe('https://hazorex.com/app.js')
    expect(row.line_number).toBe(42)
    expect(row.column_number).toBe(7)
    expect(row.occurrence_count).toBe(1)
    expect(typeof row.fingerprint).toBe('string')
    expect(row.fingerprint.length).toBe(32)
  })

  it('acepta el formato Reporting API moderno (array de reports)', async () => {
    const res = await post([
      {
        type: 'csp-violation',
        body: {
          effectiveDirective: 'script-src-elem',
          blockedURL: 'https://evil.example/x.js',
          sourceFile: 'https://hazorex.com/page',
          lineNumber: 1,
          columnNumber: 1,
          documentURL: 'https://hazorex.com/page',
        },
      },
    ])
    expect(res.status).toBe(204)
    expect(tables.csp_violations).toHaveLength(1)
    expect(tables.csp_violations[0].directive).toBe('script-src-elem')
    expect(tables.csp_violations[0].blocked_uri).toBe('https://evil.example/x.js')
  })

  it('ignora entradas del array cuyo `type` no es "csp-violation"', async () => {
    const res = await post([{ type: 'other', body: { effectiveDirective: 'x' } }])
    expect(res.status).toBe(204)
    expect(tables.csp_violations).toHaveLength(0)
  })

  it('devuelve 204 sin escribir DB para JSON inválido', async () => {
    const res = await post('{not json', { raw: true })
    expect(res.status).toBe(204)
    expect(tables.csp_violations).toHaveLength(0)
  })

  it('devuelve 204 sin escribir DB para body vacío', async () => {
    const res = await post('', { raw: true })
    expect(res.status).toBe(204)
    expect(tables.csp_violations).toHaveLength(0)
  })

  it('descarta payloads > 16 KB', async () => {
    const huge = 'x'.repeat(17_000)
    const res = await post(huge, { raw: true })
    expect(res.status).toBe(204)
    expect(tables.csp_violations).toHaveLength(0)
  })
})

describe('POST /api/public/csp-report — idempotencia por huella', () => {
  it('la misma huella no crea filas duplicadas; incrementa occurrence_count', async () => {
    await post(legacyReport())
    await post(legacyReport())
    await post(legacyReport())

    expect(tables.csp_violations).toHaveLength(1)
    expect(tables.csp_violations[0].occurrence_count).toBe(3)
    expect(tables.csp_violations[0].last_seen_at).toBeTruthy()
  })

  it('huellas distintas (line/column diferentes) crean filas separadas', async () => {
    await post(legacyReport({ 'line-number': 1 }))
    await post(legacyReport({ 'line-number': 2 }))
    await post(legacyReport({ 'column-number': 99 }))

    expect(tables.csp_violations).toHaveLength(3)
    const prints = new Set(tables.csp_violations.map((r) => r.fingerprint))
    expect(prints.size).toBe(3)
  })

  it('la huella es determinista para el mismo input', async () => {
    await post(legacyReport())
    const fp1 = tables.csp_violations[0].fingerprint
    resetState()
    await post(legacyReport())
    expect(tables.csp_violations[0].fingerprint).toBe(fp1)
  })
})

describe('POST /api/public/csp-report — alertas', () => {
  it('directivas != style-src-attr NO disparan RPC de email', async () => {
    await post(legacyReport({ 'effective-directive': 'script-src' }))
    expect(rpcCalls.filter((c) => c.name === 'enqueue_email')).toHaveLength(0)
  })

  it('style-src-attr sin admins destinatarios no falla y persiste igual', async () => {
    const res = await post(legacyReport())
    expect(res.status).toBe(204)
    expect(tables.csp_violations).toHaveLength(1)
    // Sin admins en user_roles no se enqueua email:
    expect(rpcCalls.filter((c) => c.name === 'enqueue_email')).toHaveLength(0)
  })
})
