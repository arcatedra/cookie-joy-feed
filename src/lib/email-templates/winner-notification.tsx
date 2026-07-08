import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  winnerName?: string
  prizeUsd?: string
  drawDate?: string
  claimUrl?: string
  deadline?: string
}

const WinnerNotification = ({
  winnerName = 'Ganador/a',
  prizeUsd = '$0',
  drawDate = '',
  claimUrl = '#',
  deadline = '',
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>¡Felicidades! Ganaste el sorteo HAZOREX del {drawDate}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Heading as="h1" style={brand}>HAZOREX</Heading>
        </Section>
        <Section style={card}>
          <Heading as="h2" style={h2}>🎉 ¡Felicidades, {winnerName}!</Heading>
          <Text style={text}>
            Has sido seleccionado/a como ganador/a del sorteo diario del <strong>{drawDate}</strong>.
          </Text>
          <Text style={prize}>{prizeUsd}</Text>
          <Hr style={hr} />
          <Text style={text}>
            Para reclamar tu premio necesitas verificar tu identidad y completar el formulario W-9
            (requerido por el IRS para premios superiores a $600). Tienes hasta el{' '}
            <strong>{deadline}</strong> para completar tu reclamo.
          </Text>
          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button href={claimUrl} style={btn}>RECLAMAR MI PREMIO</Button>
          </Section>
          <Text style={small}>
            Si no reclamas tu premio antes de la fecha límite, el monto pasará automáticamente al
            pozo del próximo sorteo según las Reglas Oficiales.
          </Text>
          <Hr style={hr} />
          <Text style={small}>
            ¿Problemas con el enlace? Cópialo y pégalo en tu navegador: <br />
            <span style={url}>{claimUrl}</span>
          </Text>
        </Section>
        <Text style={footer}>HAZOREX · soporte@hazorex.com</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WinnerNotification,
  subject: '🎉 ¡Ganaste el sorteo HAZOREX!',
  displayName: 'Winner Notification',
  previewData: {
    winnerName: 'María',
    prizeUsd: '$250.00',
    drawDate: '2026-06-22',
    claimUrl: 'https://www.hazorex.com/claim/2026-06-22',
    deadline: '2026-07-06',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', color: '#1a1a1a' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '24px 16px' }
const brandBar = { padding: '8px 0 24px', textAlign: 'center' as const }
const brand = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '24px', letterSpacing: '0.18em', color: '#1e3a5f', margin: 0 }
const card = { backgroundColor: '#f4f1ea', borderRadius: '16px', padding: '28px 24px' }
const h2 = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '22px', color: '#1e3a5f', margin: '0 0 12px', textAlign: 'center' as const }
const text = { fontSize: '15px', lineHeight: '1.6', color: '#4a3525', margin: '0 0 12px' }
const prize = { fontSize: '40px', fontWeight: 900, color: '#c9a35a', textAlign: 'center' as const, margin: '12px 0', letterSpacing: '0.02em' }
const btn = { backgroundColor: '#1e3a5f', color: '#ffffff', padding: '14px 28px', borderRadius: '10px', fontWeight: 700, textDecoration: 'none', letterSpacing: '0.08em', fontSize: '14px' }
const small = { fontSize: '12px', color: '#5a4a3a', lineHeight: '1.5', margin: '8px 0' }
const url = { fontSize: '11px', color: '#1e3a5f', wordBreak: 'break-all' as const }
const hr = { borderColor: '#d9d2c2', margin: '18px 0' }
const footer = { fontSize: '11px', color: '#8a7a6a', textAlign: 'center' as const, margin: '16px 0 0' }
