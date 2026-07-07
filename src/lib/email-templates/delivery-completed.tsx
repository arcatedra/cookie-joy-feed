import React from 'react'
import { Body, Container, Head, Heading, Html, Img, Preview, Section, Text, Hr } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  customerName?: string
  deliveryAddress?: string
  photoUrl?: string
  packageCode?: string
}

const DeliveryCompleted = ({
  customerName = '',
  deliveryAddress = '',
  photoUrl = '',
  packageCode = '',
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu pedido de HAZOREX fue entregado 📦</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Heading as="h1" style={brand}>HAZOREX ORIGEN</Heading>
        </Section>
        <Section style={card}>
          <Heading as="h2" style={h2}>¡Entrega completada! 📦</Heading>
          <Text style={text}>
            {customerName ? `Hola ${customerName},` : 'Hola,'}
          </Text>
          <Text style={text}>
            Tu pedido fue entregado en <strong>{deliveryAddress}</strong>, en el área común / lobby
            del edificio, siguiendo nuestras políticas de entrega segura.
          </Text>
          {packageCode && (
            <Text style={code}>Código de paquete: <strong>{packageCode}</strong></Text>
          )}
          {photoUrl && (
            <Section style={{ textAlign: 'center', margin: '20px 0' }}>
              <Text style={small}>Foto de confirmación:</Text>
              <Img src={photoUrl} alt="Foto de la entrega" style={photo} />
            </Section>
          )}
          <Hr style={hr} />
          <Text style={text}>Gracias por confiar en HAZOREX 🍪</Text>
        </Section>
        <Text style={footer}>HAZOREX ORIGEN · soporte@hazorex.com</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DeliveryCompleted,
  subject: '¡Tu pedido de HAZOREX fue entregado! 📦',
  displayName: 'Delivery Completed',
  previewData: {
    customerName: 'María',
    deliveryAddress: 'Calle 123, Torre A',
    photoUrl: 'https://placehold.co/480x320',
    packageCode: 'HZX-000123',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', color: '#1a1a1a' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '24px 16px' }
const brandBar = { padding: '8px 0 24px', textAlign: 'center' as const }
const brand = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '24px', letterSpacing: '0.18em', color: '#1e3a5f', margin: 0 }
const card = { backgroundColor: '#f4f1ea', borderRadius: '16px', padding: '28px 24px' }
const h2 = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '22px', color: '#1e3a5f', margin: '0 0 12px', textAlign: 'center' as const }
const text = { fontSize: '15px', lineHeight: '1.6', color: '#4a3525', margin: '0 0 12px' }
const code = { fontSize: '13px', color: '#4a3525', margin: '4px 0' }
const small = { fontSize: '12px', color: '#5a4a3a', margin: '0 0 8px' }
const photo = { maxWidth: '100%', height: 'auto', borderRadius: '12px', border: '1px solid #d9d2c2' }
const hr = { borderColor: '#d9d2c2', margin: '18px 0' }
const footer = { fontSize: '11px', color: '#8a7a6a', textAlign: 'center' as const, margin: '16px 0 0' }
