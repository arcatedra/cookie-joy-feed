import React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text, Hr } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  driverName?: string
  reason?: string
  supportEmail?: string
}

const DriverRejected = ({
  driverName = 'Repartidor/a',
  reason = 'No se cumplen los requisitos actuales.',
  supportEmail = 'soporte@hazorex.com',
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Actualización sobre tu postulación como repartidor</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Heading as="h1" style={brand}>HAZOREX ORIGEN</Heading>
        </Section>
        <Section style={card}>
          <Heading as="h2" style={h2}>Sobre tu postulación</Heading>
          <Text style={text}>Hola {driverName},</Text>
          <Text style={text}>
            Revisamos tu postulación como repartidor y por ahora <strong>no podemos aprobarla</strong>.
          </Text>
          <Section style={reasonBox}>
            <Text style={reasonText}>{reason}</Text>
          </Section>
          <Hr style={hr} />
          <Text style={text}>
            Si quieres corregir la información o resubir documentos, escríbenos a{' '}
            <strong>{supportEmail}</strong> y con gusto revisaremos tu caso.
          </Text>
        </Section>
        <Text style={footer}>HAZOREX ORIGEN · {supportEmail}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DriverRejected,
  subject: 'Actualización sobre tu postulación como repartidor',
  displayName: 'Driver Rejected',
  previewData: {
    driverName: 'María',
    reason: 'La foto de la licencia no es legible.',
    supportEmail: 'soporte@hazorex.com',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', color: '#1a1a1a' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '24px 16px' }
const brandBar = { padding: '8px 0 24px', textAlign: 'center' as const }
const brand = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '24px', letterSpacing: '0.18em', color: '#1e3a5f', margin: 0 }
const card = { backgroundColor: '#f4f1ea', borderRadius: '16px', padding: '28px 24px' }
const h2 = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '22px', color: '#1e3a5f', margin: '0 0 12px' }
const text = { fontSize: '15px', lineHeight: '1.6', color: '#4a3525', margin: '0 0 12px' }
const reasonBox = { backgroundColor: '#fff', border: '1px solid #d9d2c2', borderRadius: '10px', padding: '14px 16px', margin: '12px 0' }
const reasonText = { fontSize: '14px', color: '#4a3525', margin: 0, fontStyle: 'italic' as const }
const hr = { borderColor: '#d9d2c2', margin: '18px 0' }
const footer = { fontSize: '11px', color: '#8a7a6a', textAlign: 'center' as const, margin: '16px 0 0' }
