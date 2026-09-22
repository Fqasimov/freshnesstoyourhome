/* Freshness To Your Home — catalogue
   ------------------------------------------------------------------
   The data below is a FALLBACK, not the source of truth. Prices, names and
   availability live in the database and arrive from /api/catalogue, the same
   public endpoint the mobile app uses — so changing a price is a row update
   rather than a redeploy of this site.

   The bundled copy is what renders on first paint and what the page falls back
   to when the API cannot be reached, so a customer never meets an empty shop.
   It was correct when it was written; treat any disagreement with the API as
   the API being right.

   PRODUCTS and CATEGORIES are reactive arrays mutated in place, so every
   component that already imports them updates when the real catalogue lands
   without any of them needing to know where it came from. */

import { reactive, ref } from 'vue'

/* The shop's own details live in shared/brand.json, where the app reads them
   too. Re-exported from here so the many components that already import
   CONTACT from the catalogue keep working. */
export { CONTACT } from './brand'

export const CATEGORIES = reactive([
  { id: 'all',      en: 'Everything',      az: 'Hamısı', ru: 'Всё',            kicker: '55' },
  { id: 'smoked',   en: 'Smoked Fish',     az: 'Hisə verilmiş', ru: 'Копчёности',     kicker: '07' },
  { id: 'fresh',    en: 'Fresh Fish',      az: 'Təzə balıqlar', ru: 'Свежая рыба',     kicker: '07' },
  { id: 'seafood',  en: 'Seafood',         az: 'Dəniz məhsulları', ru: 'Морепродукты',  kicker: '15' },
  { id: 'poultry',  en: 'Poultry & Meat',  az: 'Toyuq və ət', ru: 'Мясо и птица',       kicker: '06' },
  { id: 'cheese',   en: 'Cheese & Dairy',  az: 'Pendir və süd', ru: 'Сыры и молочное',     kicker: '19' },
  { id: 'pantry',   en: 'Pastry & Pantry', az: 'Xəmir və şirniyyat', ru: 'Выпечка и сладости',kicker: '11' }
]);

