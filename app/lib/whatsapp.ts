import { Linking } from 'react-native'

import type { Order } from './api'
import { CONTACT } from './brand'
import { t } from './i18n'
import { money } from './money'

/**
 * The order written out for the shop's WhatsApp, as the website sends it.
 *
 * The order is already in the system when this is built, so the message
 * carries its code and the server's figures; WhatsApp is where the shop
 * confirms the time and the weights.
 */
export function orderMessage (order: Order): string {
  let msg = `${t('wa.intro')}\n\n${t('wa.code')}: ${order.code}\n\n`

  for (const item of order.items ?? []) {
    const qty = item.unit_kind === 'kg' ? `${item.qty} kg` : `× ${item.qty}`
    msg += `• ${item.name} — ${qty} = ${money(item.line_total_minor, order.currency)}\n`
  }

  if (order.discount_minor > 0) msg += `\n${t('sets.discount')}: −${money(order.discount_minor, order.currency)}`
  msg += `\n${t('wa.total')}: ${money(order.total_minor, order.currency)}`
  if (order.delivery_fee_minor > 0) msg += `\n${t('wa.deliv')}: ${money(order.delivery_fee_minor, order.currency)}`
  if (order.address_line) msg += `\n${t('wa.addr')}: ${order.address_line}`
  if (order.address_notes) msg += ` (${order.address_notes})`
  if (order.contact_name) msg += `\n${t('wa.name')}: ${order.contact_name}`
  if (order.contact_phone) msg += `\n${t('wa.phone')}: ${order.contact_phone}`

  return `${msg}\n\n${t('wa.outro')}`
}

/** Opens WhatsApp on the shop's number with the order filled in. Never throws:
 *  the order is placed whether or not WhatsApp opens. */
export async function sendOrderToWhatsApp (order: Order): Promise<boolean> {
  const url = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(orderMessage(order))}`
  try {
    await Linking.openURL(url)
    return true
  } catch {
    return false
  }
}
