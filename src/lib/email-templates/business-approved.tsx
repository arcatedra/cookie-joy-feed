import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  businessName?: string
  panelUrl?: string
}

const BusinessApproved = ({
  businessName = 'Tu negocio',
  panelUrl = 'https://www.hazorex.com/negocios/panel',
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu negocio fue aprobado en Hazorex</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Heading as="h1" style={brand}>HAZOREX</Heading>
        </Section>
        <Section style={card}>
          <Heading as="h2" style={h2}>🎉 {businessName} ya está aprobado</Heading>
          <Text style={text}>
            Tu solicitud fue <strong>aprobada</strong>. Ya puedes entrar a tu panel y subir tu
            catálogo: categorías, productos, fotos, precios y horario.
          </Text>
          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button href={panelUrl} style={btn}>SUBIR MI CATÁLOGO</Button>
          </Section>
          <Hr style={hr} />
          <Text style={small}>
            Tu tienda aparecerá en el directorio público cuando tenga al menos un producto disponible.
          </Text>
        </Section>
        <Text style={footer}>HAZOREX · soporte@hazorex.com</Text>
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#f5f5f5', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { margin: '0 auto', padding: '24px 0', maxWidth: '560px' }
const brandBar = { backgroundColor: '#1a0f0a', padding: '18px', borderRadius: '10px 10px 0 0', textAlign: 'center' as const }
const brand = { color: '#E6C35C', fontSize: '22px', margin: 0, letterSpacing: '2px' }
const card = { backgroundColor: '#ffffff', padding: '28px', borderRadius: '0 0 10px 10px' }
const h2 = { fontSize: '19px', color: '#1a0f0a', margin: '0 0 12px' }
const text = { fontSize: '15px', color: '#333', lineHeight: '24px' }
const small = { fontSize: '13px', color: '#666', lineHeight: '20px' }
const btn = { backgroundColor: '#1a0f0a', color: '#E6C35C', padding: '14px 26px', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none', fontSize: '14px' }
const hr = { borderColor: '#eee', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#999', textAlign: 'center' as const, marginTop: '16px' }

export const template: TemplateEntry = {
  component: BusinessApproved,
  subject: (data) => `Tu negocio ${data['businessName'] ?? ''} fue aprobado en Hazorex`.trim(),
  displayName: 'Negocio aprobado',
  previewData: { businessName: 'Mini Market La Esquina', panelUrl: 'https://www.hazorex.com/negocios/panel' },
}

export default BusinessApproved
