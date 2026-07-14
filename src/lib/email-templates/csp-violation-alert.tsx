import React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text, Hr, Link } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  directive?: string
  blocked?: string
  source?: string
  line?: number | string
  column?: number | string
  sample?: string
  documentUrl?: string
  userAgent?: string
  panelUrl?: string
  occurredAt?: string
}

const CspViolationAlert = ({
  directive = 'style-src-attr',
  blocked = '—',
  source = '—',
  line = '—',
  column = '—',
  sample = '',
  documentUrl = '—',
  userAgent = '—',
  panelUrl = 'https://www.origen.management/admin/csp-violations',
  occurredAt = new Date().toISOString(),
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Nueva violación CSP detectada: {directive}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={alertBar}>
          <Heading as="h1" style={brand}>🛡️ Nueva violación CSP</Heading>
        </Section>
        <Section style={card}>
          <Heading as="h2" style={h2}>Se detectó una nueva huella de violación</Heading>
          <Text style={text}>
            La política <strong>Content-Security-Policy</strong> registró una nueva violación en modo report-only.
            Solo se envía una alerta por huella cada 24 horas.
          </Text>
          <Hr style={hr} />
          <Text style={meta}>Directiva</Text>
          <Text style={metaValue}>{directive}</Text>
          <Text style={meta}>Recurso bloqueado</Text>
          <Text style={metaValue}>{blocked}</Text>
          <Text style={meta}>Origen</Text>
          <Text style={metaValue}>{source} : {String(line)} : {String(column)}</Text>
          {sample ? (<>
            <Text style={meta}>Muestra</Text>
            <Text style={metaValue}>{sample}</Text>
          </>) : null}
          <Text style={meta}>Documento</Text>
          <Text style={metaValue}>{documentUrl}</Text>
          <Text style={meta}>User-Agent</Text>
          <Text style={metaValue}>{userAgent}</Text>
          <Text style={meta}>Fecha</Text>
          <Text style={metaValue}>{occurredAt}</Text>
          <Hr style={hr} />
          <Text style={text}>
            Revisa todas las violaciones en el panel:{' '}
            <Link href={panelUrl} style={link}>{panelUrl}</Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CspViolationAlert,
  subject: (data: Record<string, any>) => `🛡️ Nueva violación CSP: ${data?.directive ?? 'style-src-attr'}`,
  displayName: 'Alerta de violación CSP',
  previewData: {
    directive: 'style-src-attr',
    blocked: 'inline',
    source: 'https://www.hazorex.com/ruleta',
    line: 42,
    column: 12,
    sample: 'transform: translateX(...)',
    documentUrl: 'https://www.hazorex.com/ruleta',
    userAgent: 'Mozilla/5.0',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { maxWidth: '600px', margin: '0 auto', padding: '24px' }
const alertBar = { backgroundColor: '#fef3c7', padding: '16px 20px', borderRadius: '8px', marginBottom: '16px' }
const brand = { color: '#92400e', margin: 0, fontSize: '20px' }
const card = { backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px' }
const h2 = { color: '#111827', fontSize: '18px', margin: '0 0 12px' }
const text = { color: '#374151', fontSize: '14px', lineHeight: '22px' }
const meta = { color: '#6b7280', fontSize: '12px', margin: '10px 0 2px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }
const metaValue = { color: '#111827', fontSize: '14px', margin: 0, wordBreak: 'break-all' as const }
const hr = { borderColor: '#e5e7eb', margin: '16px 0' }
const link = { color: '#2563eb', textDecoration: 'underline' }
