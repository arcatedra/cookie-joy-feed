import type { ComponentType } from 'react'
import { template as orderConfirmation } from './order-confirmation'
import { template as subscriptionConfirmation } from './subscription-confirmation'
import { template as adminNewOrder } from './admin-new-order'
import { template as adminNewSubscription } from './admin-new-subscription'
import { template as winnerNotification } from './winner-notification'
import { template as securityAlert } from './security-alert'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'order-confirmation': orderConfirmation,
  'subscription-confirmation': subscriptionConfirmation,
  'admin-new-order': adminNewOrder,
  'admin-new-subscription': adminNewSubscription,
  'winner-notification': winnerNotification,
}
