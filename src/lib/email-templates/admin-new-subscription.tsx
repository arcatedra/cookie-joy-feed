import React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text, Hr } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  customerName?: string
  customerEmail?: string
  planName?: string
  planPrice?: string
  deliveryDays?: string
  nextChargeDate?: string
  action?: 'created' | 'cancelled' | 'updated'
}

const labels: Record<string, string> = {
  created: 'Nueva suscripción',
  cancelled: 'Suscripción cancelada',
  updated: 'Suscripción actualizada',
}

const AdminNewSubscription = ({
  customerName = '—',
  customerEmail = '—',
  planName = '—',
  planPrice = '—',
  deliveryDays = '—',
  nextChargeDate = '—',
  action = 'created',
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>{labels[action]} en AMYRAX</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Heading as="h1" style={brand}>AMYRAX · Admin</Heading>
        </Section>
        <Section style={card}>
          <Heading as="h2" style={h2}>{labels[action]}</Heading>
          <Text style={text}>{customerName} · {customerEmail}</Text>

          <Hr style={hr} />
          <Text style={meta}>Plan</Text>
          <Text style={metaValue}>{planName} · {planPrice}</Text>

          <Hr style={hr} />
          <Text style={meta}>Días de entrega</Text>
          <Text style={metaValue}>{deliveryDays}</Text>

          <Hr style={hr} />
          <Text style={meta}>Próximo cobro</Text>
          <Text style={metaValue}>{nextChargeDate}</Text>
        </Section>
        <Text style={footerSmall}>Notificación interna · AMYRAX</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdminNewSubscription,
  subject: (d: Record<string, any>) => `${labels[d.action ?? 'created']} · ${d.customerName ?? ''}`,
  displayName: 'Subscription Alert (Admin)',
  previewData: {
    customerName: 'María Pérez',
    customerEmail: 'maria@example.com',
    planName: 'Plan Mensual',
    planPrice: '$15.00 / mes',
    deliveryDays: 'Lunes y Viernes',
    nextChargeDate: '15 de julio, 2026',
    action: 'created',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', color: '#1a1a1a' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '24px 16px' }
const brandBar = { padding: '8px 0 24px', textAlign: 'center' as const }
const brand = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '22px', letterSpacing: '0.18em', color: '#1e3a8a', margin: 0 }
const card = { backgroundColor: '#f4f1ea', borderRadius: '16px', padding: '28px 24px' }
const h2 = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '20px', color: '#1a1a1a', margin: '0 0 12px' }
const text = { fontSize: '15px', lineHeight: '1.6', color: '#4a3525', margin: '0 0 8px' }
const meta = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: '#5a4a3a', margin: 0 }
const metaValue = { fontSize: '16px', color: '#1e3a8a', fontWeight: 600, margin: '4px 0 0' }
const hr = { borderColor: '#d9d2c2', margin: '16px 0' }
const footerSmall = { fontSize: '11px', color: '#8a7a6a', textAlign: 'center' as const, margin: '16px 0 0' }
