import { Linking } from 'react-native'

import type { Order } from './api'
import { CONTACT } from './brand'
import { getLang, t } from './i18n'
import { money } from './money'

const MONTHS = {
  az: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'],
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
} as const

/** "2026-11-20" as "20 noyabr" — what a person would write. */
function niceDate (iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  return `${Number(m[3])} ${MONTHS[getLang()][Number(m[2]) - 1]}`
}

/** 0.5 → "0.5", 2 → "2": no trailing zeroes, no comma. */
const plain = (n: number) => String(Math.round(n * 100) / 100)

/**
 * The order written out for the shop's WhatsApp, as the website sends it.
 *
 * Laid out so a long order can be read at a glance — a line per thing, an
 * emoji to find it by. By weight a line is "2 kq", never "1 kq × 2", and what
 * is not exact says so: ≈ on a weighed line and on the total, with the most
 * it can come to.
 *
 * The order is already in the system when this is built, so the message
 * carries its code and the server's figures; WhatsApp is where the shop
 * confirms the time and the weights.
 *
 * `tolerancePercent` is how far the scales may move a weighed line (the
 * server's weight_tolerance_percent), for the "at most" figure.
 */
export function orderMessage (order: Order, tolerancePercent = 10): string {
  const cur = order.currency
  // "AZN" in a message, as on the website: the ₼ sign is not on every phone's font.
  const money_ = (minor: number) => money(minor, cur).replace(/\s*₼$/, ' AZN')
  const items = order.items ?? []

  const out: string[] = [t('wa.intro'), '', `🧾 ${t('wa.code')}: ${order.code}`, '', `🛒 ${t('wa.items')}:`]

  for (const item of items) {
    const qty = item.is_weight_based
      ? `${plain(item.qty)} ${t('unit.kg')}`
      : `${plain(item.qty)} ${t('unit.pc')}`
    out.push(`• ${item.name} — ${qty} ${item.is_weight_based ? '≈' : '='} ${money_(item.line_total_minor)}`)
  }

  out.push('', `💰 ${t('wa.subtotal')}: ${money_(order.subtotal_minor)}`)
  if (order.delivery_fee_minor > 0) out.push(`🚚 ${t('wa.deliv')}: ${money_(order.delivery_fee_minor)}`)

  let sum = `✅ ${t('wa.sum')}: ${order.requires_weighing ? '≈ ' : ''}${money_(order.total_minor)}`
  if (order.requires_weighing) {
    const weighed = items.filter(i => i.is_weight_based).reduce((n, i) => n + i.line_total_minor, 0)
    const most = order.total_minor + Math.ceil(weighed * tolerancePercent / 100)
    sum += ` (${t('wa.weighed')} ${money_(most)})`
  }
  out.push(sum)

  const more: string[] = []
  if (order.delivery_date) {
    more.push(`📅 ${t('wa.date')}: ${niceDate(order.delivery_date)}${order.delivery_slot ? `, ${order.delivery_slot}` : ''}`)
  }
  more.push(`💳 ${t('wa.pay')}: ${order.payment_method === 'pos' ? t('checkout.pos') : t('checkout.cash')}`)
  if (order.address_line) {
    more.push(`📍 ${t('wa.addr')}: ${order.address_line}${order.address_notes ? ` (${order.address_notes})` : ''}`)
  }
  if (order.contact_name) more.push(`👤 ${t('wa.name')}: ${order.contact_name}`)
  if (order.contact_phone) more.push(`📞 ${t('wa.phone')}: ${order.contact_phone}`)
  if (order.note) more.push(`📝 ${t('wa.noteLabel')}: ${order.note}`)
  out.push('', ...more, '', t('wa.outro'))

  return out.join('\n')
}

/** Opens WhatsApp on the shop's number with the order filled in. Never throws:
 *  the order is placed whether or not WhatsApp opens. */
export async function sendOrderToWhatsApp (order: Order, tolerancePercent?: number): Promise<boolean> {
  const url = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(orderMessage(order, tolerancePercent))}`
  try {
    await Linking.openURL(url)
    return true
  } catch {
    return false
  }
}
