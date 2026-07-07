import React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text, Hr } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  driverName?: string
  referenceId?: string
  supportEmail?: string
}

const DriverApplicationReceived = ({
  driverName = 'Repartidor/a',
  referenceId = '—',
  supportEmail = 'soporte@hazorex.com',
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Recibimos tu postulación como repartidor de Hazorex</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Heading as="h1" style={brand}>HAZOREX</Heading>
        </Section>
        <Section style={card}>
          <Heading as="h2" style={h2}>¡Recibimos tu postulación, {driverName}!</Heading>
          <Text style={text}>
            Gracias por querer sumarte al equipo de repartidores de <strong>Hazorex</strong>.
            Ya tenemos tu solicitud y estamos revisando tus documentos.
          </Text>

          <Section style={refBox}>
            <Text style={refLabel}>Número de referencia</Text>
            <Text style={refValue}>{referenceId}</Text>
          </Section>

          <Text style={text}>
            Te contactaremos por este mismo correo en un plazo <strong>máximo de 48 horas</strong>{' '}
            para confirmar el resultado o pedirte información adicional.
          </Text>

          <Hr style={hr} />

          <Text style={small}>
            <strong>Sobre tus documentos:</strong> se usan únicamente para verificar tu identidad
            y elegibilidad como repartidor. Se almacenan de forma cifrada y sólo el equipo de
            verificación tiene acceso. Puedes solicitar su eliminación en cualquier momento
            escribiendo a {supportEmail}.
          </Text>
        </Section>
        <Text style={footer}>HAZOREX · {supportEmail}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DriverApplicationReceived,
  subject: 'Recibimos tu postulación como repartidor · Hazorex',
  displayName: 'Driver Application Received',
  previewData: {
    driverName: 'María',
    referenceId: 'HZX-DRV-A1B2C3',
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
const small = { fontSize: '12px', lineHeight: '1.5', color: '#6a5a4a', margin: '0' }
const refBox = { backgroundColor: '#fff', border: '1px solid #d9d2c2', borderRadius: '10px', padding: '14px 16px', margin: '16px 0', textAlign: 'center' as const }
const refLabel = { fontSize: '11px', color: '#8a7a6a', margin: '0 0 4px', textTransform: 'uppercase' as const, letterSpacing: '0.12em' }
const refValue = { fontSize: '20px', color: '#1e3a5f', fontFamily: '"Cinzel", Georgia, serif', margin: 0, letterSpacing: '0.08em' }
const hr = { borderColor: '#d9d2c2', margin: '18px 0' }
const footer = { fontSize: '11px', color: '#8a7a6a', textAlign: 'center' as const, margin: '16px 0 0' }
