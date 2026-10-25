/* The arithmetic behind a sale price, exactly as the server does it
   (backend/app/Support/Discount.php). Percentages are worked in hundredths of
   a percent as whole numbers — 16.4% is 1640 — so the page and the order can
   never disagree by a qəpik. Change one, change both. */

export const basisPoints = pct => Math.max(0, Math.min(10000, Math.round(Number(pct || 0) * 100)))

/* A price with a percentage off, rounded to the qəpik. */
export const percentOff = (minor, bp) => Math.round(minor * (10000 - bp) / 10000)

/* A part of a whole, scaled so the whole loses `off`: an amount off a set,
   shared across its products in proportion to their price. */
export const shareOf = (minor, whole, off) =>
  whole > 0 ? Math.round(minor * (whole - Math.max(0, Math.min(whole, off))) / whole) : minor

/* "16.4" and "16,4" are the same number to a shopkeeper. */
export const parseNum = v => Number(String(v ?? '').trim().replace(',', '.'))

/* What the badge says: "−16.4%" or "−2.50 ₼". `money` formats manats. */
export function badgeText (d, money) {
  if (!d) return ''
  return d.show === 'amount'
    ? `−${money(d.amount_minor / 100)} ₼`
    : `−${String(d.percent).replace(/\.0+$/, '')}%`
}
