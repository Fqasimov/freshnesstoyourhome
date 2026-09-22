import { reactive } from 'vue'

/* Freshness To Your Home — delivery zones
   ------------------------------------------------------------------
   The shop's own price list for the districts it delivers to.

   `fee` is a PAIR, [low, high], in whole manats. Six of these zones are
   quoted as a range rather than a number — Qaradağ is 15-20, Biləcəri is
   7-8 — because the distance inside those areas varies enough that the shop
   will not commit to one figure until it knows the address. The server's
   delivery_zones table holds a single `fee_minor` per zone and cannot say
   that, which is why the range lives here and the courier confirms the rest
   on WhatsApp, along with the weights.

   Equal low and high means a flat fee: [5, 5] is simply 5 AZN.

   Like the catalogue, treat this as the bundled copy rather than the last
   word. When the Zonalar tab in the admin panel carries real numbers, the
   fee that the API quotes for a zone_id wins over anything written here. */

export const ZONES = reactive([
  { id: 'ag-seher',           fee: [6, 6],   az: 'Ağ Şəhər',            ru: 'Белый город',        en: 'White City' },
  { id: 'bayil',              fee: [6, 6],   az: 'Bayıl',               ru: 'Баилово',            en: 'Bayil' },
  { id: 'bilecari',           fee: [7, 8],   az: 'Biləcəri',            ru: 'Биладжари',          en: 'Bilajari' },
  { id: 'binegedi',           fee: [6, 6],   az: 'Binəqədi',            ru: 'Бинагади',           en: 'Binagadi' },
  { id: 'bilgeh-nardaran',    fee: [20, 20], az: 'Bilgəh - Nardaran',   ru: 'Бильгя - Нардаран',  en: 'Bilgah - Nardaran' },
  { id: 'elmler-akademiyasi', fee: [5, 5],   az: 'Elmlər Akademiyası',  ru: 'Академия наук',      en: 'Academy of Sciences' },
  { id: 'genclik',            fee: [5, 5],   az: 'Gənclik',             ru: 'Гянджлик',           en: 'Ganjlik' },
  { id: 'hezi-aslanov',       fee: [6, 7],   az: 'Həzi Aslanov',        ru: 'Ази Асланов',        en: 'Hazi Aslanov' },
  { id: 'merkez',             fee: [5, 5],   az: 'Mərkəz',              ru: 'Центр',              en: 'City centre' },
  { id: 'merdekan-suvelan',   fee: [15, 20], az: 'Mərdəkan - Şüvəlan',  ru: 'Мардакян - Шувелян', en: 'Mardakan - Shuvalan' },
  { id: 'mesteqa-zabrat',     fee: [10, 15], az: 'Məştəğa - Zabrat',    ru: 'Маштага - Забрат',   en: 'Mashtaga - Zabrat' },
  { id: 'nerimanov',          fee: [5, 5],   az: 'Nərimanov',           ru: 'Нариманов',          en: 'Narimanov' },
  { id: 'nesimi',             fee: [5, 5],   az: 'Nəsimi',              ru: 'Насими',             en: 'Nasimi' },
  { id: 'neftciler',          fee: [7, 8],   az: 'Neftçilər',           ru: 'Нефтчиляр',          en: 'Neftchilar' },
  { id: 'qaradag',            fee: [15, 20], az: 'Qaradağ',             ru: 'Гарадаг',            en: 'Garadagh' },
  { id: 'yasamal',            fee: [6, 6],   az: 'Yasamal',             ru: 'Ясамал',             en: 'Yasamal' },
  { id: 'sabuncu',            fee: [7, 8],   az: 'Sabunçu',             ru: 'Сабунчу',            en: 'Sabunchu' },
  { id: 'xetai',              fee: [5, 5],   az: 'Xətai',               ru: 'Хатаи',              en: 'Khatai' },
  { id: 'xirdalan',           fee: [15, 15], az: 'Xırdalan',            ru: 'Хырдалан',           en: 'Khirdalan' },
])

export const zoneById = id => ZONES.find(z => z.id === id) || null

/* "5" for a flat fee, "15–20" for a range. An en dash, not a hyphen: this is
   a span of numbers, not a compound word. */
export const feeText = zone =>
  !zone ? '' : zone.fee[0] === zone.fee[1] ? `${zone.fee[0]}` : `${zone.fee[0]}–${zone.fee[1]}`
