import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  drawTime?: string
  prizeUsd?: string
  drawUrl?: string
}

const PreDrawNotification = ({
  drawTime = '8:00 PM ET',
  prizeUsd = '$0',
  drawUrl = 'https://www.hazorex.com/',
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>🎰 El sorteo gira en 5 minutos — entra a verlo en vivo</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Heading as="h1" style={brand}>HAZOREX ORIGEN</Heading>
        </Section>
        <Section style={card}>
          <Heading as="h2" style={h2}>🎰 ¡El sorteo gira en 5 minutos!</Heading>
          <Text style={text}>
            El sorteo diario de hoy gira a las <strong>{drawTime}</strong>. Entra ahora para ver el giro en vivo.
          </Text>
          <Text style={prize}>{prizeUsd}</Text>
          <Text style={small}>Premio acumulado de hoy</Text>
          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button href={drawUrl} style={btn}>VER EL GIRO EN VIVO</Button>
          </Section>
          <Hr style={hr} />
          <Text style={small}>
            Recibes este aviso porque tienes una cuenta en HAZOREX ORIGEN. Puedes desactivar
            los avisos del sorteo desde tu perfil en cualquier momento.
          </Text>
        </Section>
        <Text style={footer}>HAZOREX ORIGEN · soporte@hazorex.com</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PreDrawNotification,
  subject: '🎰 El sorteo gira en 5 minutos — entra ahora',
  displayName: 'Pre-Draw 5min Reminder',
  previewData: {
    drawTime: '8:00 PM ET',
    prizeUsd: '$250.00',
    drawUrl: 'https://www.hazorex.com/',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', color: '#1a1a1a' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '24px 16px' }
const brandBar = { padding: '8px 0 24px', textAlign: 'center' as const }
const brand = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '24px', letterSpacing: '0.18em', color: '#1e3a5f', margin: 0 }
const card = { backgroundColor: '#f4f1ea', borderRadius: '16px', padding: '28px 24px' }
const h2 = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '22px', color: '#1e3a5f', margin: '0 0 12px', textAlign: 'center' as const }
const text = { fontSize: '15px', lineHeight: '1.6', color: '#4a3525', margin: '0 0 12px', textAlign: 'center' as const }
const prize = { fontSize: '44px', fontWeight: 900, color: '#c9a35a', textAlign: 'center' as const, margin: '12px 0 0', letterSpacing: '0.02em' }
const btn = { backgroundColor: '#1e3a5f', color: '#ffffff', padding: '14px 28px', borderRadius: '10px', fontWeight: 700, textDecoration: 'none', letterSpacing: '0.08em', fontSize: '14px' }
const small = { fontSize: '12px', color: '#5a4a3a', lineHeight: '1.5', margin: '4px 0', textAlign: 'center' as const }
const hr = { borderColor: '#d9d2c2', margin: '18px 0' }
const footer = { fontSize: '11px', color: '#8a7a6a', textAlign: 'center' as const, margin: '16px 0 0' }
