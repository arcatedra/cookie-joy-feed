import React from 'react'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr, Row, Column,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  customerName?: string
  orderNumber?: string
  orderTotal?: string
  items?: Array<{ name: string; quantity: number; price: string }>
}

const OrderConfirmation = ({
  customerName = 'Cliente',
  orderNumber = '—',
  orderTotal = '$0.00',
  items = [],
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu pedido en HAZOREX ha sido confirmado</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Heading as="h1" style={brand}>HAZOREX</Heading>
        </Section>
        <Section style={card}>
          <Heading as="h2" style={h2}>¡Gracias por tu pedido, {customerName}!</Heading>
          <Text style={text}>
            Hemos recibido tu pedido y comenzaremos a prepararlo con la dedicación y el cariño
            que distingue a HAZOREX.
          </Text>

          <Hr style={hr} />

          <Text style={meta}>Número de pedido</Text>
          <Text style={metaValue}>#{orderNumber}</Text>

          {items.length > 0 && (
            <>
              <Hr style={hr} />
              <Text style={meta}>Detalle</Text>
              {items.map((it, i) => (
                <Row key={i} style={itemRow}>
                  <Column style={itemName}>
                    {it.name} <span style={qty}>× {it.quantity}</span>
                  </Column>
                  <Column style={itemPrice}>{it.price}</Column>
                </Row>
              ))}
            </>
          )}

          <Hr style={hr} />
          <Row>
            <Column style={totalLabel}>Total</Column>
            <Column style={totalValue}>{orderTotal}</Column>
          </Row>
        </Section>

        <Text style={footer}>
          Te avisaremos por correo cuando tu pedido esté listo. Para cualquier consulta,
          responde a este mensaje.
        </Text>
        <Text style={footerSmall}>HAZOREX · origen.management</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OrderConfirmation,
  subject: 'Confirmación de tu pedido en HAZOREX',
  displayName: 'Order Confirmation (Customer)',
  previewData: {
    customerName: 'María',
    orderNumber: 'A-1042',
    orderTotal: '$24.50',
    items: [
      { name: 'Galletas Double Chocolate', quantity: 2, price: '$12.00' },
      { name: 'Galletas Avena & Canela', quantity: 1, price: '$6.00' },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', color: '#1a1a1a' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '24px 16px' }
const brandBar = { padding: '8px 0 24px', textAlign: 'center' as const }
const brand = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '28px', letterSpacing: '0.18em', color: '#1e3a8a', margin: 0 }
const card = { backgroundColor: '#f4f1ea', borderRadius: '16px', padding: '28px 24px' }
const h2 = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '20px', color: '#1a1a1a', margin: '0 0 12px' }
const text = { fontSize: '15px', lineHeight: '1.6', color: '#4a3525', margin: '0 0 8px' }
const meta = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: '#5a4a3a', margin: '0' }
const metaValue = { fontSize: '16px', color: '#1e3a8a', fontWeight: 600, margin: '4px 0 0' }
const itemRow = { padding: '6px 0' }
const itemName = { fontSize: '14px', color: '#1a1a1a' }
const qty = { color: '#5a4a3a' }
const itemPrice = { fontSize: '14px', textAlign: 'right' as const, color: '#1a1a1a', fontWeight: 500 }
const totalLabel = { fontSize: '14px', color: '#5a4a3a', textTransform: 'uppercase' as const, letterSpacing: '0.12em' }
const totalValue = { fontSize: '20px', textAlign: 'right' as const, color: '#1e3a8a', fontWeight: 700 }
const hr = { borderColor: '#d9d2c2', margin: '18px 0' }
const footer = { fontSize: '13px', color: '#5a4a3a', textAlign: 'center' as const, margin: '24px 0 6px' }
const footerSmall = { fontSize: '11px', color: '#8a7a6a', textAlign: 'center' as const, margin: 0 }