/* unit.qty is in the unit's base measure; unit.kind drives the per-kg badge */
export const PRODUCTS = reactive([
  /* ── SMOKED FISH ───────────────────────────────────────────── */
  { id:'smoked-salmon', cat:'smoked', price:65, unit:{en:'1 kg',az:'1 kg',ru:'1 кг',kind:'kg',qty:1},
    en:'Smoked Salmon', az:'Hisə verilmiş qızıl balıq', ru:'Лосось холодного копчения', popular:true,
    den:'Cold-smoked Atlantic salmon, hand-sliced and ready for the board.',
    daz:'Soyuq üsulla hisə verilmiş qızıl balıq, nazik dilimlənmiş.',
    dru:'Атлантический лосось холодного копчения, нарезанный вручную.' },
  { id:'smoked-beluga', cat:'smoked', price:110, unit:{en:'1 kg',az:'1 kg',ru:'1 кг',kind:'kg',qty:1},
    en:'Smoked Beluga', az:'Hisə verilmiş beluqa', ru:'Белуга копчёная', popular:true,
    den:'Caspian beluga sturgeon, slow-smoked whole. The house showpiece.',
    daz:'Xəzər beluqası, bütöv halda yavaş hisə verilmiş. Evin bəzəyi.',
    dru:'Каспийская белуга медленного копчения целиком. Гордость прилавка.' },

  { id:'smoked-dorado', cat:'smoked', price:15, unit:{en:'1 piece',az:'1 ədəd',ru:'1 шт',kind:'pc',qty:1},
    en:'Smoked Dorado', az:'Hisə verilmiş dorado', ru:'Дорадо копчёная',
    den:'Sea bream smoked whole over hardwood — delicate, lightly salted.',
    daz:'Bütöv hisə verilmiş dorado — zərif, az duzlu.',
    dru:'Дорадо целиком, копчёная на твёрдых породах дерева — нежная, слабосолёная.' },
  { id:'smoked-trout', cat:'smoked', price:9, unit:{en:'1 piece',az:'1 ədəd',ru:'1 шт',kind:'pc',qty:1},
    en:'Smoked Trout', az:'Hisə verilmiş forel', ru:'Форель копчёная',
    den:'Whole smoked trout — the everyday favourite of the smoke house.',
    daz:'Bütöv hisə verilmiş forel — hər gün üçün sevimli seçim.',
    dru:'Форель целиком горячего копчения — ежедневный фаворит коптильни.' },


  /* ── FRESH FISH ────────────────────────────────────────────── */
  { id:'salmon-steaks', cat:'fresh', price:60, unit:{en:'1 kg',az:'1 kg',ru:'1 кг',kind:'kg',qty:1},
    en:'Salmon Steaks', az:'Qızıl balıq steyki', ru:'Стейки лосося', popular:true,
    den:'Bone-in salmon steaks cut to order, delivered on ice.',
    daz:'Sifarişlə kəsilmiş qızıl balıq steyki, buz üzərində çatdırılır.',
    dru:'Стейки лосося на кости, режем под заказ, привозим на льду.' },
  { id:'beluga-steaks', cat:'fresh', price:55, unit:{en:'1 kg',az:'1 kg',ru:'1 кг',kind:'kg',qty:1},
    en:'Beluga Steaks', az:'Beluqa steyki', ru:'Стейки белуги',
    den:'Thick sturgeon steaks — firm, meaty, made for the grill.',
    daz:'Qalın nərə balığı steyki — sıx, ətli, qril üçün ideal.',
    dru:'Толстые осетровые стейки — плотные, мясистые, созданы для гриля.' },

  { id:'fresh-dorado', cat:'fresh', price:26, unit:{en:'1 kg',az:'1 kg',ru:'1 кг',kind:'kg',qty:1},
    en:'Fresh Dorado', az:'Təzə dorado', ru:'Дорадо свежая',
    den:'Whole gilt-head bream, gutted and scaled on request.',
    daz:'Bütöv dorado, sifarişlə təmizlənir.',
    dru:'Дорадо целиком, чистим и потрошим по запросу.' },
  { id:'fresh-levrek', cat:'fresh', price:29, unit:{en:'1 kg',az:'1 kg',ru:'1 кг',kind:'kg',qty:1},
    en:'Fresh Sea Bass', az:'Təzə levrek', ru:'Сибас свежий',
    den:'Whole sea bass — mild, flaky, excellent baked with lemon.',
    daz:'Bütöv levrek — yumşaq dadlı, limonla bişirmək üçün əla.',
    dru:'Сибас целиком — мягкий, нежный, отлично запекается с лимоном.' },
  { id:'fresh-forel', cat:'fresh', price:20, unit:{en:'1 kg',az:'1 kg',ru:'1 кг',kind:'kg',qty:1},
    en:'Fresh Trout Fillet', az:'Təzə forel filesi', ru:'Филе форели',
    den:'Skin-on trout fillets, pin-boned and ready to cook.',
    daz:'Dərili forel filesi, sümüksüz, bişirməyə hazır.',
    dru:'Филе форели на коже, без костей, готово к приготовлению.' },

  /* ── SEAFOOD ───────────────────────────────────────────────── */
  { id:'tuna-loin', cat:'seafood', price:50, unit:{en:'1 kg',az:'1 kg',ru:'1 кг',kind:'kg',qty:1},
    en:'Tuna Loin', az:'Tunes filesi', ru:'Филе тунца, лоин', popular:true,
    den:'Whole yellowfin loin, deep red and sashimi-grade when fresh.',
    daz:'Bütöv tunes filesi, tünd qırmızı, sashimi keyfiyyətli.',
    dru:'Цельный лоин жёлтопёрого тунца, тёмно-красный, качества сашими.' },
  { id:'tuna-frozen', cat:'seafood', price:68, unit:{en:'1 kg',az:'1 kg',ru:'1 кг',kind:'kg',qty:1},
    en:'Tuna, Frozen Portions', az:'Dondurulmuş tunes', ru:'Тунец, порции',
    den:'Vacuum-packed tuna portions, individually frozen at sea.',
    daz:'Vakuumda dondurulmuş tunes porsiyaları.',
    dru:'Порции тунца в вакууме, замороженные прямо в море.' },
  { id:'atlantic-lobster', cat:'seafood', price:60, unit:{en:'400 gr',az:'400 gr',ru:'400 г',kind:'g',qty:400},
    en:'Atlantic Lobster', az:'Atlantik omar', ru:'Атлантический лобстер',
    den:'Whole cooked Canadian lobster, frozen in the shell.',
    daz:'Bütöv bişmiş Kanada omarı, qabığında dondurulmuş.',
    dru:'Канадский лобстер целиком, варёный, замороженный в панцире.' },
  { id:'octopus-salgado', cat:'seafood', price:72, unit:{en:'1 kg',az:'1 kg',ru:'1 кг',kind:'kg',qty:1},
    en:'Salgado Octopus', az:'Salqado osminoq', ru:'Осьминог Salgado',
    den:'Whole Atlantic octopus, cleaned and portioned in trays.',
    daz:'Bütöv Atlantik osminoq, təmizlənmiş və qablaşdırılmış.',
    dru:'Атлантический осьминог целиком, очищенный и разложенный в лотки.' },

  { id:'baby-octopus', cat:'seafood', price:29, unit:{en:'1 kg',az:'1 kg',ru:'1 кг',kind:'kg',qty:1},
    en:'Baby Octopus', az:'Balaca osminoq', ru:'Мини-осьминог',
    den:'Whole baby octopus, cleaned and frozen. Tender in minutes.',
    daz:'Bütöv balaca osminoq, təmizlənmiş və dondurulmuş.',
    dru:'Молодой осьминог целиком, очищенный и замороженный. Готовится за минуты.' },
  { id:'unagi-frozen', cat:'seafood', price:70, unit:{en:'1 kg',az:'1 kg',ru:'1 кг',kind:'kg',qty:1},
    en:'Unagi, Glazed Eel', az:'Unaqi — dondurulmuş ilan balığı', ru:'Унаги, угорь в глазури',
    den:'Japanese-style grilled eel in kabayaki glaze. Heat and serve.',
    daz:'Yapon üsulu qrildə bişmiş ilan balığı, kabayaki sousunda.',
    dru:'Угорь на гриле по-японски в соусе кабаяки. Разогреть и подавать.' },
  { id:'mussel-meat', cat:'seafood', price:20, unit:{en:'1 kg',az:'1 kg',ru:'1 кг',kind:'kg',qty:1},
    en:'Mussel Meat', az:'Midyə əti', ru:'Мясо мидий',
    den:'Shelled mussel meat, blanched and frozen loose for easy cooking.',
    daz:'Qabıqdan çıxarılmış midyə əti, dondurulmuş.',
    dru:'Очищенное мясо мидий, бланшированное и замороженное россыпью.' },
  { id:'green-mussels', cat:'seafood', price:39, unit:{en:'1 kg',az:'1 kg',ru:'1 кг',kind:'kg',qty:1},
    en:'NZ Greenshell Mussels', az:'Yaşıl midyə', ru:'Зелёные мидии, Новая Зеландия',
    den:'New Zealand half-shell mussels — plump, sweet, restaurant grade.',
    daz:'Yeni Zelandiya yarım qabıqlı midyəsi — ətli və şirin.',
    dru:'Новозеландские мидии на половинке раковины — крупные и сладкие.' },
  { id:'black-tiger-shrimp', cat:'seafood', price:59, unit:{en:'1 kg',az:'1 kg',ru:'1 кг',kind:'kg',qty:1},
    en:'Black Tiger Prawns, Head-On', az:'Black tiger krevet, başlı', ru:'Креветки блэк тайгер, с головой', popular:true,
    den:'Size 8/12 head-on tiger prawns — the big ones, shell-on.',
    daz:'8/12 ölçülü başlı black tiger krevet — iri ölçü.',
    dru:'Креветки 8/12 с головой и в панцире — крупный калибр.' },
  { id:'langoustine', cat:'seafood', price:62, unit:{en:'1 kg',az:'1 kg',ru:'1 кг',kind:'kg',qty:1},
    en:'Langoustine', az:'Langustin', ru:'Лангустины',
    den:'Whole langoustines, frozen at sea. Grill hard and fast.',
    daz:'Bütöv langustin, dənizdə dondurulmuş. Qrildə bişirin.',
    dru:'Лангустины целиком, заморожены в море. Гриль на сильном огне.' },

  { id:'red-caviar', cat:'seafood', price:65, unit:{en:'200 gr',az:'200 gr',ru:'200 г',kind:'g',qty:200},
    en:'Red Caviar', az:'Qırmızı ikra', ru:'Красная икра', popular:true,
    variants:[ {en:'200 gr',az:'200 gr',ru:'200 г',price:65,qty:200}, {en:'500 gr',az:'500 gr',ru:'500 г',price:145,qty:500} ],
    den:'Salmon roe, lightly salted, in a sealed tin. Two tin sizes.',
    daz:'Az duzlu qızıl balıq kürüsü, bağlı qabda. İki ölçüdə.',
    dru:'Икра лосося слабого посола в запечатанной банке. Две фасовки.' },
  { id:'kalmar', cat:'seafood', price:26, unit:{en:'1 kg',az:'1 kg',ru:'1 кг',kind:'kg',qty:1},
    en:'Squid Rings', az:'Kalmar', ru:'Кольца кальмара',
    den:'Cleaned squid rings, frozen raw — fry from frozen in two minutes.',
    daz:'Təmizlənmiş kalmar halqaları, çiy dondurulmuş.',
    dru:'Очищенные кольца кальмара, сырые замороженные — жарятся за две минуты.' },
  { id:'seafood-mix', cat:'seafood', price:26, unit:{en:'1 kg',az:'1 kg',ru:'1 кг',kind:'kg',qty:1},
    en:'Seafood Mix', az:'Dəniz məhsulları qarışığı', ru:'Морской коктейль',
    den:'Shrimp, mussels, squid and octopus in one marinated pack.',
    daz:'Krevet, midyə, kalmar və osminoq bir paketdə.',
    dru:'Креветки, мидии, кальмар и осьминог в одной маринованной упаковке.' },
  { id:'black-mussels', cat:'seafood', price:20, unit:{en:'1 kg',az:'1 kg',ru:'1 кг',kind:'kg',qty:1},
    en:'Black Mussels', az:'Qara midyə', ru:'Чёрные мидии',
    den:'Half-shell black mussels — steam with white wine and garlic.',
    daz:'Yarım qabıqlı qara midyə — ağ şərab və sarımsaqla bişirin.',
    dru:'Чёрные мидии на половинке раковины — тушить с белым вином и чесноком.' },

  /* ── POULTRY & MEAT ────────────────────────────────────────── */
  { id:'french-chicken', cat:'poultry', price:30, unit:{en:'1 kg',az:'1 kg',ru:'1 кг',kind:'kg',qty:1},
    en:'French Chicken', az:'Fransız toyuğu', ru:'Французская курица',
    den:'Certified Label Rouge poussin from France, whole in the bag.',
    daz:'Fransadan sertifikatlı bütöv toyuq.',
    dru:'Сертифицированный цыплёнок из Франции, целиком в упаковке.' },
  { id:'kend-colpa-700', cat:'poultry', price:9, unit:{en:'1 pc · 700–800 gr',az:'1 əd · 700–800 gr',ru:'1 шт · 700–800 г',kind:'pc',qty:1},
    en:'Village Poussin, Small', az:'Kənd çolpası, kiçik', ru:'Деревенский цыплёнок, малый',
    den:'Free-range village chicken, 700–800 gr. Yellow fat, real flavour.',
    daz:'Kənd çolpası, 700–800 qr. Sarı yağlı, təbii dadlı.',
    dru:'Цыплёнок свободного выгула, 700–800 г. Жёлтый жир, настоящий вкус.' },
  { id:'kend-colpa-800', cat:'poultry', price:10, unit:{en:'1 pc · 800–900 gr',az:'1 əd · 800–900 gr',ru:'1 шт · 800–900 г',kind:'pc',qty:1},
    en:'Village Poussin, Large', az:'Kənd çolpası, iri', ru:'Деревенский цыплёнок, крупный',
    den:'The same village bird, one size up at 800–900 gr.',
    daz:'Eyni kənd çolpası, 800–900 qr ölçüdə.',
    dru:'Та же деревенская птица, на размер больше — 800–900 г.' },
  { id:'peking-duck', cat:'poultry', price:30, unit:{en:'1 kg',az:'1 kg',ru:'1 кг',kind:'kg',qty:1},
    en:'Peking Duck', az:'Pekin ördəyi', ru:'Пекинская утка', popular:true,
    den:'Whole Peking duck, prepared for the oven — crisp skin guaranteed.',
    daz:'Bütöv pekin ördəyi, sobaya hazır.',
    dru:'Пекинская утка целиком, подготовлена для духовки — корочка гарантирована.' },
  { id:'duck-fillet', cat:'poultry', price:24, unit:{en:'1 pack',az:'1 paket',ru:'1 упак',kind:'pack',qty:1},
    en:'Duck Breast Fillet', az:'Ördək filesi', ru:'Филе утиной грудки',
    den:'Skin-on magret duck breast, vacuum-packed in pairs.',
    daz:'Dərili ördək döş filesi, vakuum qablaşdırmada.',
    dru:'Утиная грудка магре на коже, в вакууме, по две штуки.' },
  { id:'duck-leg', cat:'poultry', price:19, unit:{en:'1 kg',az:'1 kg',ru:'1 кг',kind:'kg',qty:1},
    en:'Duck Legs', az:'Ördək budu', ru:'Утиные ножки',
    den:'Duck legs for confit or slow roasting. Sold by the kilo.',
    daz:'Konfi və ya yavaş bişirmə üçün ördək budu.',
    dru:'Утиные ножки для конфи или медленного запекания. На развес.' },

  /* ── CHEESE & DAIRY ────────────────────────────────────────── */
  { id:'camembert', cat:'cheese', price:18, unit:{en:'125 gr',az:'125 gr',ru:'125 г',kind:'g',qty:125},
    en:'Camembert', az:'Kamamber pendiri', ru:'Камамбер',
    den:'Soft bloomy-rind cow cheese from Normandy. Serve at room temperature.',
    daz:'Normandiyadan yumşaq inək pendiri. Otaq temperaturunda verin.',
    dru:'Мягкий сыр с белой плесенью из Нормандии. Подавать комнатной температуры.' },
  { id:'brie', cat:'cheese', price:18, unit:{en:'125 gr',az:'125 gr',ru:'125 г',kind:'g',qty:125},
    en:'Brie', az:'Bri pendiri', ru:'Бри',
    den:'Mild, buttery and creamy under a white rind. A board essential.',
    daz:'Ağ qabıqlı, yumşaq və kremvari pendir.',
    dru:'Мягкий, сливочный, с белой корочкой. Основа любой сырной тарелки.' },
  { id:'parmigiano-reggiano', cat:'cheese', price:27, unit:{en:'230 gr',az:'230 gr',ru:'230 г',kind:'g',qty:230},
    en:'Parmigiano Reggiano', az:'Parmicano Recano', ru:'Пармиджано Реджано', popular:true,
    den:'DOP hard cheese aged in Emilia-Romagna. Cut from the wheel.',
    daz:'DOP sertifikatlı, Emiliya-Romanyada yetişdirilmiş bərk pendir.',
    dru:'Твёрдый сыр DOP, выдержанный в Эмилии-Романье. Отрезаем от головы.' },
  { id:'baby-truffle', cat:'cheese', price:46, unit:{en:'280 gr',az:'280 gr',ru:'280 г',kind:'g',qty:280},
    en:'Black Truffle Gouda', az:'Qara trüflü pendir', ru:'Гауда с чёрным трюфелем',
    den:'Dutch baby gouda studded with black truffle. Deep and earthy.',
    daz:'Qara trüf əlavəli Hollandiya pendiri. Zəngin ətirli.',
    dru:'Голландская молодая гауда с чёрным трюфелем. Глубокий землистый вкус.' },
  { id:'baby-green-pesto', cat:'cheese', price:43, unit:{en:'280 gr',az:'280 gr',ru:'280 г',kind:'g',qty:280},
    en:'Green Pesto Gouda', az:'Yaşıl pesto pendiri', ru:'Гауда с зелёным песто',
    den:'Baby gouda blended with basil pesto — bright green, herbaceous.',
    daz:'Reyhan pestosu ilə hazırlanmış pendir — parlaq yaşıl rəngli.',
    dru:'Молодая гауда с песто из базилика — ярко-зелёная, травяная.' },
  { id:'grana-padano', cat:'cheese', price:21, unit:{en:'200 gr',az:'200 gr',ru:'200 г',kind:'g',qty:200},
    en:'Grana Padano', az:'Qrana Padano', ru:'Грана Падано',
    den:'Aged Italian grating cheese — milder and softer than Parmigiano.',
    daz:'Yetişdirilmiş İtalyan pendiri — parmicanodan yumşaqdır.',
    dru:'Выдержанный итальянский сыр для тёрки — мягче и нежнее пармезана.' },
  { id:'butter', cat:'cheese', price:25, unit:{en:'1 kg',az:'1 kg',ru:'1 кг',kind:'kg',qty:1},
    en:'Butter', az:'Kərə yağı', ru:'Сливочное масло',
    den:'Cultured block butter, cut to the kilo. For baking and the table.',
    daz:'Təbii kərə yağı, kiloqramla kəsilir.',
    dru:'Сливочное масло брусками, режем на килограммы. Для выпечки и на стол.' },
  { id:'burrata-truffle', cat:'cheese', price:15, unit:{en:'200 gr',az:'200 gr',ru:'200 г',kind:'g',qty:200},
    en:'Truffle Burrata', az:'Trüflü burrata', ru:'Буррата с трюфелем', popular:true,
    den:'Fresh burrata with a truffled cream centre. Eat the day it lands.',
    daz:'İçi trüflü kremli təzə burrata. Gəldiyi gün yeyin.',
    dru:'Свежая буррата с трюфельными сливками внутри. Съесть в день доставки.' },

  { id:'halloumi', cat:'cheese', price:10, unit:{en:'250 gr',az:'250 gr',ru:'250 г',kind:'g',qty:250},
    en:'Halloumi', az:'Hellim pendiri', ru:'Халуми',
    den:'Grilling cheese that holds its shape in the pan. Squeaky and salty.',
    daz:'Qrildə formasını saxlayan pendir. Duzlu dadlı.',
    dru:'Сыр для гриля, держит форму на сковороде. Солёный, поскрипывает.' },
  { id:'organic-feta', cat:'cheese', price:9, unit:{en:'250 gr',az:'250 gr',ru:'250 г',kind:'g',qty:250},
    en:'Organic Feta', az:'Orqanik feta', ru:'Органическая фета',
    den:'Brined organic feta — crumbly, tangy, for salads and pastry.',
    daz:'Duzlu suda saxlanan orqanik feta — salat və xəmir üçün.',
    dru:'Органическая фета в рассоле — крошится, кислит, для салатов и выпечки.' },

  /* ── PASTRY & PANTRY ───────────────────────────────────────── */
  { id:'frozen-croissant', cat:'pantry', price:25, unit:{en:'min. 10 pcs',az:'min. 10 əd',ru:'от 10 шт',kind:'pack',qty:10},
    en:'Frozen Croissants', az:'Dondurulmuş kruassan', ru:'Круассаны замороженные', popular:true,
    den:'Raw butter croissants — prove overnight, bake in the morning.',
    daz:'Çiy kərə yağlı kruassan — gecə açılır, səhər bişirilir.',
    dru:'Сырые масляные круассаны — расстоять ночью, испечь утром.' },
  { id:'frozen-bagels', cat:'pantry', price:25, unit:{en:'min. 10 pcs',az:'min. 10 əd',ru:'от 10 шт',kind:'pack',qty:10},
    en:'Frozen Bagels', az:'Dondurulmuş beygel', ru:'Бейглы замороженные',
    den:'Par-baked bagels — finish in the oven for a proper crust.',
    daz:'Yarımbişmiş beygel — sobada tamamlayın.',
    dru:'Бейглы полуготовые — доводятся в духовке до правильной корочки.' },
  { id:'tortilla-lavash', cat:'pantry', price:13, unit:{en:'1.5 kg',az:'1.5 kg',ru:'1,5 кг',kind:'kg',qty:1.5},
    en:'Tortilla Lavash', az:'Tortilla lavaş', ru:'Тортилья лаваш',
    den:'Soft wheat tortillas in a 1.5 kg catering pack. For wraps and shawarma.',
    daz:'1.5 kq-lıq paketdə yumşaq buğda lavaşı.',
    dru:'Мягкие пшеничные тортильи в упаковке 1,5 кг. Для роллов и шаурмы.' },
  { id:'kitkat-matcha', cat:'pantry', price:13, unit:{en:'1 pack',az:'1 paket',ru:'1 упак',kind:'pack',qty:1},
    en:'KitKat Matcha', az:'KitKat matça', ru:'KitKat матча',
    den:'Japanese mini KitKat in dark matcha — bitter green tea, less sugar.',
    daz:'Yapon mini KitKat, tünd matça dadında.',
    dru:'Японский мини-KitKat с тёмной матчей — горчинка зелёного чая, меньше сахара.' },
  { id:'kitkat-matcha-latte', cat:'pantry', price:9, unit:{en:'1 pack',az:'1 paket',ru:'1 упак',kind:'pack',qty:1},
    en:'KitKat Matcha Latte', az:'KitKat matça latte', ru:'KitKat матча латте',
    den:'Sweeter, milkier matcha edition from the Japanese range.',
    daz:'Daha şirin və südlü matça versiyası.',
    dru:'Более сладкая и молочная версия матчи из японской линейки.' },
  { id:'kitkat-strawberry', cat:'pantry', price:13, unit:{en:'1 pack',az:'1 paket',ru:'1 упак',kind:'pack',qty:1},
    en:'KitKat Strawberry', az:'KitKat çiyələk', ru:'KitKat клубника',
    den:'Japanese strawberry KitKat — pink, fruity, individually wrapped.',
    daz:'Yapon çiyələkli KitKat — ayrı-ayrı bükülmüş.',
    dru:'Японский клубничный KitKat — розовый, фруктовый, в индивидуальной упаковке.' },

  /* ── SMOKED FISH (new) ─────────────────────────────────────── */
  { id:'smoked-mackerel-fillet', cat:'smoked', price:35, unit:{en:'1 kg',az:'1 kg',ru:'1 кг',kind:'kg',qty:1},
    en:'Smoked Mackerel Fillets', az:'Hisə verilmiş skumbriya filesi', ru:'Скумбрия копчёная, филе',
    den:'Hot-smoked mackerel fillets, skin-on — rich, oily, ready to eat or flake into salads.',
    daz:'İsti hisə verilmiş skumbriya filesi — yağlı, dadlı, salataya və ya bilavasitə yeməyə hazır.',
    dru:'Филе скумбрии горячего копчения на коже — жирное, насыщенное, готово к столу или в салаты.' },
  { id:'smoked-herring', cat:'smoked', price:8, unit:{en:'1 piece',az:'1 ədəd',ru:'1 шт',kind:'pc',qty:1},
    en:'Smoked Herring', az:'Hisə verilmiş siyənək', ru:'Сельдь копчёная',
    den:'Whole hot-smoked herring — golden skin, tender flesh, a classic Eastern European favourite.',
    daz:'Bütöv isti hisə verilmiş siyənək — qızılı dərili, zərif ətli.',
    dru:'Сельдь горячего копчения целиком — золотистая кожа, нежная мякоть, классика.' },

  /* ── FRESH FISH (new) ──────────────────────────────────────── */
  { id:'salmon-trout-fillet', cat:'fresh', price:22, unit:{en:'1 kg',az:'1 kg',ru:'1 кг',kind:'kg',qty:1},
    en:'Salmon Trout Fillet', az:'Qızılı alabalıq filesi', ru:'Филе форели лосося',
    den:'Premium Norwegian salmon trout fillet, skin-on, rich in omega-3. Vacuum-packed fresh.',
    daz:'Norvec qızılı alabalıq filesi, dərili, omega-3 zəngin. Vakuumda təzə qablaşdırılmış.',
    dru:'Филе норвежской форели-лосося на коже, богатое омега-3. Упаковано в вакуум.' },

  /* ── SEAFOOD (new) ─────────────────────────────────────────── */
  { id:'black-caviar', cat:'seafood', price:150, unit:{en:'100 gr',az:'100 gr',ru:'100 г',kind:'g',qty:100},
    en:'Black Caviar', az:'Qara ikra', ru:'Чёрная икра', popular:true,
    den:'Premium sturgeon black caviar, lightly salted — served chilled in a glass jar.',
    daz:'Premium nərə balığı qara ikrası, az duzlu — şüşə qabda soyuq verilir.',
    dru:'Премиальная чёрная икра осетровых, слабого посола — подаётся охлаждённой в стеклянной банке.' },
  { id:'vannamei-shrimp', cat:'seafood', price:32, unit:{en:'1 kg',az:'1 kg',ru:'1 кг',kind:'kg',qty:1},
    en:'Vannamei Shrimp, Peeled', az:'Vannamei krevetlər, soyulmuş', ru:'Креветки ваннамей очищенные',
    den:'Frozen vannamei shrimp 16/20, peeled and deveined — Meduza brand, 30% glaze.',
    daz:'Dondurulmuş vannamei krevet 16/20, soyulmuş — Meduza, 30% sululuq.',
    dru:'Замороженные креветки ваннамей 16/20, очищенные — Meduza, 30% глазури.' },

  /* ── CHEESE & DAIRY (new) ──────────────────────────────────── */
  { id:'mozzarella', cat:'cheese', price:10, unit:{en:'125 gr',az:'125 gr',ru:'125 г',kind:'g',qty:125},
    en:'Fresh Mozzarella', az:'Təzə mozzarella', ru:'Моцарелла свежая',
    den:'Classic fresh mozzarella balls in brine — soft, milky and perfect for Caprese.',
    daz:'Klassik təzə mozzarella topları duzlu suda — yumşaq, südlü, kaprese üçün ideal.',
    dru:'Классические шарики свежей моцареллы в рассоле — мягкие, молочные, идеал для Капрезе.' },
  { id:'burrata-plain', cat:'cheese', price:12, unit:{en:'200 gr',az:'200 gr',ru:'200 г',kind:'g',qty:200},
    en:'Burrata', az:'Burrata', ru:'Буррата',
    den:'Fresh burrata with a stracciatella cream centre — eat the day it arrives.',
    daz:'İçi stracciatella kremli təzə burrata — gəldiyi gün yeyin.',
    dru:'Свежая буррата с начинкой из страчателлы — съесть в день доставки.' },
  { id:'labne', cat:'cheese', price:8, unit:{en:'250 gr',az:'250 gr',ru:'250 г',kind:'g',qty:250},
    en:'Labne', az:'Labne', ru:'Лябне',
    den:'Strained yogurt cheese — thick, creamy and tangy. Spread on toast or serve with olive oil.',
    daz:'Süzülmüş qatıq pendiri — qalın, kremli, turşumtul. Çörəkə yayın və ya zeytun yağıyla verin.',
    dru:'Отцеженный йогуртовый сыр — густой, кремовый, с кислинкой. На тост или с оливковым маслом.' },
  { id:'goat-cheese', cat:'cheese', price:38, unit:{en:'280 gr',az:'280 gr',ru:'280 г',kind:'g',qty:280},
    en:'Young Goat Cheese', az:'Cavan keçi pendiri', ru:'Молодой козий сыр',
    den:'Henri Willig young goat cheese from Holland — mild, creamy, vegetarian-friendly.',
    daz:'Henri Willig Hollandiya cavan keçi pendiri — yüngül, kremli, vegetarian dostu.',
    dru:'Молодой козий сыр Henri Willig из Голландии — мягкий, сливочный, вегетарианский.' },
  { id:'chili-gouda', cat:'cheese', price:43, unit:{en:'280 gr',az:'280 gr',ru:'280 г',kind:'g',qty:280},
    en:'Red Chili Pepper Gouda', az:'Qırmızı bibərli qauda', ru:'Гауда с красным перцем чили',
    den:'Henri Willig baby gouda studded with red chilli — bold heat in a creamy Dutch base.',
    daz:'Qırmızı bibər əlavəli Henri Willig pendiri — kremli Hollandiya bazasında iti dad.',
    dru:'Молодая гауда Henri Willig с красным чили — острая, пикантная, на кремовой голландской основе.' },
  { id:'gran-guardia', cat:'cheese', price:22, unit:{en:'200 gr',az:'200 gr',ru:'200 г',kind:'g',qty:200},
    en:'Gran Guardia', az:'Gran Quardia', ru:'Гран Гуардиа',
    den:'Ghidetti Italian hard cheese, aged in the style of Grana — nutty, granular, ideal for grating.',
    daz:'Ghidetti İtalyan bərk pendiri, Grana üslubunda yetişdirilmiş — qozyemiş dadlı, rendə üçün ideal.',
    dru:'Итальянский твёрдый сыр Ghidetti в стиле Грана — ореховый, зернистый, идеален для тёрки.' },
  { id:'aged-gouda-333', cat:'cheese', price:25, unit:{en:'200 gr',az:'200 gr',ru:'200 г',kind:'g',qty:200},
    en:'Aged Gouda 333', az:'Köhnəlmiş qauda 333', ru:'Выдержанная гауда 333',
    den:'Veenmeester Gouda matured 333 days — caramel notes, firm crunch, tyrosine crystals.',
    daz:'Veenmeester qauda, 333 gün yetişdirilmiş — karamel notlu, sıx, tirozin kristalları.',
    dru:'Гауда Veenmeester 333 дня выдержки — карамельные ноты, плотная, с кристаллами тирозина.' },
  { id:'aged-gouda-444', cat:'cheese', price:30, unit:{en:'200 gr',az:'200 gr',ru:'200 г',kind:'g',qty:200},
    en:'Aged Gouda 444', az:'Köhnəlmiş qauda 444', ru:'Выдержанная гауда 444',
    den:'Veenmeester Gouda matured 444 days — deeper flavour, more crystals, excellent with red wine.',
    daz:'Veenmeester qauda, 444 gün yetişdirilmiş — daha dərin dad, qırmızı şərabla əla.',
    dru:'Гауда Veenmeester 444 дня выдержки — более глубокий вкус, больше кристаллов, отлична с красным вином.' },
  { id:'aged-gouda-555', cat:'cheese', price:35, unit:{en:'200 gr',az:'200 gr',ru:'200 г',kind:'g',qty:200},
    en:'Aged Gouda 555', az:'Köhnəlmiş qauda 555', ru:'Выдержанная гауда 555',
    den:'Veenmeester Gouda matured 555 days — intense, nutty, almost toffee-like. The flagship.',
    daz:'Veenmeester qauda, 555 gün yetişdirilmiş — intensiv, qozyemiş, karamel dadlı. Flaqman.',
    dru:'Гауда Veenmeester 555 дней выдержки — насыщенная, ореховая, почти ириска. Флагман линейки.' },

  /* ── PASTRY & PANTRY (new) ─────────────────────────────────── */
  { id:'frozen-edamame', cat:'pantry', price:9, unit:{en:'400 gr',az:'400 gr',ru:'400 г',kind:'g',qty:400},
    en:'Frozen Edamame', az:'Dondurulmuş edamame', ru:'Эдамаме замороженные',
    den:'Nova salted edamame in the pod — blanched, frozen and ready in minutes. A good source of plant protein.',
    daz:'Nova duzlu edamame — blanşlanmış, dondurulmuş, dəqiqələr ərzində hazır. Bitki zülalı mənbəyi.',
    dru:'Солёный эдамаме Nova в стручках — бланшированный, замороженный, готовится за минуты. Источник растительного белка.' },
  { id:'pesto-sauce', cat:'pantry', price:11, unit:{en:'180 gr',az:'180 gr',ru:'180 г',kind:'g',qty:180},
    en:'Pesto al Basilico', az:'Reyhan pestosu', ru:'Песто из базилика',
    den:'Ottima Italian basil pesto — Prodotto in Italia, made with fresh basil, garlic and Parmesan.',
    daz:'Ottima İtalyan reyhan pestosu — təzə reyhan, sarımsaq və parmezan ilə.',
    dru:'Итальянское песто из базилика Ottima — свежий базилик, чеснок и пармезан. Продукт Италии.' },
  { id:'sundried-tomatoes', cat:'pantry', price:10, unit:{en:'280 gr',az:'280 gr',ru:'280 г',kind:'g',qty:280},
    en:'Sundried Tomatoes in Oil', az:'Yağda qurudulmuş pomidor', ru:'Вяленые помидоры в масле',
    den:'Ottima Italian sundried tomatoes in seed oil — 130 g drained weight, intensely flavoured.',
    daz:'Ottima İtalyan qurudulmuş pomidoru yağda — 130 q süzülmüş, zəngin dadlı.',
    dru:'Вяленые помидоры Ottima в масле — 130 г без масла, интенсивный вкус. Продукт Италии.' },
  { id:'frozen-asparagus', cat:'pantry', price:14, unit:{en:'1 kg',az:'1 kg',ru:'1 кг',kind:'kg',qty:1},
    en:'Frozen Green Asparagus', az:'Dondurulmuş yaşıl quşqonmaz', ru:'Спаржа зелёная замороженная',
    den:'Nova organic frozen green asparagus — IQF spears, 100% fresh, steam or stir-fry straight from frozen.',
    daz:'Nova üzvi dondurulmuş yaşıl quşqonmaz — IQF, 100% təzə, buxarla və ya tavada hazırlanır.',
    dru:'Органическая замороженная зелёная спаржа Nova — IQF, 100% свежая, готовить прямо из морозилки.' },
  { id:'dimartino-pasta', cat:'pantry', price:18, unit:{en:'500 gr',az:'500 gr',ru:'500 г',kind:'g',qty:500},
    en:'Di Martino × D&G Pasta', az:'Di Martino × D&G Pasta', ru:'Паста Di Martino × D&G',
    den:'Pastificio G. Di Martino Dolce & Gabbana special edition — Pasta di Gragnano IGP, bronze-die cut. Available in Fusilli, Tortiglioni, Gnocchi Sardi and Linguine.',
    daz:'Pastificio G. Di Martino Dolce & Gabbana xüsusi nəşr — Pasta di Gragnano IGP, bürünc kalıpda. Fusilli, Tortiglioni, Gnocchi Sardi və Linguine növlərində.',
    dru:'Лимитированная серия Pastificio G. Di Martino × Dolce & Gabbana — Pasta di Gragnano IGP, отлита в бронзовой матрице. Фузилли, Тортильони, Гnocchi Sardi и Лингвини.' }
]);

