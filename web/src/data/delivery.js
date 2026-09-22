import { reactive } from 'vue'

/* Freshness To Your Home — delivery zones
   ------------------------------------------------------------------
   The shop's own price list for the fifty-one areas it covers, in the shop's
   own order: broadly cheapest first, city before the settlements around it.

   `fee` is a PAIR, [low, high], in whole manats. Half of these are quoted as
   a range rather than a number — Şüvəlan is 20-25, Biləcəri 7-8 — because the
   distance inside them varies enough that the shop will not commit to one
   figure until it knows the address. The server's delivery_zones table holds
   a single `fee_minor` per zone and cannot say that, which is why the range
   lives here, why delivery is quoted as its own line rather than folded into
   the total, and why a range reaches the shop as a range instead of as one of
   its ends. The courier settles it in the same reply that confirms weights.

   Equal low and high means a flat fee: [5, 5] is simply 5 AZN.

   Like the catalogue, this is the bundled copy rather than the last word.
   When the Zonalar tab carries real numbers, the fee the API quotes for a
   zone_id wins over anything written here.

   The Russian and English names are transliterations of the Azerbaijani,
   which is the form the shop itself uses. */

export const ZONES = reactive([
  { id: 'merkez',             fee: [5, 5],   az: 'Mərkəz (Sahil, 28 May, İçərişəhər)', ru: 'Центр (Сахил, 28 Мая, Ичеришехер)', en: 'City centre (Sahil, 28 May, Icherisheher)' },
  { id: 'nerimanov',          fee: [5, 5],   az: 'Nərimanov',          ru: 'Нариманов',          en: 'Narimanov' },
  { id: 'nesimi',             fee: [5, 5],   az: 'Nəsimi',             ru: 'Насими',             en: 'Nasimi' },
  { id: 'xetai',              fee: [5, 5],   az: 'Xətai',              ru: 'Хатаи',              en: 'Khatai' },
  { id: 'elmler-akademiyasi', fee: [5, 5],   az: 'Elmlər Akademiyası', ru: 'Академия наук',      en: 'Academy of Sciences' },
  { id: 'genclik',            fee: [5, 5],   az: 'Gənclik',            ru: 'Гянджлик',           en: 'Ganjlik' },
  { id: 'yasamal',            fee: [6, 6],   az: 'Yasamal',            ru: 'Ясамал',             en: 'Yasamal' },
  { id: 'ag-seher',           fee: [6, 6],   az: 'Ağ Şəhər',           ru: 'Белый город',        en: 'White City' },
  { id: 'bayil',              fee: [6, 6],   az: 'Bayıl',              ru: 'Баилово',            en: 'Bayil' },
  { id: 'kesle',              fee: [6, 6],   az: 'Keşlə',              ru: 'Кешля',              en: 'Keshla' },
  { id: 'binegedi',           fee: [6, 7],   az: 'Binəqədi',           ru: 'Бинагади',           en: 'Binagadi' },
  { id: 'badamdar',           fee: [6, 7],   az: 'Badamdar',           ru: 'Бадамдар',           en: 'Badamdar' },
  { id: 'nzs',                fee: [6, 7],   az: 'NZS',                ru: 'НЗС',                en: 'NZS' },
  { id: 'dernegul',           fee: [6, 7],   az: 'Dərnəgül',           ru: 'Дарнагюль',          en: 'Darnagul' },
  { id: 'hezi-aslanov',       fee: [7, 7],   az: 'Həzi Aslanov',       ru: 'Ази Асланов',        en: 'Hazi Aslanov' },
  { id: 'ehmedli',            fee: [7, 7],   az: 'Əhmədli',            ru: 'Ахмедлы',            en: 'Ahmadli' },
  { id: '8-ci-km',            fee: [7, 7],   az: '8-ci km',            ru: '8-й км',             en: '8th km' },
  { id: 'bilecari',           fee: [7, 8],   az: 'Biləcəri',           ru: 'Биладжари',          en: 'Bilajari' },
  { id: 'neftciler',          fee: [7, 8],   az: 'Neftçilər',          ru: 'Нефтчиляр',          en: 'Neftchilar' },
  { id: 'sabuncu',            fee: [7, 8],   az: 'Sabunçu',            ru: 'Сабунчу',            en: 'Sabunchu' },
  { id: 'xalqlar-dostlugu',   fee: [7, 8],   az: 'Xalqlar Dostluğu',   ru: 'Дружба народов',     en: 'Khalglar Dostlugu' },
  { id: 'gunesli',            fee: [7, 8],   az: 'Günəşli',            ru: 'Гюнешли',            en: 'Gunashli' },
  { id: 'koroglu-etrafi',     fee: [7, 8],   az: 'Koroğlu ətrafı',     ru: 'Район Кёроглу',      en: 'Koroghlu area' },
  { id: 'avtovagzal',         fee: [7, 8],   az: 'Avtovağzal',         ru: 'Автовокзал',         en: 'Bus station' },
  { id: 'bakixanov',          fee: [8, 10],  az: 'Bakıxanov (Razin)',  ru: 'Бакиханов (Разин)',  en: 'Bakikhanov (Razin)' },
  { id: 'yeni-gunesli',       fee: [8, 10],  az: 'Yeni Günəşli',       ru: 'Новый Гюнешли',      en: 'New Gunashli' },
  { id: 'sixov',              fee: [8, 10],  az: 'Şıxov',              ru: 'Шихово',             en: 'Shikhov' },
  { id: 'masazir',            fee: [10, 12], az: 'Masazır',            ru: 'Масазыр',            en: 'Masazir' },
  { id: 'sulutepe',           fee: [10, 12], az: 'Sulutəpə',           ru: 'Сулутепе',           en: 'Sulutapa' },
  { id: 'ramana',             fee: [10, 12], az: 'Ramana',             ru: 'Раманы',             en: 'Ramana' },
  { id: 'sederek-lokbatan',   fee: [10, 15], az: 'Sədərək / Lökbatan', ru: 'Сядяряк / Локбатан', en: 'Sadarak / Lokbatan' },
  { id: 'zabrat',             fee: [10, 15], az: 'Zabrat',             ru: 'Забрат',             en: 'Zabrat' },
  { id: 'mastaga',            fee: [10, 15], az: 'Maştağa',            ru: 'Маштага',            en: 'Mashtagha' },
  { id: 'hovsan',             fee: [10, 15], az: 'Hövsan',             ru: 'Гёвсан',             en: 'Hovsan' },
  { id: 'mehdiabad',          fee: [12, 15], az: 'Mehdiabad',          ru: 'Мехдиабад',          en: 'Mehdiabad' },
  { id: 'kurdexani',          fee: [12, 15], az: 'Kürdəxanı',          ru: 'Кюрдаханы',          en: 'Kurdakhani' },
  { id: 'xirdalan',           fee: [15, 15], az: 'Xırdalan',           ru: 'Хырдалан',           en: 'Khirdalan' },
  { id: 'qaradag',            fee: [15, 20], az: 'Qaradağ',            ru: 'Гарадаг',            en: 'Garadagh' },
  { id: 'pirsagi',            fee: [15, 20], az: 'Pirşağı',            ru: 'Пиршаги',            en: 'Pirshaghi' },
  { id: 'novxani',            fee: [15, 20], az: 'Novxanı',            ru: 'Новханы',            en: 'Novkhani' },
  { id: 'turkan',             fee: [15, 20], az: 'Türkan',             ru: 'Тюркян',             en: 'Turkan' },
  { id: 'qala',               fee: [15, 20], az: 'Qala',               ru: 'Гала',               en: 'Gala' },
  { id: 'sagan',              fee: [15, 20], az: 'Şağan',              ru: 'Шаган',              en: 'Shaghan' },
  { id: 'fatmayi',            fee: [18, 20], az: 'Fatmayı',            ru: 'Фатмаи',             en: 'Fatmayi' },
  { id: 'buzovna',            fee: [20, 20], az: 'Buzovna',            ru: 'Бузовна',            en: 'Buzovna' },
  { id: 'merdekan',           fee: [20, 20], az: 'Mərdəkan',           ru: 'Мардакян',           en: 'Mardakan' },
  { id: 'bilgeh',             fee: [20, 20], az: 'Bilgəh',             ru: 'Бильгя',             en: 'Bilgah' },
  { id: 'nardaran',           fee: [20, 20], az: 'Nardaran',           ru: 'Нардаран',           en: 'Nardaran' },
  { id: 'goradil',            fee: [20, 20], az: 'Goradil',            ru: 'Горадиль',           en: 'Goradil' },
  { id: 'suvelan',            fee: [20, 25], az: 'Şüvəlan',            ru: 'Шувелян',            en: 'Shuvalan' },
  { id: 'zire',               fee: [20, 25], az: 'Zirə',               ru: 'Зира',               en: 'Zira' },
])

export const zoneById = id => ZONES.find(z => z.id === id) || null

/* "5" for a flat fee, "15–20" for a range. An en dash, not a hyphen: this is
   a span of numbers, not a compound word. */
export const feeText = zone =>
  !zone ? '' : zone.fee[0] === zone.fee[1] ? `${zone.fee[0]}` : `${zone.fee[0]}–${zone.fee[1]}`
