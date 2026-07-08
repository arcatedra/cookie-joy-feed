import React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text, Hr, Row, Column } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  orderNumber?: string
  customerName?: string
  customerEmail?: string
  orderTotal?: string
  items?: Array<{ name: string; quantity: number; price: string }>
  shippingAddress?: string
  notes?: string
}

const AdminNewOrder = ({
  orderNumber = '—',
  customerName = '—',
  customerEmail = '—',
  orderTotal = '$0.00',
  items = [],
  shippingAddress,
  notes,
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Nuevo pedido #{orderNumber} en HAZOREX</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Heading as="h1" style={brand}>HAZOREX · Admin</Heading>
        </Section>
        <Section style={card}>
          <Heading as="h2" style={h2}>Nuevo pedido recibido</Heading>
          <Text style={text}>Pedido <strong>#{orderNumber}</strong> por <strong>{orderTotal}</strong></Text>

          <Hr style={hr} />
          <Text style={meta}>Cliente</Text>
          <Text style={metaValue}>{customerName}</Text>
          <Text style={metaSub}>{customerEmail}</Text>

          {shippingAddress && (
            <>
              <Hr style={hr} />
              <Text style={meta}>Dirección de envío</Text>
              <Text style={metaSub}>{shippingAddress}</Text>
            </>
          )}

          {items.length > 0 && (
            <>
              <Hr style={hr} />
              <Text style={meta}>Productos</Text>
              {items.map((it, i) => (
                <Row key={i} style={{ padding: '4px 0' }}>
                  <Column style={itemName}>{it.name} × {it.quantity}</Column>
                  <Column style={itemPrice}>{it.price}</Column>
                </Row>
              ))}
            </>
          )}

          {notes && (
            <>
              <Hr style={hr} />
              <Text style={meta}>Notas del cliente</Text>
              <Text style={metaSub}>{notes}</Text>
            </>
          )}

          <Hr style={hr} />
          <Row>
            <Column style={totalLabel}>Total</Column>
            <Column style={totalValue}>{orderTotal}</Column>
          </Row>
        </Section>
        <Text style={footerSmall}>Notificación interna · HAZOREX</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdminNewOrder,
  subject: (d: Record<string, any>) => `Nuevo pedido #${d.orderNumber ?? '—'} · ${d.orderTotal ?? ''}`,
  displayName: 'New Order Alert (Admin)',
  previewData: {
    orderNumber: 'A-1042',
    customerName: 'María Pérez',
    customerEmail: 'maria@example.com',
    orderTotal: '$24.50',
    items: [
      { name: 'Galletas Double Chocolate', quantity: 2, price: '$12.00' },
      { name: 'Galletas Avena & Canela', quantity: 1, price: '$6.00' },
    ],
    shippingAddress: 'Calle Principal 123, Ciudad',
    notes: 'Tocar al timbre con cuidado, perro asustadizo.',
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
const metaSub = { fontSize: '14px', color: '#4a3525', margin: '2px 0 0' }
const itemName = { fontSize: '14px', color: '#1a1a1a' }
const itemPrice = { fontSize: '14px', textAlign: 'right' as const, fontWeight: 500 }
const totalLabel = { fontSize: '14px', color: '#5a4a3a', textTransform: 'uppercase' as const, letterSpacing: '0.12em' }
const totalValue = { fontSize: '20px', textAlign: 'right' as const, color: '#1e3a8a', fontWeight: 700 }
const hr = { borderColor: '#d9d2c2', margin: '16px 0' }
const footerSmall = { fontSize: '11px', color: '#8a7a6a', textAlign: 'center' as const, margin: '16px 0 0' }