/* Vite resolves every product photo at build time, so each one gets a
   hashed, cache-busted URL and a missing file fails the build instead of
   404-ing in production. */
const PHOTOS = import.meta.glob('../assets/products/*.jpg', { eager: true, import: 'default' })

PRODUCTS.forEach(p => {
  const hit = PHOTOS[`../assets/products/${p.id}.jpg`]
  if (!hit && import.meta.env.DEV) console.warn(`[catalogue] no photo for "${p.id}"`)
  p.img = hit
})

/* Bundles sold at a discount to the sum of their parts. `off` is the
   percentage taken off that sum — edit it, or the contents, and the
   displayed price follows automatically. */
export const SETS = reactive([
  {
    id: 'breakfast', off: 10, items: ['frozen-croissant', 'butter', 'brie', 'red-caviar'],
    en: 'Weekend breakfast', az: 'Həftəsonu səhər yeməyi', ru: 'Выходной завтрак',
    den: 'Croissants to bake in the morning, butter, brie and a tin of red caviar.',
    daz: 'Səhər bişirmək üçün kruassan, kərə yağı, bri pendiri və bir qab qırmızı ikra.',
    dru: 'Круассаны для утренней выпечки, масло, бри и банка красной икры.'
  },
  {
    id: 'cheeseboard', off: 12, items: ['camembert', 'parmigiano-reggiano', 'baby-truffle', 'grana-padano'],
    en: 'Cheese board', az: 'Pendir lövhəsi', ru: 'Сырная тарелка',
    den: 'Four cheeses that sit well together — soft, hard, aged and truffled.',
    daz: 'Bir-birinə yaraşan dörd pendir — yumşaq, bərk, yetişdirilmiş və trüflü.',
    dru: 'Четыре сыра, которые хорошо смотрятся вместе — мягкий, твёрдый, выдержанный и трюфельный.'
  },
  {
    id: 'seafood', off: 12, items: ['black-tiger-shrimp', 'kalmar', 'black-mussels', 'seafood-mix'],
    en: 'Seafood evening', az: 'Dəniz axşamı', ru: 'Морской ужин',
    den: 'Prawns, squid rings, mussels and a marinated mix — dinner for four.',
    daz: 'Krevet, kalmar halqaları, midyə və marinadlanmış qarışıq — dörd nəfərlik şam.',
    dru: 'Креветки, кольца кальмара, мидии и маринованный микс — ужин на четверых.'
  }
])

