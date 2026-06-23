import React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text, Hr } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  tableName?: string
  rowCount?: number
  actorRole?: string
  occurredAt?: string
  panelUrl?: string
}

const SecurityAlert = ({
  tableName = '—',
  rowCount = 0,
  actorRole = 'unknown',
  occurredAt = new Date().toISOString(),
  panelUrl = 'https://www.origen.management/admin/security',
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Intento de borrado masivo bloqueado en {tableName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={alertBar}>
          <Heading as="h1" style={brand}>⚠️ Alerta de seguridad</Heading>
        </Section>
        <Section style={card}>
          <Heading as="h2" style={h2}>Borrado masivo bloqueado</Heading>
          <Text style={text}>
            El sistema bloqueó un intento de eliminar <strong>{rowCount}</strong>{' '}
            filas de la tabla <strong>{tableName}</strong>. El trigger anti-bulk-delete abortó la operación.
          </Text>
          <Hr style={hr} />
          <Text style={meta}>Tabla</Text>
          <Text style={metaValue}>{tableName}</Text>
          <Text style={meta}>Filas afectadas (rechazadas)</Text>
          <Text style={metaValue}>{rowCount}</Text>
          <Text style={meta}>Rol del actor</Text>
          <Text style={metaValue}>{actorRole}</Text>
          <Text style={meta}>Momento (UTC)</Text>
          <Text style={metaValue}>{occurredAt}</Text>
          <Hr style={hr} />
          <Text style={text}>
            Revisa el panel de seguridad en{' '}
            <a href={panelUrl} style={link}>{panelUrl}</a>{' '}
            para ver el registro completo y, si procede, investigar la fuente del intento.
          </Text>
          <Text style={textMuted}>
            Si fuiste tú haciendo mantenimiento legítimo, ignora este aviso. Cualquier
            otro caso debe tratarse como un posible incidente de seguridad.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SecurityAlert,
  subject: (data: Record<string, unknown>) =>
    `⚠️ Borrado masivo bloqueado en ${(data.tableName as string | undefined) ?? 'tabla'} (${data.rowCount ?? 0} filas)`,
  displayName: 'Alerta de seguridad — bulk delete',
  previewData: {
    tableName: 'profiles',
    rowCount: 1234,
    actorRole: 'service_role',
    occurredAt: new Date().toISOString(),
    panelUrl: 'https://www.origen.management/admin/security',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '560px' }
const alertBar = { backgroundColor: '#fef2f2', padding: '16px 20px', borderRadius: '8px', borderLeft: '4px solid #dc2626' }
const brand = { color: '#7f1d1d', margin: 0, fontSize: '20px' }
const card = { padding: '20px 0' }
const h2 = { color: '#111827', fontSize: '18px', margin: '0 0 12px' }
const text = { color: '#374151', fontSize: '14px', lineHeight: '20px', margin: '8px 0' }
const textMuted = { color: '#6b7280', fontSize: '12px', lineHeight: '18px', margin: '12px 0 0' }
const meta = { color: '#6b7280', fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '8px 0 2px' }
const metaValue = { color: '#111827', fontSize: '14px', fontWeight: 600, margin: '0 0 4px' }
const hr = { borderColor: '#e5e7eb', margin: '16px 0' }
const link = { color: '#2563eb', textDecoration: 'underline' }
