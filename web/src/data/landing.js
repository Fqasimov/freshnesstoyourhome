/**
 * Pages written for the words people type into a search box.
 *
 * Each has its own address, title, heading, a few honest paragraphs and the
 * products that fit, so a search for "skumbriya" or "hisə verilmiş balıq" has a
 * page that is about exactly that to land on — instead of the one front page
 * having to answer for every query at once. Copy is in all three languages;
 * the page shows the visitor's, and a line of the other two names the goods
 * for people who search in Russian or English.
 *
 * Nothing here states a price or a promise the shop does not keep: prices come
 * from the live catalogue and the delivery terms are the ones on the front page.
 */
const DELIVERY = {
  az: 'Bakı və Bakı ətrafına hər gün 10:00–22:00 çatdırılma. Sifarişi bir gün əvvəldən qəbul edirik.',
  ru: 'Доставка по Баку и пригороду ежедневно с 10:00 до 22:00. Заказы принимаем за день.',
  en: 'Delivery across Baku and its outskirts every day, 10:00–22:00. We take orders a day ahead.',
}

export const LANDING = [
  {
    path: '/skumbriya',
    name: 'skumbriya',
    test: p => /skumbriya|mackerel|скумбри/i.test(`${p.az} ${p.en} ${p.ru}`),
    title: 'Skumbriya — hisə verilmiş skumbriya və skumbriya filesi, Bakı | Freshness To Your Home',
    desc: 'Hisə verilmiş skumbriya və skumbriya filesi onlayn sifariş, Bakıya çatdırılma. Копчёная скумбрия, smoked mackerel — qiymətlər AZN ilə, 1 kq və ədəd ilə.',
    h1: { az: 'Skumbriya — hisə verilmiş skumbriya və filesi', ru: 'Скумбрия — копчёная скумбрия и филе', en: 'Mackerel — smoked mackerel and fillets' },
    also: 'Копчёная скумбрия · скумбрия Баку · smoked mackerel · mackerel fish · skumbriya balığı',
    text: {
      az: [
        'Skumbriya yağlı, dadlı və omeqa-3 ilə zəngin balıqdır. Burada onu bütöv hisə verilmiş və fileyə hazır şəkildə sifariş edə bilərsiniz — səhər yeməyi, qəlyanaltı, salat və ya sendviç üçün.',
        'Hisə verilmiş skumbriya soyuq masa üçün də, pivə yanında qəlyanaltı kimi də uyğundur. Qiymət məhsulun üzərində AZN ilə göstərilir; kq ilə satılan məhsulda çəkini özünüz yazırsınız.',
      ],
      ru: [
        'Скумбрия — жирная вкусная рыба, богатая омега-3. У нас её можно заказать копчёной целиком или готовым филе — на завтрак, к пиву, в салат или бутерброд.',
        'Цена указана в манатах; для товаров на вес вы сами вводите нужный вес.',
      ],
      en: [
        'Mackerel is an oily, flavourful fish rich in omega-3. Order it smoked whole or as ready fillets — for breakfast, a beer snack, a salad or a sandwich.',
        'Prices are in AZN; for goods sold by the kilo you type the weight you want.',
      ],
    },
    faq: [
      { q: { az: 'Hisə verilmiş skumbriyanı Bakıda necə sifariş etmək olar?', ru: 'Как заказать копчёную скумбрию в Баку?', en: 'How do I order smoked mackerel in Baku?' },
        a: { az: 'Məhsulu səbətə atın, ad, telefon və ərazini yazın — sifariş bizə düşür və WhatsApp-da təsdiqləyirik.', ru: 'Добавьте товар в корзину, укажите имя, телефон и район — заказ придёт к нам, подтверждаем в WhatsApp.', en: 'Add it to the basket, enter your name, phone and area — the order reaches us and we confirm on WhatsApp.' } },
      { q: { az: 'Skumbriya filesi də var?', ru: 'Есть ли филе скумбрии?', en: 'Do you have mackerel fillets?' },
        a: { az: 'Bəli, hisə verilmiş skumbriya filesi kq ilə satılır.', ru: 'Да, филе копчёной скумбрии продаётся на вес.', en: 'Yes, smoked mackerel fillet is sold by the kilo.' } },
    ],
  },
  {
    path: '/hise-verilmis-baliq',
    name: 'smoked-fish',
    test: p => p.cat === 'smoked',
    title: 'Hisə verilmiş balıq — skumbriya, qızıl balıq, forel, Bakı | Freshness To Your Home',
    desc: 'Hisə verilmiş balıq onlayn: skumbriya, qızıl balıq, forel, dorado və daha çoxu. Копчёная рыба, smoked fish — Bakıya çatdırılma.',
    h1: { az: 'Hisə verilmiş balıq', ru: 'Копчёная рыба', en: 'Smoked fish' },
    also: 'Копчёная рыба Баку · smoked fish Baku · hisə balıq · natural smoked fish',
    text: {
      az: [
        'Hisə verilmiş balıq seçimimiz: skumbriya, qızıl balıq, forel, dorado və başqaları. Hər məhsulun şəkli, vahidi və qiyməti kataloqda göstərilir.',
        'Premium balığı evinizə çatdırırıq — sifarişi səbətdən göndərin, qalanını biz həll edirik.',
      ],
      ru: [
        'Наш выбор копчёной рыбы: скумбрия, лосось, форель, дорадо и другое. Фото, единица и цена указаны у каждого товара.',
        'Премиальную рыбу привезём домой — отправьте заказ из корзины.',
      ],
      en: [
        'Our smoked fish: mackerel, salmon, trout, dorado and more. Every item shows its photo, unit and price.',
        'Premium fish delivered to your door — send the order from the basket.',
      ],
    },
    faq: [
      { q: { az: 'Hisə verilmiş balıq neçəyədir?', ru: 'Сколько стоит копчёная рыба?', en: 'How much is smoked fish?' },
        a: { az: 'Qiymətlər məhsulların üzərində AZN ilə yazılıb və kataloqda həmişə cari qiymətdir.', ru: 'Цены указаны у товаров в манатах и в каталоге всегда актуальны.', en: 'Prices are shown on each product in AZN and are always current in the catalogue.' } },
    ],
  },
  {
    path: '/teze-baliq',
    name: 'fresh-fish',
    test: p => p.cat === 'fresh',
    title: 'Təzə balıq — dorado, levrek, forel, Bakıya çatdırılma | Freshness To Your Home',
    desc: 'Təzə balıq onlayn sifariş: dorado, levrek, forel və s. Свежая рыба с доставкой по Баку, fresh fish delivery Baku.',
    h1: { az: 'Təzə balıq', ru: 'Свежая рыба', en: 'Fresh fish' },
    also: 'Свежая рыба Баку · fresh fish Baku · fish delivery Baku · balıq satışı',
    text: {
      az: [
        'Təzə balıq bölməsində dorado, levrek, forel və digər balıqlar var. Balıq çəki ilə satılır, ona görə yekun məbləğ çəkiləndən sonra dəqiqləşir.',
      ],
      ru: ['В разделе свежей рыбы — дорадо, сибас, форель и другое. Рыба продаётся на вес, поэтому итог уточняется после взвешивания.'],
      en: ['Fresh fish includes dorado, sea bass, trout and more. It is sold by weight, so the final total is confirmed once weighed.'],
    },
    faq: [
      { q: { az: 'Balıq çəkiyə görədirsə, məbləğ necə hesablanır?', ru: 'Как считается сумма, если рыба на вес?', en: 'How is the total worked out for fish sold by weight?' },
        a: { az: 'Səbətdə təxmini məbləğ göstərilir; kuryer çəkir və yekun məbləğ çəkiyə görə dəqiqləşir.', ru: 'В корзине — ориентировочная сумма; курьер взвешивает, и итог уточняется по весу.', en: 'The basket shows an estimate; the courier weighs the goods and the final total follows the weight.' } },
    ],
  },
  {
    path: '/deniz-mehsullari',
    name: 'seafood',
    test: p => p.cat === 'seafood',
    title: 'Dəniz məhsulları — krevet, kalmar, midiya, Bakı | Freshness To Your Home',
    desc: 'Dəniz məhsulları onlayn: krevet, kalmar, midiya, seafood mix. Морепродукты с доставкой по Баку, seafood Baku.',
    h1: { az: 'Dəniz məhsulları (seafood)', ru: 'Морепродукты', en: 'Seafood' },
    also: 'Морепродукты Баку · seafood Baku · seafood satışı · seafood sifariş',
    text: {
      az: ['Krevet, kalmar, midiya və seafood mix — hamısı kataloqda şəkli və qiyməti ilə. Sifarişi səbətdən göndərin.'],
      ru: ['Креветки, кальмары, мидии и микс морепродуктов — всё в каталоге с фото и ценой.'],
      en: ['Prawns, squid, mussels and seafood mix — all in the catalogue with photo and price.'],
    },
    faq: [
      { q: { az: 'Dəniz məhsullarını Bakıya çatdırırsınız?', ru: 'Доставляете ли морепродукты по Баку?', en: 'Do you deliver seafood across Baku?' },
        a: DELIVERY },
    ],
  },
]

export const DELIVERY_LINE = DELIVERY