/* Money, rounded to the cent and printed without trailing zeroes. */
/* A whole number stays clean — the price list reads like a poster, not a
   receipt — but anything with qəpik in it gets both digits. "71.5 AZN" looks
   like a typo, and this figure ends up in the message a customer sends the
   shop. */
export const money = n => {
  const rounded = Math.round(n * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

/* A per-kilo reference price, but only where it tells the customer
   something — a 400 gr tin is worth comparing, a single fish is not. */
/* What a set costs, before and after its discount. */
export function setPricing (set) {
  const items = set.items.map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean)
  /* Bundles from the API carry a quantity per line — two loaves, one tin. The
     bundled fallback sets have none, so the default keeps their arithmetic
     exactly as it was. */
  const qty = id => set.qty?.[id] ?? 1
  const full = items.reduce((sum, p) => sum + p.price * qty(p.id), 0)
  const price = Math.round(full * (1 - set.off / 100))
  return { items, full, price, saving: full - price }
}

export function perKg (p) {
  const u = p.unit
  if (u.kind === 'g') return p.price / (u.qty / 1000)
  if (u.kind === 'kg' && u.qty !== 1) return p.price / u.qty
  return null
}

/* ─────────────────────────────────────────────────────────────────────────
   The real catalogue
   ───────────────────────────────────────────────────────────────────────── */

/** True while the page is showing the bundled copy rather than live data. */
export const catalogueStale = ref(true)

const API = import.meta.env.VITE_API_URL

/**
 * Translate the API's shape into the one this site already speaks.
 *
 * Deliberately an adapter rather than a rewrite of every component: the site
 * was built against this shape, it reads well, and the only thing that had to
 * change is where the numbers come from.
 *
 * Money arrives in qəpik as an integer — which is how it is stored, computed
 * and charged. It is divided here only to be displayed; nothing on this page
 * adds prices up any more.
 */
function adaptProduct (p) {
  return {
    id: p.id,
    cat: p.category_id,
    price: p.price_minor / 100,
    priceMinor: p.price_minor,
    unit: {
      en: p.unit_label?.en ?? '',
      az: p.unit_label?.az ?? '',
      ru: p.unit_label?.ru ?? '',
      kind: p.unit_kind,
      qty: Number(p.unit_qty) || 1,
    },
    en: p.name?.en ?? p.id,
    az: p.name?.az ?? p.name?.en ?? p.id,
    ru: p.name?.ru ?? p.name?.en ?? p.id,
    popular: Boolean(p.is_popular),
    weighed: Boolean(p.is_weight_based),
    den: p.description?.en ?? '',
    daz: p.description?.az ?? '',
    dru: p.description?.ru ?? '',
    /* A photograph uploaded in the admin panel wins; otherwise the picture
       that ships in this bundle. Removing an upload therefore restores the
       original rather than leaving a gap, and a product added today — which
       has no bundled picture at all — shows the one that was uploaded with
       it. */
    img: p.image_url ?? PHOTOS[`../assets/products/${p.image ?? p.id + '.jpg'}`] ?? null,
  }
}

/**
 * A bundle, in the shape the sets section already speaks.
 *
 * The API sends only bundles that are switched on *and* whose every product is
 * in stock, so anything arriving here is genuinely orderable today.
 */
function adaptBundle (b) {
  return {
    id: b.id,
    off: Number(b.discount_percent) || 0,
    items: (b.items ?? []).map(i => i.product_id),
    qty: Object.fromEntries((b.items ?? []).map(i => [i.product_id, Number(i.qty) || 1])),
    en: b.name?.en ?? b.id,
    az: b.name?.az ?? b.name?.en ?? b.id,
    ru: b.name?.ru ?? b.name?.en ?? b.id,
    den: b.description?.en ?? '',
    daz: b.description?.az ?? '',
    dru: b.description?.ru ?? '',
    /* A photograph of the set itself, when the shop has taken one. Null
       otherwise, and the card falls back to the strip of its products —
       which is what every set has looked like until now. */
    img: b.image_url ?? null,
  }
}

/** The API has no "everything" row and no counts; the page wants both. */
function adaptCategories (apiCategories, products) {
  const count = id => products.filter(p => p.cat === id).length
  const pad = n => String(n).padStart(2, '0')

  return [
    { id: 'all', en: 'Everything', az: 'Hamısı', ru: 'Всё', kicker: pad(products.length) },
    ...apiCategories.map(c => ({
      id: c.id,
      en: c.name?.en ?? c.id,
      az: c.name?.az ?? c.name?.en ?? c.id,
      ru: c.name?.ru ?? c.name?.en ?? c.id,
      kicker: pad(count(c.id)),
    })),
  ]
}

/**
 * Fetch the live catalogue and swap it in.
 *
 * Never throws and never blocks the page: if the API is unreachable the
 * bundled copy stays on screen and `catalogueStale` stays true. A shop that
 * shows yesterday's prices is worth more than a shop that shows nothing —
 * which is also why nothing here awaits before the first paint.
 */
export async function loadCatalogue () {
  if (!API) {
    // No API configured — a plain static build of the marketing site. The
    // bundled catalogue is all there is, and that is a valid way to deploy it.
    return
  }

  try {
    const response = await fetch(`${API}/api/catalogue`, {
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return

    const data = await response.json()
    if (!Array.isArray(data.products) || data.products.length === 0) return

    const products = data.products.map(adaptProduct)

    // Mutated in place, so every component already holding a reference to
    // these arrays re-renders without being told.
    PRODUCTS.splice(0, PRODUCTS.length, ...products)
    CATEGORIES.splice(0, CATEGORIES.length, ...adaptCategories(data.categories ?? [], products))

    /* Emptied when the API sends no bundles, rather than falling back to the
       ones in this file. Those three sets and their discounts were invented
       during design and ship switched off; showing them because the shop has
       not switched any on yet would be advertising a price nobody agreed to.
       The admin panel is what turns them on. */
    SETS.splice(0, SETS.length, ...(data.bundles ?? []).map(adaptBundle))

    catalogueStale.value = false
  } catch {
    // Offline, blocked, or CORS. The bundled copy stands.
  }
}
