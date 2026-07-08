import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  driverName?: string
  dashboardUrl?: string
}

const DriverApproved = ({
  driverName = 'Repartidor/a',
  dashboardUrl = 'https://www.hazorex.com/repartidor/dashboard',
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>¡Tu postulación como repartidor fue aprobada!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Heading as="h1" style={brand}>HAZOREX</Heading>
        </Section>
        <Section style={card}>
          <Heading as="h2" style={h2}>🎉 ¡Bienvenido/a al equipo, {driverName}!</Heading>
          <Text style={text}>
            Tu postulación como repartidor fue <strong>aprobada</strong>. Ya puedes acceder a tu
            panel para configurar tu disponibilidad y empezar a recibir pedidos.
          </Text>
          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button href={dashboardUrl} style={btn}>IR A MI PANEL</Button>
          </Section>
          <Hr style={hr} />
          <Text style={small}>
            Recuerda mantener tus documentos vigentes. Te avisaremos 30 días antes del vencimiento
            de tu licencia o seguro.
          </Text>
        </Section>
        <Text style={footer}>HAZOREX · soporte@hazorex.com</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DriverApproved,
  subject: '🎉 ¡Tu postulación como repartidor fue aprobada!',
  displayName: 'Driver Approved',
  previewData: {
    driverName: 'María',
    dashboardUrl: 'https://www.hazorex.com/repartidor/dashboard',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', color: '#1a1a1a' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '24px 16px' }
const brandBar = { padding: '8px 0 24px', textAlign: 'center' as const }
const brand = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '24px', letterSpacing: '0.18em', color: '#1e3a5f', margin: 0 }
const card = { backgroundColor: '#f4f1ea', borderRadius: '16px', padding: '28px 24px' }
const h2 = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '22px', color: '#1e3a5f', margin: '0 0 12px', textAlign: 'center' as const }
const text = { fontSize: '15px', lineHeight: '1.6', color: '#4a3525', margin: '0 0 12px' }
const btn = { backgroundColor: '#1e3a5f', color: '#ffffff', padding: '14px 28px', borderRadius: '10px', fontWeight: 700, textDecoration: 'none', letterSpacing: '0.08em', fontSize: '14px' }
const small = { fontSize: '12px', color: '#5a4a3a', lineHeight: '1.5', margin: '8px 0' }
const hr = { borderColor: '#d9d2c2', margin: '18px 0' }
const footer = { fontSize: '11px', color: '#8a7a6a', textAlign: 'center' as const, margin: '16px 0 0' }
