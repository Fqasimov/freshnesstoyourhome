/**
 * Money arrives from the API in minor units (qəpik) as integers and is only
 * ever formatted here. The app never computes a total: every figure a customer
 * sees came from the server, so the number on screen is the number that will
 * be charged.
 */
export function money (minor: number | null | undefined, currency = 'AZN'): string {
  if (minor === null || minor === undefined) return ''

  const sign = minor < 0 ? '-' : ''
  const abs = Math.abs(minor)
  const major = Math.floor(abs / 100)
  const cents = String(abs % 100).padStart(2, '0')

  // Grouped with a thin space rather than toLocaleString: Hermes ships a
  // trimmed ICU and cannot be relied on for an az locale.
  const grouped = String(major).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

  return `${sign}${grouped}.${cents} ${currency}`
}

/** Weights are carried to three decimals, matching the scales and the column. */
export function round3 (n: number): number {
  return Math.round(n * 1000) / 1000
}
