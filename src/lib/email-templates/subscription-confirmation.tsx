import React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text, Hr } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  customerName?: string
  planName?: string
  planPrice?: string
  deliveryDays?: string
  nextChargeDate?: string
}

const SubscriptionConfirmation = ({
  customerName = 'Cliente',
  planName = 'Plan HAZOREX',
  planPrice = '$15.00 / mes',
  deliveryDays = 'Lunes y Viernes',
  nextChargeDate = '—',
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu suscripción a HAZOREX está activa</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Heading as="h1" style={brand}>HAZOREX</Heading>
        </Section>
        <Section style={card}>
          <Heading as="h2" style={h2}>Bienvenido al club, {customerName}</Heading>
          <Text style={text}>
            Tu suscripción está activa. Cada entrega se preparará con cuidado para que
            llegue fresca a tu puerta.
          </Text>

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

        <Text style={footer}>
          Puedes gestionar o cancelar tu suscripción en cualquier momento desde tu cuenta.
        </Text>
        <Text style={footerSmall}>HAZOREX · origen.management</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SubscriptionConfirmation,
  subject: 'Tu suscripción a HAZOREX está activa',
  displayName: 'Subscription Confirmation (Customer)',
  previewData: {
    customerName: 'María',
    planName: 'Plan Mensual',
    planPrice: '$15.00 / mes',
    deliveryDays: 'Lunes y Viernes',
    nextChargeDate: '15 de julio, 2026',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', color: '#1a1a1a' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '24px 16px' }
const brandBar = { padding: '8px 0 24px', textAlign: 'center' as const }
const brand = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '28px', letterSpacing: '0.18em', color: '#1e3a8a', margin: 0 }
const card = { backgroundColor: '#f4f1ea', borderRadius: '16px', padding: '28px 24px' }
const h2 = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '20px', color: '#1a1a1a', margin: '0 0 12px' }
const text = { fontSize: '15px', lineHeight: '1.6', color: '#4a3525', margin: '0 0 8px' }
const meta = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: '#5a4a3a', margin: 0 }
const metaValue = { fontSize: '16px', color: '#1e3a8a', fontWeight: 600, margin: '4px 0 0' }
const hr = { borderColor: '#d9d2c2', margin: '18px 0' }
const footer = { fontSize: '13px', color: '#5a4a3a', textAlign: 'center' as const, margin: '24px 0 6px' }
const footerSmall = { fontSize: '11px', color: '#8a7a6a', textAlign: 'center' as const, margin: 0 }
