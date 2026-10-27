/* A product's address on the website: /mehsul/{slug}.

   The server makes and keeps the real ones (App\Support\Slug) and sends them
   with the catalogue. This is the same rule for the bundled copy of the
   catalogue — the first paint, a customer with no signal, and the build's
   fallback when the API cannot be reached — so those links land on the same
   pages. Keep the two in step. */

const AZ = { ə: 'e', ı: 'i', ö: 'o', ü: 'u', ğ: 'g', ş: 's', ç: 'c' }

export function slugOf (text) {
  let s = String(text ?? '').toLowerCase()
  s = s.replace(/[əıöüğşç]/g, ch => AZ[ch])
  // What is left of the accents ("é", the dot "İ" leaves on its "i") goes.
  s = s.normalize('NFKD').replace(/[̀-ͯ]/g, '')
  s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  if (s.length > 80) {
    s = s.slice(0, 80)
    if (s.includes('-')) s = s.slice(0, s.lastIndexOf('-'))
  }
  return s
}

/* Slugs for a whole list, told apart the way the server does it: the unit
   label first ("burrata-pendiri-200-gr"), then a number. `name` and `unit`
   read the Azerbaijani name and unit label off one row; the rows should be in
   the shop's own order, which is the order the server assigned them in. */
export function assignSlugs (rows, name, unit) {
  const taken = new Set()
  return rows.map(row => {
    const base = slugOf(name(row)) || row.id
    let slug = base
    if (taken.has(slug)) {
      const u = slugOf(unit(row))
      slug = u && !taken.has(`${base}-${u}`) ? `${base}-${u}` : null
      for (let n = 2; !slug; n++) if (!taken.has(`${base}-${n}`)) slug = `${base}-${n}`
    }
    taken.add(slug)
    return slug
  })
}

/* The path of a product's page. Accepts either shape of product. */
export const productPath = p => `/mehsul/${p.slug || p.id}`

/* Category pages, /kataloq/{slug}. The server's own (App\Support\Slug::
   CATEGORY) wins once the catalogue arrives; this is the same table for the
   bundled copy. */
export const CATEGORY_SLUGS = {
  kuruler: 'kuru',
  smoked: 'hise-verilmis-baliq',
  fresh: 'teze-baliq',
  seafood: 'deniz-mehsullari',
  'avropa-pendirleri': 'avropa-pendirleri',
  cheese: 'pendir-ve-sud',
  poultry: 'toyuq-ve-et',
  souslar: 'souslar',
  pantry: 'xemir-ve-sirniyyat',
  diger: 'diger',
}
export const categorySlug = c => c.slug || CATEGORY_SLUGS[c.id] || slugOf(c.az ?? c.name?.az ?? '') || c.id
export const categoryPath = c => `/kataloq/${categorySlug(c)}`
