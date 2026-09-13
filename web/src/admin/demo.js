/**
 * The preview's stand-in for the API.
 *
 * The admin panel is a client for a Laravel API that runs on the shop's own
 * server. This file exists so the panel can be *looked at* without one — a
 * published preview cannot reach a localhost API, and the screens are worth
 * seeing before the server is up.
 *
 * It is compiled in only by `npm run build:admin-demo`. The real build sets no
 * demo flag, the dynamic import below is in a branch Rollup removes, and none
 * of this reaches the panel the shop actually uses. Every number here is
 * invented; the products, their prices and the three sets come from the same
 * bundled catalogue the website falls back to.
 *
 * The shapes match the real endpoints exactly, so the preview exercises the
 * real components rather than a second set written for a demo — if a screen
 * looks right here, it is reading the right fields.
 */

const FIXTURE = {"products":[{"id":"smoked-salmon","category_id":"smoked","category":{"az":"Hisə verilmiş","en":"Smoked Fish","ru":"Копчёности"},"price_minor":6500,"currency":"AZN","unit_kind":"kg","unit_qty":1,"is_weight_based":true,"is_popular":true,"is_active":true,"in_stock":true,"image":"smoked-salmon.jpg","sort":0,"name":{"az":"Hisə verilmiş qızıl balıq","en":"Smoked Salmon","ru":"Лосось холодного копчения"},"description":{"az":"Soyuq üsulla hisə verilmiş qızıl balıq, nazik dilimlənmiş.","en":"Cold-smoked Atlantic salmon, hand-sliced and ready for the board.","ru":"Атлантический лосось холодного копчения, нарезанный вручную."},"unit_label":{"az":"1 kg","en":"1 kg","ru":"1 кг"}},{"id":"smoked-beluga","category_id":"smoked","category":{"az":"Hisə verilmiş","en":"Smoked Fish","ru":"Копчёности"},"price_minor":11000,"currency":"AZN","unit_kind":"kg","unit_qty":1,"is_weight_based":true,"is_popular":true,"is_active":true,"in_stock":true,"image":"smoked-beluga.jpg","sort":1,"name":{"az":"Hisə verilmiş beluqa","en":"Smoked Beluga","ru":"Белуга копчёная"},"description":{"az":"Xəzər beluqası, bütöv halda yavaş hisə verilmiş. Evin bəzəyi.","en":"Caspian beluga sturgeon, slow-smoked whole. The house showpiece.","ru":"Каспийская белуга медленного копчения целиком. Гордость прилавка."},"unit_label":{"az":"1 kg","en":"1 kg","ru":"1 кг"}},{"id":"smoked-mackerel","category_id":"smoked","category":{"az":"Hisə verilmiş","en":"Smoked Fish","ru":"Копчёности"},"price_minor":1000,"currency":"AZN","unit_kind":"pc","unit_qty":1,"is_weight_based":false,"is_popular":false,"is_active":true,"in_stock":true,"image":"smoked-mackerel.jpg","sort":2,"name":{"az":"Hisə verilmiş skumbriya","en":"Smoked Mackerel","ru":"Скумбрия копчёная"},"description":{"az":"Bütöv isti hisə verilmiş skumbriya, yağlı və dadlı.","en":"Whole hot-smoked mackerel, oily and full-flavoured.","ru":"Скумбрия горячего копчения целиком — жирная и насыщенная."},"unit_label":{"az":"1 ədəd","en":"1 piece","ru":"1 шт"}},{"id":"smoked-dorado","category_id":"smoked","category":{"az":"Hisə verilmiş","en":"Smoked Fish","ru":"Копчёности"},"price_minor":1500,"currency":"AZN","unit_kind":"pc","unit_qty":1,"is_weight_based":false,"is_popular":false,"is_active":true,"in_stock":true,"image":"smoked-dorado.jpg","sort":3,"name":{"az":"Hisə verilmiş dorado","en":"Smoked Dorado","ru":"Дорадо копчёная"},"description":{"az":"Bütöv hisə verilmiş dorado — zərif, az duzlu.","en":"Sea bream smoked whole over hardwood — delicate, lightly salted.","ru":"Дорадо целиком, копчёная на твёрдых породах дерева — нежная, слабосолёная."},"unit_label":{"az":"1 ədəd","en":"1 piece","ru":"1 шт"}},{"id":"smoked-trout","category_id":"smoked","category":{"az":"Hisə verilmiş","en":"Smoked Fish","ru":"Копчёности"},"price_minor":900,"currency":"AZN","unit_kind":"pc","unit_qty":1,"is_weight_based":false,"is_popular":false,"is_active":true,"in_stock":true,"image":"smoked-trout.jpg","sort":4,"name":{"az":"Hisə verilmiş forel","en":"Smoked Trout","ru":"Форель копчёная"},"description":{"az":"Bütöv hisə verilmiş forel — hər gün üçün sevimli seçim.","en":"Whole smoked trout — the everyday favourite of the smoke house.","ru":"Форель целиком горячего копчения — ежедневный фаворит коптильни."},"unit_label":{"az":"1 ədəd","en":"1 piece","ru":"1 шт"}},{"id":"escolar","category_id":"smoked","category":{"az":"Hisə verilmiş","en":"Smoked Fish","ru":"Копчёности"},"price_minor":7000,"currency":"AZN","unit_kind":"kg","unit_qty":1,"is_weight_based":true,"is_popular":false,"is_active":true,"in_stock":true,"image":"escolar.jpg","sort":5,"name":{"az":"Eskolar","en":"Escolar","ru":"Эсколар"},"description":{"az":"Yağlı ağ balıq, hisə verilmiş və dilimlənmiş halda.","en":"Buttery white fish, smoked and sliced into a ready tray.","ru":"Маслянистая белая рыба, копчёная и нарезанная в готовый лоток."},"unit_label":{"az":"1 kg","en":"1 kg","ru":"1 кг"}},{"id":"salmon-steaks","category_id":"fresh","category":{"az":"Təzə balıqlar","en":"Fresh Fish","ru":"Свежая рыба"},"price_minor":6000,"currency":"AZN","unit_kind":"kg","unit_qty":1,"is_weight_based":true,"is_popular":true,"is_active":true,"in_stock":true,"image":"salmon-steaks.jpg","sort":6,"name":{"az":"Qızıl balıq steyki","en":"Salmon Steaks","ru":"Стейки лосося"},"description":{"az":"Sifarişlə kəsilmiş qızıl balıq steyki, buz üzərində çatdırılır.","en":"Bone-in salmon steaks cut to order, delivered on ice.","ru":"Стейки лосося на кости, режем под заказ, привозим на льду."},"unit_label":{"az":"1 kg","en":"1 kg","ru":"1 кг"}},{"id":"beluga-steaks","category_id":"fresh","category":{"az":"Təzə balıqlar","en":"Fresh Fish","ru":"Свежая рыба"},"price_minor":5500,"currency":"AZN","unit_kind":"kg","unit_qty":1,"is_weight_based":true,"is_popular":false,"is_active":true,"in_stock":true,"image":"beluga-steaks.jpg","sort":7,"name":{"az":"Beluqa steyki","en":"Beluga Steaks","ru":"Стейки белуги"},"description":{"az":"Qalın nərə balığı steyki — sıx, ətli, qril üçün ideal.","en":"Thick sturgeon steaks — firm, meaty, made for the grill.","ru":"Толстые осетровые стейки — плотные, мясистые, созданы для гриля."},"unit_label":{"az":"1 kg","en":"1 kg","ru":"1 кг"}},{"id":"sudak","category_id":"fresh","category":{"az":"Təzə balıqlar","en":"Fresh Fish","ru":"Свежая рыба"},"price_minor":1900,"currency":"AZN","unit_kind":"kg","unit_qty":1,"is_weight_based":true,"is_popular":false,"is_active":true,"in_stock":true,"image":"sudak.jpg","sort":8,"name":{"az":"Sudak","en":"Pike-Perch","ru":"Судак"},"description":{"az":"Ağ ətli, az yağlı çay balığı. Qızartma üçün əladır.","en":"Lean freshwater fish with clean white flesh. Best pan-fried.","ru":"Постная речная рыба с чистым белым мясом. Лучше всего на сковороде."},"unit_label":{"az":"1 kg","en":"1 kg","ru":"1 кг"}},{"id":"fresh-dorado","category_id":"fresh","category":{"az":"Təzə balıqlar","en":"Fresh Fish","ru":"Свежая рыба"},"price_minor":2600,"currency":"AZN","unit_kind":"kg","unit_qty":1,"is_weight_based":true,"is_popular":false,"is_active":true,"in_stock":true,"image":"fresh-dorado.jpg","sort":9,"name":{"az":"Təzə dorado","en":"Fresh Dorado","ru":"Дорадо свежая"},"description":{"az":"Bütöv dorado, sifarişlə təmizlənir.","en":"Whole gilt-head bream, gutted and scaled on request.","ru":"Дорадо целиком, чистим и потрошим по запросу."},"unit_label":{"az":"1 kg","en":"1 kg","ru":"1 кг"}},{"id":"fresh-levrek","category_id":"fresh","category":{"az":"Təzə balıqlar","en":"Fresh Fish","ru":"Свежая рыба"},"price_minor":2900,"currency":"AZN","unit_kind":"kg","unit_qty":1,"is_weight_based":true,"is_popular":false,"is_active":true,"in_stock":true,"image":"fresh-levrek.jpg","sort":10,"name":{"az":"Təzə levrek","en":"Fresh Sea Bass","ru":"Сибас свежий"},"description":{"az":"Bütöv levrek — yumşaq dadlı, limonla bişirmək üçün əla.","en":"Whole sea bass — mild, flaky, excellent baked with lemon.","ru":"Сибас целиком — мягкий, нежный, отлично запекается с лимоном."},"unit_label":{"az":"1 kg","en":"1 kg","ru":"1 кг"}},{"id":"fresh-forel","category_id":"fresh","category":{"az":"Təzə balıqlar","en":"Fresh Fish","ru":"Свежая рыба"},"price_minor":2000,"currency":"AZN","unit_kind":"kg","unit_qty":1,"is_weight_based":true,"is_popular":false,"is_active":true,"in_stock":true,"image":"fresh-forel.jpg","sort":11,"name":{"az":"Təzə forel filesi","en":"Fresh Trout Fillet","ru":"Филе форели"},"description":{"az":"Dərili forel filesi, sümüksüz, bişirməyə hazır.","en":"Skin-on trout fillets, pin-boned and ready to cook.","ru":"Филе форели на коже, без костей, готово к приготовлению."},"unit_label":{"az":"1 kg","en":"1 kg","ru":"1 кг"}},{"id":"tuna-loin","category_id":"seafood","category":{"az":"Dəniz məhsulları","en":"Seafood","ru":"Морепродукты"},"price_minor":5000,"currency":"AZN","unit_kind":"kg","unit_qty":1,"is_weight_based":true,"is_popular":true,"is_active":true,"in_stock":true,"image":"tuna-loin.jpg","sort":12,"name":{"az":"Tunes filesi","en":"Tuna Loin","ru":"Филе тунца, лоин"},"description":{"az":"Bütöv tunes filesi, tünd qırmızı, sashimi keyfiyyətli.","en":"Whole yellowfin loin, deep red and sashimi-grade when fresh.","ru":"Цельный лоин жёлтопёрого тунца, тёмно-красный, качества сашими."},"unit_label":{"az":"1 kg","en":"1 kg","ru":"1 кг"}},{"id":"tuna-frozen","category_id":"seafood","category":{"az":"Dəniz məhsulları","en":"Seafood","ru":"Морепродукты"},"price_minor":6800,"currency":"AZN","unit_kind":"kg","unit_qty":1,"is_weight_based":true,"is_popular":false,"is_active":true,"in_stock":true,"image":"tuna-frozen.jpg","sort":13,"name":{"az":"Dondurulmuş tunes","en":"Tuna, Frozen Portions","ru":"Тунец, порции"},"description":{"az":"Vakuumda dondurulmuş tunes porsiyaları.","en":"Vacuum-packed tuna portions, individually frozen at sea.","ru":"Порции тунца в вакууме, замороженные прямо в море."},"unit_label":{"az":"1 kg","en":"1 kg","ru":"1 кг"}},{"id":"atlantic-lobster","category_id":"seafood","category":{"az":"Dəniz məhsulları","en":"Seafood","ru":"Морепродукты"},"price_minor":6000,"currency":"AZN","unit_kind":"pc","unit_qty":400,"is_weight_based":false,"is_popular":false,"is_active":true,"in_stock":true,"image":"atlantic-lobster.jpg","sort":14,"name":{"az":"Atlantik omar","en":"Atlantic Lobster","ru":"Атлантический лобстер"},"description":{"az":"Bütöv bişmiş Kanada omarı, qabığında dondurulmuş.","en":"Whole cooked Canadian lobster, frozen in the shell.","ru":"Канадский лобстер целиком, варёный, замороженный в панцире."},"unit_label":{"az":"400 gr","en":"400 gr","ru":"400 г"}},{"id":"octopus-salgado","category_id":"seafood","category":{"az":"Dəniz məhsulları","en":"Seafood","ru":"Морепродукты"},"price_minor":7200,"currency":"AZN","unit_kind":"kg","unit_qty":1,"is_weight_based":true,"is_popular":false,"is_active":true,"in_stock":true,"image":"octopus-salgado.jpg","sort":15,"name":{"az":"Salqado osminoq","en":"Salgado Octopus","ru":"Осьминог Salgado"},"description":{"az":"Bütöv Atlantik osminoq, təmizlənmiş və qablaşdırılmış.","en":"Whole Atlantic octopus, cleaned and portioned in trays.","ru":"Атлантический осьминог целиком, очищенный и разложенный в лотки."},"unit_label":{"az":"1 kg","en":"1 kg","ru":"1 кг"}},{"id":"crab-sticks","category_id":"seafood","category":{"az":"Dəniz məhsulları","en":"Seafood","ru":"Морепродукты"},"price_minor":1100,"currency":"AZN","unit_kind":"pc","unit_qty":1,"is_weight_based":false,"is_popular":false,"is_active":true,"in_stock":true,"image":"crab-sticks.jpg","sort":16,"name":{"az":"Krab çubuqları","en":"Crab Sticks","ru":"Крабовые палочки"},"description":{"az":"Salat və rulet üçün surimi çubuqları — hazır məhsul.","en":"Surimi sticks for salads and rolls — chilled, ready to use.","ru":"Сурими для салатов и роллов — охлаждённые, готовы к использованию."},"unit_label":{"az":"1 paket","en":"1 pack","ru":"1 упак"}},{"id":"anchovy-fillet","category_id":"seafood","category":{"az":"Dəniz məhsulları","en":"Seafood","ru":"Морепродукты"},"price_minor":500,"currency":"AZN","unit_kind":"pc","unit_qty":1,"is_weight_based":false,"is_popular":false,"is_active":true,"in_stock":true,"image":"anchovy-fillet.jpg","sort":17,"name":{"az":"Ançous filesi","en":"Anchovy Fillets","ru":"Филе анчоуса"},"description":{"az":"Yağda marinadlanmış ançous filesi — duzlu, kəskin dadlı.","en":"Marinated anchovy fillets in oil — salty, sharp, for antipasti.","ru":"Маринованное филе анчоуса в масле — солёное, яркое, для антипасти."},"unit_label":{"az":"1 paket","en":"1 pack","ru":"1 упак"}},{"id":"baby-octopus","category_id":"seafood","category":{"az":"Dəniz məhsulları","en":"Seafood","ru":"Морепродукты"},"price_minor":2900,"currency":"AZN","unit_kind":"kg","unit_qty":1,"is_weight_based":true,"is_popular":false,"is_active":true,"in_stock":true,"image":"baby-octopus.jpg","sort":18,"name":{"az":"Balaca osminoq","en":"Baby Octopus","ru":"Мини-осьминог"},"description":{"az":"Bütöv balaca osminoq, təmizlənmiş və dondurulmuş.","en":"Whole baby octopus, cleaned and frozen. Tender in minutes.","ru":"Молодой осьминог целиком, очищенный и замороженный. Готовится за минуты."},"unit_label":{"az":"1 kg","en":"1 kg","ru":"1 кг"}},{"id":"unagi-frozen","category_id":"seafood","category":{"az":"Dəniz məhsulları","en":"Seafood","ru":"Морепродукты"},"price_minor":7000,"currency":"AZN","unit_kind":"kg","unit_qty":1,"is_weight_based":true,"is_popular":false,"is_active":true,"in_stock":true,"image":"unagi-frozen.jpg","sort":19,"name":{"az":"Unaqi — dondurulmuş ilan balığı","en":"Unagi, Glazed Eel","ru":"Унаги, угорь в глазури"},"description":{"az":"Yapon üsulu qrildə bişmiş ilan balığı, kabayaki sousunda.","en":"Japanese-style grilled eel in kabayaki glaze. Heat and serve.","ru":"Угорь на гриле по-японски в соусе кабаяки. Разогреть и подавать."},"unit_label":{"az":"1 kg","en":"1 kg","ru":"1 кг"}},{"id":"mussel-meat","category_id":"seafood","category":{"az":"Dəniz məhsulları","en":"Seafood","ru":"Морепродукты"},"price_minor":2000,"currency":"AZN","unit_kind":"kg","unit_qty":1,"is_weight_based":true,"is_popular":false,"is_active":true,"in_stock":true,"image":"mussel-meat.jpg","sort":20,"name":{"az":"Midyə əti","en":"Mussel Meat","ru":"Мясо мидий"},"description":{"az":"Qabıqdan çıxarılmış midyə əti, dondurulmuş.","en":"Shelled mussel meat, blanched and frozen loose for easy cooking.","ru":"Очищенное мясо мидий, бланшированное и замороженное россыпью."},"unit_label":{"az":"1 kg","en":"1 kg","ru":"1 кг"}},{"id":"green-mussels","category_id":"seafood","category":{"az":"Dəniz məhsulları","en":"Seafood","ru":"Морепродукты"},"price_minor":3900,"currency":"AZN","unit_kind":"kg","unit_qty":1,"is_weight_based":true,"is_popular":false,"is_active":true,"in_stock":false,"image":"green-mussels.jpg","sort":21,"name":{"az":"Yaşıl midyə","en":"NZ Greenshell Mussels","ru":"Зелёные мидии, Новая Зеландия"},"description":{"az":"Yeni Zelandiya yarım qabıqlı midyəsi — ətli və şirin.","en":"New Zealand half-shell mussels — plump, sweet, restaurant grade.","ru":"Новозеландские мидии на половинке раковины — крупные и сладкие."},"unit_label":{"az":"1 kg","en":"1 kg","ru":"1 кг"}},{"id":"black-tiger-shrimp","category_id":"seafood","category":{"az":"Dəniz məhsulları","en":"Seafood","ru":"Морепродукты"},"price_minor":5900,"currency":"AZN","unit_kind":"kg","unit_qty":1,"is_weight_based":true,"is_popular":true,"is_active":true,"in_stock":true,"image":"black-tiger-shrimp.jpg","sort":22,"name":{"az":"Black tiger krevet, başlı","en":"Black Tiger Prawns, Head-On","ru":"Креветки блэк тайгер, с головой"},"description":{"az":"8/12 ölçülü başlı black tiger krevet — iri ölçü.","en":"Size 8/12 head-on tiger prawns — the big ones, shell-on.","ru":"Креветки 8/12 с головой и в панцире — крупный калибр."},"unit_label":{"az":"1 kg","en":"1 kg","ru":"1 кг"}},{"id":"langoustine","category_id":"seafood","category":{"az":"Dəniz məhsulları","en":"Seafood","ru":"Морепродукты"},"price_minor":6200,"currency":"AZN","unit_kind":"kg","unit_qty":1,"is_weight_based":true,"is_popular":false,"is_active":true,"in_stock":false,"image":"langoustine.jpg","sort":23,"name":{"az":"Langustin","en":"Langoustine","ru":"Лангустины"},"description":{"az":"Bütöv langustin, dənizdə dondurulmuş. Qrildə bişirin.","en":"Whole langoustines, frozen at sea. Grill hard and fast.","ru":"Лангустины целиком, заморожены в море. Гриль на сильном огне."},"unit_label":{"az":"1 kg","en":"1 kg","ru":"1 кг"}},{"id":"peeled-shrimp","category_id":"seafood","category":{"az":"Dəniz məhsulları","en":"Seafood","ru":"Морепродукты"},"price_minor":3500,"currency":"AZN","unit_kind":"kg","unit_qty":1,"is_weight_based":true,"is_popular":false,"is_active":true,"in_stock":true,"image":"peeled-shrimp.jpg","sort":24,"name":{"az":"Təmizlənmiş krevetlər","en":"Peeled Shrimp","ru":"Креветки очищенные"},"description":{"az":"Bişmiş, təmizlənmiş krevet — makaron və salatlar üçün.","en":"Cooked, peeled and deveined — straight into pasta or salad.","ru":"Варёные и очищенные — сразу в пасту или салат."},"unit_label":{"az":"1 kg","en":"1 kg","ru":"1 кг"}},{"id":"korolevskiy-shrimp","category_id":"seafood","category":{"az":"Dəniz məhsulları","en":"Seafood","ru":"Морепродукты"},"price_minor":2900,"currency":"AZN","unit_kind":"kg","unit_qty":1,"is_weight_based":true,"is_popular":false,"is_active":true,"in_stock":true,"image":"korolevskiy-shrimp.jpg","sort":25,"name":{"az":"Korolevskiy krevetlər","en":"King Shrimp, Shell-On","ru":"Королевские креветки в панцире"},"description":{"az":"Qabıqlı çiy korolevskiy krevet — sərfəli seçim.","en":"Raw shell-on king shrimp, sold by the kilo. Best value on the board.","ru":"Сырые королевские креветки в панцире, на развес. Лучшая цена в каталоге."},"unit_label":{"az":"1 kg","en":"1 kg","ru":"1 кг"}},{"id":"red-caviar","category_id":"seafood","category":{"az":"Dəniz məhsulları","en":"Seafood","ru":"Морепродукты"},"price_minor":6500,"currency":"AZN","unit_kind":"pc","unit_qty":200,"is_weight_based":false,"is_popular":true,"is_active":true,"in_stock":true,"image":"red-caviar.jpg","sort":26,"name":{"az":"Qırmızı ikra","en":"Red Caviar","ru":"Красная икра"},"description":{"az":"Az duzlu qızıl balıq kürüsü, bağlı qabda. İki ölçüdə.","en":"Salmon roe, lightly salted, in a sealed tin. Two tin sizes.","ru":"Икра лосося слабого посола в запечатанной банке. Две фасовки."},"unit_label":{"az":"200 gr","en":"200 gr","ru":"200 г"}},{"id":"kalmar","category_id":"seafood","category":{"az":"Dəniz məhsulları","en":"Seafood","ru":"Морепродукты"},"price_minor":2600,"currency":"AZN","unit_kind":"kg","unit_qty":1,"is_weight_based":true,"is_popular":false,"is_active":true,"in_stock":true,"image":"kalmar.jpg","sort":27,"name":{"az":"Kalmar","en":"Squid Rings","ru":"Кольца кальмара"},"description":{"az":"Təmizlənmiş kalmar halqaları, çiy dondurulmuş.","en":"Cleaned squid rings, frozen raw — fry from frozen in two minutes.","ru":"Очищенные кольца кальмара, сырые замороженные — жарятся за две минуты."},"unit_label":{"az":"1 kg","en":"1 kg","ru":"1 кг"}},{"id":"seafood-mix","category_id":"seafood","category":{"az":"Dəniz məhsulları","en":"Seafood","ru":"Морепродукты"},"price_minor":2600,"currency":"AZN","unit_kind":"kg","unit_qty":1,"is_weight_based":true,"is_popular":false,"is_active":true,"in_stock":true,"image":"seafood-mix.jpg","sort":28,"name":{"az":"Dəniz məhsulları qarışığı","en":"Seafood Mix","ru":"Морской коктейль"},"description":{"az":"Krevet, midyə, kalmar və osminoq bir paketdə.","en":"Shrimp, mussels, squid and octopus in one marinated pack.","ru":"Креветки, мидии, кальмар и осьминог в одной маринованной упаковке."},"unit_label":{"az":"1 kg","en":"1 kg","ru":"1 кг"}},{"id":"black-mussels","category_id":"seafood","category":{"az":"Dəniz məhsulları","en":"Seafood","ru":"Морепродукты"},"price_minor":2000,"currency":"AZN","unit_kind":"kg","unit_qty":1,"is_weight_based":true,"is_popular":false,"is_active":true,"in_stock":true,"image":"black-mussels.jpg","sort":29,"name":{"az":"Qara midyə","en":"Black Mussels","ru":"Чёрные мидии"},"description":{"az":"Yarım qabıqlı qara midyə — ağ şərab və sarımsaqla bişirin.","en":"Half-shell black mussels — steam with white wine and garlic.","ru":"Чёрные мидии на половинке раковины — тушить с белым вином и чесноком."},"unit_label":{"az":"1 kg","en":"1 kg","ru":"1 кг"}},{"id":"french-chicken","category_id":"poultry","category":{"az":"Toyuq və ət","en":"Poultry & Meat","ru":"Мясо и птица"},"price_minor":3000,"currency":"AZN","unit_kind":"kg","unit_qty":1,"is_weight_based":true,"is_popular":false,"is_active":true,"in_stock":true,"image":"french-chicken.jpg","sort":30,"name":{"az":"Fransız toyuğu","en":"French Chicken","ru":"Французская курица"},"description":{"az":"Fransadan sertifikatlı bütöv toyuq.","en":"Certified Label Rouge poussin from France, whole in the bag.","ru":"Сертифицированный цыплёнок из Франции, целиком в упаковке."},"unit_label":{"az":"1 kg","en":"1 kg","ru":"1 кг"}},{"id":"kend-colpa-700","category_id":"poultry","category":{"az":"Toyuq və ət","en":"Poultry & Meat","ru":"Мясо и птица"},"price_minor":900,"currency":"AZN","unit_kind":"pc","unit_qty":1,"is_weight_based":false,"is_popular":false,"is_active":true,"in_stock":true,"image":"kend-colpa-700.jpg","sort":31,"name":{"az":"Kənd çolpası, kiçik","en":"Village Poussin, Small","ru":"Деревенский цыплёнок, малый"},"description":{"az":"Kənd çolpası, 700–800 qr. Sarı yağlı, təbii dadlı.","en":"Free-range village chicken, 700–800 gr. Yellow fat, real flavour.","ru":"Цыплёнок свободного выгула, 700–800 г. Жёлтый жир, настоящий вкус."},"unit_label":{"az":"1 əd · 700–800 gr","en":"1 pc · 700–800 gr","ru":"1 шт · 700–800 г"}},{"id":"kend-colpa-800","category_id":"poultry","category":{"az":"Toyuq və ət","en":"Poultry & Meat","ru":"Мясо и птица"},"price_minor":1000,"currency":"AZN","unit_kind":"pc","unit_qty":1,"is_weight_based":false,"is_popular":false,"is_active":true,"in_stock":true,"image":"kend-colpa-800.jpg","sort":32,"name":{"az":"Kənd çolpası, iri","en":"Village Poussin, Large","ru":"Деревенский цыплёнок, крупный"},"description":{"az":"Eyni kənd çolpası, 800–900 qr ölçüdə.","en":"The same village bird, one size up at 800–900 gr.","ru":"Та же деревенская птица, на размер больше — 800–900 г."},"unit_label":{"az":"1 əd · 800–900 gr","en":"1 pc · 800–900 gr","ru":"1 шт · 800–900 г"}},{"id":"peking-duck","category_id":"poultry","category":{"az":"Toyuq və ət","en":"Poultry & Meat","ru":"Мясо и птица"},"price_minor":3000,"currency":"AZN","unit_kind":"kg","unit_qty":1,"is_weight_based":true,"is_popular":true,"is_active":true,"in_stock":true,"image":"peking-duck.jpg","sort":33,"name":{"az":"Pekin ördəyi","en":"Peking Duck","ru":"Пекинская утка"},"description":{"az":"Bütöv pekin ördəyi, sobaya hazır.","en":"Whole Peking duck, prepared for the oven — crisp skin guaranteed.","ru":"Пекинская утка целиком, подготовлена для духовки — корочка гарантирована."},"unit_label":{"az":"1 kg","en":"1 kg","ru":"1 кг"}},{"id":"duck-fillet","category_id":"poultry","category":{"az":"Toyuq və ət","en":"Poultry & Meat","ru":"Мясо и птица"},"price_minor":2400,"currency":"AZN","unit_kind":"pc","unit_qty":1,"is_weight_based":false,"is_popular":false,"is_active":true,"in_stock":true,"image":"duck-fillet.jpg","sort":34,"name":{"az":"Ördək filesi","en":"Duck Breast Fillet","ru":"Филе утиной грудки"},"description":{"az":"Dərili ördək döş filesi, vakuum qablaşdırmada.","en":"Skin-on magret duck breast, vacuum-packed in pairs.","ru":"Утиная грудка магре на коже, в вакууме, по две штуки."},"unit_label":{"az":"1 paket","en":"1 pack","ru":"1 упак"}},{"id":"duck-leg","category_id":"poultry","category":{"az":"Toyuq və ət","en":"Poultry & Meat","ru":"Мясо и птица"},"price_minor":1900,"currency":"AZN","unit_kind":"kg","unit_qty":1,"is_weight_based":true,"is_popular":false,"is_active":true,"in_stock":true,"image":"duck-leg.jpg","sort":35,"name":{"az":"Ördək budu","en":"Duck Legs","ru":"Утиные ножки"},"description":{"az":"Konfi və ya yavaş bişirmə üçün ördək budu.","en":"Duck legs for confit or slow roasting. Sold by the kilo.","ru":"Утиные ножки для конфи или медленного запекания. На развес."},"unit_label":{"az":"1 kg","en":"1 kg","ru":"1 кг"}},{"id":"camembert","category_id":"cheese","category":{"az":"Pendir və süd","en":"Cheese & Dairy","ru":"Сыры и молочное"},"price_minor":1800,"currency":"AZN","unit_kind":"pc","unit_qty":125,"is_weight_based":false,"is_popular":false,"is_active":true,"in_stock":true,"image":"camembert.jpg","sort":36,"name":{"az":"Kamamber pendiri","en":"Camembert","ru":"Камамбер"},"description":{"az":"Normandiyadan yumşaq inək pendiri. Otaq temperaturunda verin.","en":"Soft bloomy-rind cow cheese from Normandy. Serve at room temperature.","ru":"Мягкий сыр с белой плесенью из Нормандии. Подавать комнатной температуры."},"unit_label":{"az":"125 gr","en":"125 gr","ru":"125 г"}},{"id":"brie","category_id":"cheese","category":{"az":"Pendir və süd","en":"Cheese & Dairy","ru":"Сыры и молочное"},"price_minor":1800,"currency":"AZN","unit_kind":"pc","unit_qty":125,"is_weight_based":false,"is_popular":false,"is_active":true,"in_stock":true,"image":"brie.jpg","sort":37,"name":{"az":"Bri pendiri","en":"Brie","ru":"Бри"},"description":{"az":"Ağ qabıqlı, yumşaq və kremvari pendir.","en":"Mild, buttery and creamy under a white rind. A board essential.","ru":"Мягкий, сливочный, с белой корочкой. Основа любой сырной тарелки."},"unit_label":{"az":"125 gr","en":"125 gr","ru":"125 г"}},{"id":"parmigiano-reggiano","category_id":"cheese","category":{"az":"Pendir və süd","en":"Cheese & Dairy","ru":"Сыры и молочное"},"price_minor":2700,"currency":"AZN","unit_kind":"pc","unit_qty":230,"is_weight_based":false,"is_popular":true,"is_active":true,"in_stock":true,"image":"parmigiano-reggiano.jpg","sort":38,"name":{"az":"Parmicano Recano","en":"Parmigiano Reggiano","ru":"Пармиджано Реджано"},"description":{"az":"DOP sertifikatlı, Emiliya-Romanyada yetişdirilmiş bərk pendir.","en":"DOP hard cheese aged in Emilia-Romagna. Cut from the wheel.","ru":"Твёрдый сыр DOP, выдержанный в Эмилии-Романье. Отрезаем от головы."},"unit_label":{"az":"230 gr","en":"230 gr","ru":"230 г"}},{"id":"baby-truffle","category_id":"cheese","category":{"az":"Pendir və süd","en":"Cheese & Dairy","ru":"Сыры и молочное"},"price_minor":4600,"currency":"AZN","unit_kind":"pc","unit_qty":280,"is_weight_based":false,"is_popular":false,"is_active":true,"in_stock":true,"image":"baby-truffle.jpg","sort":39,"name":{"az":"Qara trüflü pendir","en":"Black Truffle Gouda","ru":"Гауда с чёрным трюфелем"},"description":{"az":"Qara trüf əlavəli Hollandiya pendiri. Zəngin ətirli.","en":"Dutch baby gouda studded with black truffle. Deep and earthy.","ru":"Голландская молодая гауда с чёрным трюфелем. Глубокий землистый вкус."},"unit_label":{"az":"280 gr","en":"280 gr","ru":"280 г"}},{"id":"baby-green-pesto","category_id":"cheese","category":{"az":"Pendir və süd","en":"Cheese & Dairy","ru":"Сыры и молочное"},"price_minor":4300,"currency":"AZN","unit_kind":"pc","unit_qty":280,"is_weight_based":false,"is_popular":false,"is_active":true,"in_stock":true,"image":"baby-green-pesto.jpg","sort":40,"name":{"az":"Yaşıl pesto pendiri","en":"Green Pesto Gouda","ru":"Гауда с зелёным песто"},"description":{"az":"Reyhan pestosu ilə hazırlanmış pendir — parlaq yaşıl rəngli.","en":"Baby gouda blended with basil pesto — bright green, herbaceous.","ru":"Молодая гауда с песто из базилика — ярко-зелёная, травяная."},"unit_label":{"az":"280 gr","en":"280 gr","ru":"280 г"}},{"id":"grana-padano","category_id":"cheese","category":{"az":"Pendir və süd","en":"Cheese & Dairy","ru":"Сыры и молочное"},"price_minor":2100,"currency":"AZN","unit_kind":"pc","unit_qty":200,"is_weight_based":false,"is_popular":false,"is_active":true,"in_stock":true,"image":"grana-padano.jpg","sort":41,"name":{"az":"Qrana Padano","en":"Grana Padano","ru":"Грана Падано"},"description":{"az":"Yetişdirilmiş İtalyan pendiri — parmicanodan yumşaqdır.","en":"Aged Italian grating cheese — milder and softer than Parmigiano.","ru":"Выдержанный итальянский сыр для тёрки — мягче и нежнее пармезана."},"unit_label":{"az":"200 gr","en":"200 gr","ru":"200 г"}},{"id":"butter","category_id":"cheese","category":{"az":"Pendir və süd","en":"Cheese & Dairy","ru":"Сыры и молочное"},"price_minor":2500,"currency":"AZN","unit_kind":"kg","unit_qty":1,"is_weight_based":true,"is_popular":false,"is_active":true,"in_stock":true,"image":"butter.jpg","sort":42,"name":{"az":"Kərə yağı","en":"Butter","ru":"Сливочное масло"},"description":{"az":"Təbii kərə yağı, kiloqramla kəsilir.","en":"Cultured block butter, cut to the kilo. For baking and the table.","ru":"Сливочное масло брусками, режем на килограммы. Для выпечки и на стол."},"unit_label":{"az":"1 kg","en":"1 kg","ru":"1 кг"}},{"id":"burrata-truffle","category_id":"cheese","category":{"az":"Pendir və süd","en":"Cheese & Dairy","ru":"Сыры и молочное"},"price_minor":1500,"currency":"AZN","unit_kind":"pc","unit_qty":200,"is_weight_based":false,"is_popular":true,"is_active":true,"in_stock":true,"image":"burrata-truffle.jpg","sort":43,"name":{"az":"Trüflü burrata","en":"Truffle Burrata","ru":"Буррата с трюфелем"},"description":{"az":"İçi trüflü kremli təzə burrata. Gəldiyi gün yeyin.","en":"Fresh burrata with a truffled cream centre. Eat the day it lands.","ru":"Свежая буррата с трюфельными сливками внутри. Съесть в день доставки."},"unit_label":{"az":"200 gr","en":"200 gr","ru":"200 г"}},{"id":"gouda","category_id":"cheese","category":{"az":"Pendir və süd","en":"Cheese & Dairy","ru":"Сыры и молочное"},"price_minor":1100,"currency":"AZN","unit_kind":"pc","unit_qty":200,"is_weight_based":false,"is_popular":false,"is_active":true,"in_stock":true,"image":"gouda.jpg","sort":44,"name":{"az":"Qauda pendiri","en":"Gouda","ru":"Гауда"},"description":{"az":"Yarımbərk Hollandiya pendiri — dilimlənən, əriyən.","en":"Semi-hard Dutch gouda — sliceable, melts well, everyday cheese.","ru":"Полутвёрдая голландская гауда — режется, плавится, на каждый день."},"unit_label":{"az":"200 gr","en":"200 gr","ru":"200 г"}},{"id":"pizza-cheese","category_id":"cheese","category":{"az":"Pendir və süd","en":"Cheese & Dairy","ru":"Сыры и молочное"},"price_minor":700,"currency":"AZN","unit_kind":"pc","unit_qty":200,"is_weight_based":false,"is_popular":false,"is_active":true,"in_stock":true,"image":"pizza-cheese.jpg","sort":45,"name":{"az":"Pizza pendiri","en":"Pizza Cheese, Grated","ru":"Сыр для пиццы, тёртый"},"description":{"az":"Doğranmış pizza pendiri — istilikdə yaxşı uzanır.","en":"Pre-grated mozzarella blend that stretches properly under heat.","ru":"Готовая тёртая смесь моцареллы, которая правильно тянется."},"unit_label":{"az":"200 gr","en":"200 gr","ru":"200 г"}},{"id":"halloumi","category_id":"cheese","category":{"az":"Pendir və süd","en":"Cheese & Dairy","ru":"Сыры и молочное"},"price_minor":1000,"currency":"AZN","unit_kind":"pc","unit_qty":250,"is_weight_based":false,"is_popular":false,"is_active":true,"in_stock":true,"image":"halloumi.jpg","sort":46,"name":{"az":"Hellim pendiri","en":"Halloumi","ru":"Халуми"},"description":{"az":"Qrildə formasını saxlayan pendir. Duzlu dadlı.","en":"Grilling cheese that holds its shape in the pan. Squeaky and salty.","ru":"Сыр для гриля, держит форму на сковороде. Солёный, поскрипывает."},"unit_label":{"az":"250 gr","en":"250 gr","ru":"250 г"}},{"id":"organic-feta","category_id":"cheese","category":{"az":"Pendir və süd","en":"Cheese & Dairy","ru":"Сыры и молочное"},"price_minor":900,"currency":"AZN","unit_kind":"pc","unit_qty":250,"is_weight_based":false,"is_popular":false,"is_active":true,"in_stock":true,"image":"organic-feta.jpg","sort":47,"name":{"az":"Orqanik feta","en":"Organic Feta","ru":"Органическая фета"},"description":{"az":"Duzlu suda saxlanan orqanik feta — salat və xəmir üçün.","en":"Brined organic feta — crumbly, tangy, for salads and pastry.","ru":"Органическая фета в рассоле — крошится, кислит, для салатов и выпечки."},"unit_label":{"az":"250 gr","en":"250 gr","ru":"250 г"}},{"id":"frozen-croissant","category_id":"pantry","category":{"az":"Xəmir və şirniyyat","en":"Pastry & Pantry","ru":"Выпечка и сладости"},"price_minor":2500,"currency":"AZN","unit_kind":"pc","unit_qty":10,"is_weight_based":false,"is_popular":true,"is_active":true,"in_stock":true,"image":"frozen-croissant.jpg","sort":48,"name":{"az":"Dondurulmuş kruassan","en":"Frozen Croissants","ru":"Круассаны замороженные"},"description":{"az":"Çiy kərə yağlı kruassan — gecə açılır, səhər bişirilir.","en":"Raw butter croissants — prove overnight, bake in the morning.","ru":"Сырые масляные круассаны — расстоять ночью, испечь утром."},"unit_label":{"az":"min. 10 əd","en":"min. 10 pcs","ru":"от 10 шт"}},{"id":"frozen-bagels","category_id":"pantry","category":{"az":"Xəmir və şirniyyat","en":"Pastry & Pantry","ru":"Выпечка и сладости"},"price_minor":2500,"currency":"AZN","unit_kind":"pc","unit_qty":10,"is_weight_based":false,"is_popular":false,"is_active":true,"in_stock":true,"image":"frozen-bagels.jpg","sort":49,"name":{"az":"Dondurulmuş beygel","en":"Frozen Bagels","ru":"Бейглы замороженные"},"description":{"az":"Yarımbişmiş beygel — sobada tamamlayın.","en":"Par-baked bagels — finish in the oven for a proper crust.","ru":"Бейглы полуготовые — доводятся в духовке до правильной корочки."},"unit_label":{"az":"min. 10 əd","en":"min. 10 pcs","ru":"от 10 шт"}},{"id":"tortilla-lavash","category_id":"pantry","category":{"az":"Xəmir və şirniyyat","en":"Pastry & Pantry","ru":"Выпечка и сладости"},"price_minor":1300,"currency":"AZN","unit_kind":"kg","unit_qty":1.5,"is_weight_based":true,"is_popular":false,"is_active":true,"in_stock":true,"image":"tortilla-lavash.jpg","sort":50,"name":{"az":"Tortilla lavaş","en":"Tortilla Lavash","ru":"Тортилья лаваш"},"description":{"az":"1.5 kq-lıq paketdə yumşaq buğda lavaşı.","en":"Soft wheat tortillas in a 1.5 kg catering pack. For wraps and shawarma.","ru":"Мягкие пшеничные тортильи в упаковке 1,5 кг. Для роллов и шаурмы."},"unit_label":{"az":"1.5 kg","en":"1.5 kg","ru":"1,5 кг"}},{"id":"kitkat-matcha","category_id":"pantry","category":{"az":"Xəmir və şirniyyat","en":"Pastry & Pantry","ru":"Выпечка и сладости"},"price_minor":1300,"currency":"AZN","unit_kind":"pc","unit_qty":1,"is_weight_based":false,"is_popular":false,"is_active":true,"in_stock":true,"image":"kitkat-matcha.jpg","sort":51,"name":{"az":"KitKat matça","en":"KitKat Matcha","ru":"KitKat матча"},"description":{"az":"Yapon mini KitKat, tünd matça dadında.","en":"Japanese mini KitKat in dark matcha — bitter green tea, less sugar.","ru":"Японский мини-KitKat с тёмной матчей — горчинка зелёного чая, меньше сахара."},"unit_label":{"az":"1 paket","en":"1 pack","ru":"1 упак"}},{"id":"kitkat-matcha-latte","category_id":"pantry","category":{"az":"Xəmir və şirniyyat","en":"Pastry & Pantry","ru":"Выпечка и сладости"},"price_minor":900,"currency":"AZN","unit_kind":"pc","unit_qty":1,"is_weight_based":false,"is_popular":false,"is_active":true,"in_stock":true,"image":"kitkat-matcha-latte.jpg","sort":52,"name":{"az":"KitKat matça latte","en":"KitKat Matcha Latte","ru":"KitKat матча латте"},"description":{"az":"Daha şirin və südlü matça versiyası.","en":"Sweeter, milkier matcha edition from the Japanese range.","ru":"Более сладкая и молочная версия матчи из японской линейки."},"unit_label":{"az":"1 paket","en":"1 pack","ru":"1 упак"}},{"id":"kitkat-strawberry","category_id":"pantry","category":{"az":"Xəmir və şirniyyat","en":"Pastry & Pantry","ru":"Выпечка и сладости"},"price_minor":1300,"currency":"AZN","unit_kind":"pc","unit_qty":1,"is_weight_based":false,"is_popular":false,"is_active":true,"in_stock":true,"image":"kitkat-strawberry.jpg","sort":53,"name":{"az":"KitKat çiyələk","en":"KitKat Strawberry","ru":"KitKat клубника"},"description":{"az":"Yapon çiyələkli KitKat — ayrı-ayrı bükülmüş.","en":"Japanese strawberry KitKat — pink, fruity, individually wrapped.","ru":"Японский клубничный KitKat — розовый, фруктовый, в индивидуальной упаковке."},"unit_label":{"az":"1 paket","en":"1 pack","ru":"1 упак"}}],"bundles":[{"id":"breakfast","discount_percent":10,"is_active":false,"sort":0,"name":{"az":"Həftəsonu səhər yeməyi","en":"Weekend breakfast","ru":"Выходной завтрак"},"description":{"az":"Səhər bişirmək üçün kruassan, kərə yağı, bri pendiri və bir qab qırmızı ikra.","en":"Croissants to bake in the morning, butter, brie and a tin of red caviar.","ru":"Круассаны для утренней выпечки, масло, бри и банка красной икры."},"items":[{"product_id":"frozen-croissant","qty":1,"name":{"az":"Dondurulmuş kruassan","en":"Frozen Croissants","ru":"Круассаны замороженные"},"price_minor":2500,"orderable":true},{"product_id":"butter","qty":1,"name":{"az":"Kərə yağı","en":"Butter","ru":"Сливочное масло"},"price_minor":2500,"orderable":true},{"product_id":"brie","qty":1,"name":{"az":"Bri pendiri","en":"Brie","ru":"Бри"},"price_minor":1800,"orderable":true},{"product_id":"red-caviar","qty":1,"name":{"az":"Qırmızı ikra","en":"Red Caviar","ru":"Красная икра"},"price_minor":6500,"orderable":true}]},{"id":"cheeseboard","discount_percent":12,"is_active":false,"sort":1,"name":{"az":"Pendir lövhəsi","en":"Cheese board","ru":"Сырная тарелка"},"description":{"az":"Bir-birinə yaraşan dörd pendir — yumşaq, bərk, yetişdirilmiş və trüflü.","en":"Four cheeses that sit well together — soft, hard, aged and truffled.","ru":"Четыре сыра, которые хорошо смотрятся вместе — мягкий, твёрдый, выдержанный и трюфельный."},"items":[{"product_id":"camembert","qty":1,"name":{"az":"Kamamber pendiri","en":"Camembert","ru":"Камамбер"},"price_minor":1800,"orderable":true},{"product_id":"parmigiano-reggiano","qty":1,"name":{"az":"Parmicano Recano","en":"Parmigiano Reggiano","ru":"Пармиджано Реджано"},"price_minor":2700,"orderable":true},{"product_id":"baby-truffle","qty":1,"name":{"az":"Qara trüflü pendir","en":"Black Truffle Gouda","ru":"Гауда с чёрным трюфелем"},"price_minor":4600,"orderable":true},{"product_id":"grana-padano","qty":1,"name":{"az":"Qrana Padano","en":"Grana Padano","ru":"Грана Падано"},"price_minor":2100,"orderable":true}]},{"id":"seafood","discount_percent":12,"is_active":false,"sort":2,"name":{"az":"Dəniz axşamı","en":"Seafood evening","ru":"Морской ужин"},"description":{"az":"Krevet, kalmar halqaları, midyə və marinadlanmış qarışıq — dörd nəfərlik şam.","en":"Prawns, squid rings, mussels and a marinated mix — dinner for four.","ru":"Креветки, кольца кальмара, мидии и маринованный микс — ужин на четверых."},"items":[{"product_id":"black-tiger-shrimp","qty":1,"name":{"az":"Black tiger krevet, başlı","en":"Black Tiger Prawns, Head-On","ru":"Креветки блэк тайгер, с головой"},"price_minor":5900,"orderable":true},{"product_id":"kalmar","qty":1,"name":{"az":"Kalmar","en":"Squid Rings","ru":"Кольца кальмара"},"price_minor":2600,"orderable":true},{"product_id":"black-mussels","qty":1,"name":{"az":"Qara midyə","en":"Black Mussels","ru":"Чёрные мидии"},"price_minor":2000,"orderable":true},{"product_id":"seafood-mix","qty":1,"name":{"az":"Dəniz məhsulları qarışığı","en":"Seafood Mix","ru":"Морской коктейль"},"price_minor":2600,"orderable":true}]}]}

/* Mutable, so clicking a switch in the preview behaves like clicking one for
   real: the row changes, the dashboard follows, and the change log grows. */
const db = {
  products: FIXTURE.products.map(p => ({ ...p })),
  bundles: FIXTURE.bundles.map(b => ({ ...b, items: b.items.map(i => ({ ...i })) })),
  zones: [
    { id: 'baku-city', fee_minor: 0, min_order_minor: 0, is_active: true, sort: 0,
      name: { az: 'Bakı şəhəri', en: 'Baku city', ru: 'Город Баку' } },
    { id: 'baku-around', fee_minor: 0, min_order_minor: 0, is_active: true, sort: 1,
      name: { az: 'Bakı ətrafı', en: 'Around Baku', ru: 'Пригород Баку' } },
  ],
  customers: [
    { id: 'u1', name: 'Leyla Məmmədova', email: 'leyla@example.com', phone: '+994501234567',
      role: 'customer', locale: 'az', blocked_at: null, anonymised_at: null,
      orders_count: 7, created_at: '2026-06-02T10:12:00Z' },
    { id: 'u2', name: 'Rəşad Quliyev', email: 'reshad@example.com', phone: '+994557654321',
      role: 'customer', locale: 'az', blocked_at: null, anonymised_at: null,
      orders_count: 3, created_at: '2026-07-18T16:40:00Z' },
    { id: 'u3', name: 'Anna Petrova', email: 'anna@example.com', phone: '+994702223344',
      role: 'customer', locale: 'ru', blocked_at: null, anonymised_at: null,
      orders_count: 1, created_at: '2026-08-29T09:05:00Z' },
    { id: 'u4', name: 'Kamran (kuryer)', email: 'kamran@example.com', phone: '+994505558899',
      role: 'courier', locale: 'az', blocked_at: null, anonymised_at: null,
      orders_count: 0, created_at: '2026-05-11T08:00:00Z' },
  ],
  orders: [],
  audits: [],
}

/* ── A few days of trade ─────────────────────────────────────────────────── */

const iso = (daysFromNow, hour = 11) => {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}
const day = n => iso(n).slice(0, 10)

let seq = 4210
const code = () => `FR-${(seq++).toString(36).toUpperCase()}${'KQ'}`

function line (productId, qty) {
  const p = db.products.find(x => x.id === productId)
  return {
    id: `${productId}-l`,
    product_id: productId,
    name: p.name.az,
    unit_kind: p.unit_kind,
    unit_price_minor: p.price_minor,
    qty,
    is_weight_based: p.is_weight_based,
    confirmed_qty: null,
    line_total_minor: Math.round(p.price_minor * qty),
    final_line_total_minor: null,
  }
}

function order (attrs) {
  const items = attrs.items
  const subtotal = items.reduce((s, i) => s + i.line_total_minor, 0)
  const fee = attrs.delivery_fee_minor ?? 0
  return {
    id: attrs.id,
    code: attrs.code ?? code(),
    status: attrs.status,
    currency: 'AZN',
    subtotal_minor: subtotal,
    delivery_fee_minor: fee,
    discount_minor: 0,
    total_minor: subtotal + fee,
    requires_weighing: items.some(i => i.is_weight_based),
    final_total_minor: attrs.final_total_minor ?? null,
    weighed_at: attrs.weighed_at ?? null,
    payable_minor: attrs.final_total_minor ?? subtotal + fee,
    payable_display: `${((attrs.final_total_minor ?? subtotal + fee) / 100).toFixed(2)} AZN`,
    delivery_date: attrs.delivery_date,
    delivery_slot: attrs.delivery_slot ?? '14:00–18:00',
    payment_method: 'cash',
    address_line: attrs.address_line,
    address_notes: attrs.address_notes ?? null,
    contact_name: attrs.contact_name,
    contact_phone: attrs.contact_phone,
    note: attrs.note ?? null,
    can_cancel: ['placed', 'confirmed'].includes(attrs.status),
    placed_at: attrs.placed_at ?? iso(-1, 9),
    delivered_at: attrs.delivered_at ?? null,
    cancelled_at: null,
    cancel_reason: null,
    user_id: attrs.user_id,
    items,
    events: attrs.events ?? [],
  }
}

db.orders = [
  order({
    id: 'o1', code: 'FR-4QK2MK', status: 'placed', user_id: 'u1',
    delivery_date: day(0), delivery_slot: '14:00–18:00',
    contact_name: 'Leyla Məmmədova', contact_phone: '+994501234567',
    address_line: '28 May küçəsi 14, mənzil 7', address_notes: 'İkinci mərtəbə, zəng işləmir',
    note: 'Zəhmət olmasa gəlməzdən əvvəl zəng edin.',
    items: [line('smoked-salmon', 1.2), line('burrata-truffle', 2), line('frozen-croissant', 1)],
    events: [{ id: 1, from_status: null, to_status: 'placed', actor_role: 'customer', note: null, created_at: iso(-1, 9) }],
  }),
  order({
    id: 'o2', code: 'FR-4QK3TR', status: 'preparing', user_id: 'u2',
    delivery_date: day(0), delivery_slot: '10:00–14:00',
    contact_name: 'Rəşad Quliyev', contact_phone: '+994557654321',
    address_line: 'Nizami küçəsi 88', 
    items: [line('black-tiger-shrimp', 0.8), line('kalmar', 1), line('parmigiano-reggiano', 0.4)],
    events: [
      { id: 2, from_status: null, to_status: 'placed', actor_role: 'customer', note: null, created_at: iso(-2, 18) },
      { id: 3, from_status: 'placed', to_status: 'confirmed', actor_role: 'admin', note: null, created_at: iso(-1, 9) },
      { id: 4, from_status: 'confirmed', to_status: 'preparing', actor_role: 'admin', note: 'Krevet səhər gəldi', created_at: iso(0, 8) },
    ],
  }),
  order({
    id: 'o3', code: 'FR-4QK5WZ', status: 'out_for_delivery', user_id: 'u3',
    delivery_date: day(0), delivery_slot: '18:00–22:00',
    contact_name: 'Anna Petrova', contact_phone: '+994702223344',
    address_line: 'Xaqani küçəsi 5, mənzil 12',
    items: [line('red-caviar', 2), line('brie', 1), line('butter', 2)],
    events: [
      { id: 5, from_status: null, to_status: 'placed', actor_role: 'customer', note: null, created_at: iso(-1, 12) },
      { id: 6, from_status: 'placed', to_status: 'confirmed', actor_role: 'admin', note: null, created_at: iso(-1, 13) },
      { id: 7, from_status: 'confirmed', to_status: 'preparing', actor_role: 'admin', note: null, created_at: iso(0, 9) },
      { id: 8, from_status: 'preparing', to_status: 'out_for_delivery', actor_role: 'courier', note: null, created_at: iso(0, 16) },
    ],
  }),
  order({
    id: 'o4', code: 'FR-4QJ8HM', status: 'delivered', user_id: 'u1',
    delivery_date: day(-1), delivery_slot: '14:00–18:00',
    contact_name: 'Leyla Məmmədova', contact_phone: '+994501234567',
    address_line: '28 May küçəsi 14, mənzil 7',
    items: [line('smoked-beluga', 0.5), line('grana-padano', 0.3)],
    final_total_minor: 6_140, weighed_at: iso(-1, 17), delivered_at: iso(-1, 17, 30),
    placed_at: iso(-3, 11),
    events: [
      { id: 9, from_status: null, to_status: 'placed', actor_role: 'customer', note: null, created_at: iso(-3, 11) },
      { id: 10, from_status: 'placed', to_status: 'confirmed', actor_role: 'admin', note: null, created_at: iso(-3, 12) },
      { id: 11, from_status: 'confirmed', to_status: 'preparing', actor_role: 'admin', note: null, created_at: iso(-1, 9) },
      { id: 12, from_status: 'preparing', to_status: 'out_for_delivery', actor_role: 'courier', note: null, created_at: iso(-1, 15) },
      { id: 13, from_status: 'out_for_delivery', to_status: 'delivered', actor_role: 'courier', note: 'Qapıda təhvil verildi', created_at: iso(-1, 17) },
    ],
  }),
  order({
    id: 'o5', code: 'FR-4QK9PL', status: 'confirmed', user_id: 'u2',
    delivery_date: day(1), delivery_slot: '10:00–14:00',
    contact_name: 'Rəşad Quliyev', contact_phone: '+994557654321',
    address_line: 'Nizami küçəsi 88',
    items: [line('french-chicken', 2), line('halloumi', 1)],
    events: [
      { id: 14, from_status: null, to_status: 'placed', actor_role: 'customer', note: null, created_at: iso(0, 10) },
      { id: 15, from_status: 'placed', to_status: 'confirmed', actor_role: 'admin', note: null, created_at: iso(0, 10) },
    ],
  }),
]

/* Same table the server keeps, same shape. */
const TRANSITIONS = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

let auditId = 100
function audit (action, subjectType, subjectId, changes) {
  db.audits.unshift({
    id: auditId++,
    action,
    subject_type: subjectType,
    subject_id: subjectId,
    changes: changes ?? null,
    actor_id: 'admin',
    actor_role: 'admin',
    ip: '127.0.0.1',
    created_at: new Date().toISOString(),
  })
}

/* ── Derived payloads ────────────────────────────────────────────────────── */

function bundleShape (b) {
  const items = b.items.map(i => {
    const p = db.products.find(x => x.id === i.product_id)
    return { ...i, price_minor: p.price_minor, orderable: p.is_active && p.in_stock }
  })
  const full = items.reduce((s, i) => s + i.price_minor * i.qty, 0)
  const price = Math.round(full * (100 - b.discount_percent) / 100)
  return {
    ...b,
    items,
    full_minor: full,
    price_minor: price,
    saving_minor: full - price,
    shown_on_site: b.is_active && items.length > 0 && items.every(i => i.orderable),
  }
}

const mask = {
  email: e => {
    const [local, domain] = e.split('@')
    return local.slice(0, 2) + '•'.repeat(Math.max(1, local.length - 2)) + '@' + domain
  },
  phone: p => '•'.repeat(Math.max(0, p.length - 4)) + p.slice(-4),
}

const summary = u => ({
  id: u.id, name: u.name,
  email_masked: mask.email(u.email), phone_masked: mask.phone(u.phone),
  role: u.role, blocked_at: u.blocked_at, anonymised_at: u.anonymised_at,
  orders_count: u.orders_count, created_at: u.created_at,
})

function dashboard () {
  const today = day(0)
  const open = db.orders.filter(o => !['delivered', 'cancelled'].includes(o.status))
  const byStatus = {}
  Object.keys(TRANSITIONS).forEach(s => { byStatus[s] = db.orders.filter(o => o.status === s).length })
  const delivered = db.orders.filter(o => o.status === 'delivered')

  return {
    orders: {
      by_status: byStatus,
      open: open.length,
      today: db.orders.filter(o => o.delivery_date === today).length,
      tomorrow: db.orders.filter(o => o.delivery_date === day(1)).length,
      new_today: 1,
      awaiting_weights: open.filter(o => o.requires_weighing && !o.weighed_at).length,
    },
    revenue: {
      currency: 'AZN',
      today_minor: 0,
      week_minor: delivered.reduce((s, o) => s + o.payable_minor, 0),
      month_minor: delivered.reduce((s, o) => s + o.payable_minor, 0) + 128_400,
    },
    catalogue: {
      products: db.products.length,
      out_of_stock: db.products.filter(p => !p.in_stock).length,
      inactive: db.products.filter(p => !p.is_active).length,
      bundles_active: db.bundles.filter(b => b.is_active).length,
      bundles_total: db.bundles.length,
    },
    customers: {
      total: db.customers.filter(u => u.role === 'customer').length,
      blocked: db.customers.filter(u => u.blocked_at).length,
    },
    recent_changes: db.audits.slice(0, 10),
  }
}

/* ── The router ──────────────────────────────────────────────────────────── */

const wait = () => new Promise(r => setTimeout(r, 140))

class DemoError extends Error {
  constructor (message, errors) {
    super(message)
    this.status = 422
    this.body = { message, errors }
    this.errors = errors
  }
}

export async function respond (path, method, body) {
  await wait()
  const [route, query] = path.split('?')
  const params = new URLSearchParams(query ?? '')
  const seg = route.split('/').filter(Boolean)

  /* auth */
  if (route === '/auth/request-code') return { status: 'ok' }
  if (route === '/auth/verify-code') {
    return { token: 'preview', expires_at: iso(30), user: { data: ME } }
  }
  if (route === '/auth/logout') return { status: 'ok' }
  if (route === '/me') return { data: ME }

  /* dashboard */
  if (route === '/admin/dashboard') return dashboard()
  if (route === '/admin/audits') {
    return { data: db.audits, total: db.audits.length, page: 1, last_page: 1 }
  }

  /* products */
  /* Copies, not the stored objects.
     
     The panel keeps what it is given in a reactive ref. Handing out the store's
     own objects means a later mutation in here changes what the component is
     holding without going through the proxy, so Vue never learns of it — and
     the follow-up Object.assign then writes values that are already there and
     triggers nothing either. Removing a photograph left the row still saying
     "yüklənib". A real API returns fresh objects parsed from JSON; this is how
     the preview behaves the same way. */
  if (route === '/admin/products' && method === 'GET') {
    return { data: db.products.map(p => ({ ...p })) }
  }

  if (route === '/admin/products' && method === 'POST') {
    if (db.products.some(p => p.id === body.id)) {
      throw new DemoError('Bu kod artıq istifadə olunur.', { id: ['Bu kod artıq istifadə olunur.'] })
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(body.id) || body.id.length < 3) {
      throw new DemoError('Kod yalnız kiçik hərf, rəqəm və defisdən ibarət ola bilər.',
        { id: ['Kod yalnız kiçik hərf, rəqəm və defisdən ibarət ola bilər.'] })
    }
    const cat = db.products.find(p => p.category_id === body.category_id)?.category ?? {}
    const created = {
      id: body.id,
      category_id: body.category_id,
      category: cat,
      price_minor: body.price_minor,
      currency: 'AZN',
      unit_kind: body.unit_kind,
      unit_qty: body.unit_qty ?? 1,
      is_weight_based: body.unit_kind === 'kg',
      is_popular: Boolean(body.is_popular),
      is_active: true,
      in_stock: body.in_stock !== false,
      // A product created today has no picture inside anybody's bundle.
      image: null,
      image_url: null,
      thumb_url: null,
      has_upload: false,
      sort: db.products.length,
      name: {
        az: body.translations?.az?.name,
        en: body.translations?.en?.name ?? body.translations?.az?.name,
        ru: body.translations?.ru?.name ?? body.translations?.az?.name,
      },
      description: {},
      unit_label: {
        az: body.translations?.az?.unit_label,
        en: body.translations?.en?.unit_label,
        ru: body.translations?.ru?.unit_label,
      },
    }
    db.products.unshift(created)
    audit('product.create', 'product', created.id, {
      price_minor: { from: null, to: created.price_minor },
      name: { from: null, to: created.name.az },
    })
    return { ...created }
  }

  /* Photographs.
     
     The preview has no server to store a file on, so it keeps the browser's
     own object URL for the picture that was chosen. It looks and behaves like
     the real thing for as long as the tab is open, and nothing leaves the
     machine — which is the honest version of an upload with no backend. */
  if (seg[0] === 'admin' && seg[1] === 'products' && seg[3] === 'photo') {
    const p = db.products.find(x => x.id === seg[2])
    if (!p) throw new DemoError('Məhsul tapılmadı.')

    if (method === 'DELETE') {
      if (p.image_url?.startsWith('blob:')) URL.revokeObjectURL(p.image_url)
      const was = p.image_url
      p.image_url = null
      p.thumb_url = null
      p.has_upload = false
      audit('product.photo.remove', 'product', p.id, { image_file: { from: was, to: null } })
      return { ...p }
    }

    const file = body instanceof FormData ? body.get('photo') : null
    if (!file) throw new DemoError('Şəkil göndərilmədi.', { photo: ['Şəkil göndərilmədi.'] })
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      throw new DemoError('Yalnız JPEG, PNG və ya WebP.', { photo: ['Yalnız JPEG, PNG və ya WebP.'] })
    }

    if (p.image_url?.startsWith('blob:')) URL.revokeObjectURL(p.image_url)
    const url = URL.createObjectURL(file)
    p.image_url = url
    p.thumb_url = url
    p.has_upload = true
    audit('product.photo', 'product', p.id, { image_file: { from: null, to: file.name } })
    return { ...p }
  }

  if (route === '/admin/products/stock' && method === 'POST') {
    const touched = []
    db.products.forEach(p => {
      if (body.ids.includes(p.id) && p.in_stock !== body.in_stock) {
        p.in_stock = body.in_stock
        touched.push(p.id)
      }
    })
    if (touched.length) {
      audit('product.stock', 'product', null, {
        in_stock: { from: !body.in_stock, to: body.in_stock },
        ids: { from: null, to: touched },
      })
    }
    return { updated: touched }
  }

  if (seg[0] === 'admin' && seg[1] === 'products' && method === 'PATCH') {
    const p = db.products.find(x => x.id === seg[2])
    // The same bounds the server validates against, so the preview refuses
    // what the real panel would refuse.
    if (body.price_minor !== undefined && (body.price_minor < 1 || body.price_minor > 10_000_000)) {
      throw new DemoError('Qiymət 0.01 və 100000 AZN arasında olmalıdır.',
        { price_minor: ['Qiymət 0.01 və 100000 AZN arasında olmalıdır.'] })
    }
    const changes = {}
    for (const key of ['price_minor', 'in_stock', 'is_active', 'is_popular', 'sort']) {
      if (body[key] !== undefined && body[key] !== p[key]) {
        changes[key] = { from: p[key], to: body[key] }
        p[key] = body[key]
      }
    }
    if (Object.keys(changes).length) audit('product.update', 'product', p.id, changes)
    return { ...p }
  }

  /* bundles */
  if (route === '/admin/bundles' && method === 'GET') {
    return { data: db.bundles.map(bundleShape) }
  }
  if (seg[0] === 'admin' && seg[1] === 'bundles' && method === 'PATCH') {
    const b = db.bundles.find(x => x.id === seg[2])
    if (body.discount_percent !== undefined && (body.discount_percent < 0 || body.discount_percent > 60)) {
      throw new DemoError('Endirim 0 və 60% arasında olmalıdır.',
        { discount_percent: ['Endirim 0 və 60% arasında olmalıdır.'] })
    }
    const changes = {}
    for (const key of ['discount_percent', 'is_active', 'sort']) {
      if (body[key] !== undefined && body[key] !== b[key]) {
        changes[key] = { from: b[key], to: body[key] }
        b[key] = body[key]
      }
    }
    if (Object.keys(changes).length) audit('bundle.update', 'bundle', b.id, changes)
    return bundleShape(b)
  }

  /* zones */
  if (route === '/admin/zones' && method === 'GET') return { data: db.zones }
  if (seg[0] === 'admin' && seg[1] === 'zones' && method === 'PATCH') {
    const z = db.zones.find(x => x.id === seg[2])
    const changes = {}
    for (const key of ['fee_minor', 'min_order_minor', 'is_active', 'sort']) {
      if (body[key] !== undefined && body[key] !== z[key]) {
        changes[key] = { from: z[key], to: body[key] }
        z[key] = body[key]
      }
    }
    if (Object.keys(changes).length) audit('zone.update', 'zone', z.id, changes)
    return { status: 'ok' }
  }

  /* customers */
  if (route === '/admin/customers' && method === 'GET') {
    const email = params.get('email')
    const found = email
      ? db.customers.filter(u => u.email.toLowerCase() === email.toLowerCase())
      : db.customers
    return { data: found.map(summary), total: found.length, page: 1, last_page: 1 }
  }
  if (seg[0] === 'admin' && seg[1] === 'customers' && seg[3] === 'block') {
    const u = db.customers.find(x => x.id === seg[2])
    if (u.role !== 'customer') {
      throw new DemoError('Heyət hesabları serverdəki konsol əmri ilə idarə olunur.',
        { blocked: ['Heyət hesabları serverdəki konsol əmri ilə idarə olunur.'] })
    }
    const was = u.blocked_at
    u.blocked_at = body.blocked ? new Date().toISOString() : null
    audit(body.blocked ? 'customer.block' : 'customer.unblock', 'user', u.id,
      { blocked_at: { from: was, to: u.blocked_at } })
    return { status: 'ok', blocked_at: u.blocked_at }
  }
  if (seg[0] === 'admin' && seg[1] === 'customers' && seg.length === 3) {
    const u = db.customers.find(x => x.id === seg[2])
    audit('customer.view', 'user', u.id, null)
    const theirs = db.orders.filter(o => o.user_id === u.id)
    return {
      ...u,
      orders_count: theirs.length,
      spent_minor: theirs.filter(o => o.status === 'delivered')
        .reduce((s, o) => s + o.payable_minor, 0),
      orders: theirs.map(o => ({
        id: o.id, status: o.status, delivery_date: o.delivery_date, total_minor: o.payable_minor,
      })),
    }
  }

  /* orders */
  if (route === '/staff/orders' && method === 'GET') {
    const status = params.get('status')
    const date = params.get('date')
    return {
      data: db.orders.filter(o =>
        (!status || o.status === status) && (!date || o.delivery_date === date)),
    }
  }
  if (seg[0] === 'staff' && seg[1] === 'orders' && seg[2] && seg[3] === 'transition') {
    const o = db.orders.find(x => x.id === seg[2])
    if (!TRANSITIONS[o.status].includes(body.status)) {
      throw new DemoError('Bu status dəyişikliyi mümkün deyil.')
    }
    o.events.push({
      id: Date.now(), from_status: o.status, to_status: body.status,
      actor_role: 'admin', note: body.note ?? null, created_at: new Date().toISOString(),
    })
    o.status = body.status
    o.can_cancel = ['placed', 'confirmed'].includes(o.status)
    if (o.status === 'delivered') o.delivered_at = new Date().toISOString()
    return o
  }
  if (seg[0] === 'staff' && seg[1] === 'orders' && seg[2] && seg[3] === 'weights') {
    const o = db.orders.find(x => x.id === seg[2])
    // Re-priced from the unit price already on the order, exactly as the
    // server does it: the client sends kilograms and never money.
    o.items.forEach(i => {
      if (!i.is_weight_based) return
      const kg = Number(body.weights[i.id])
      if (!Number.isFinite(kg)) return
      i.confirmed_qty = kg
      i.final_line_total_minor = Math.round(i.unit_price_minor * kg)
    })
    const final = o.items.reduce((s, i) => s + (i.final_line_total_minor ?? i.line_total_minor), 0)
    o.final_total_minor = final + o.delivery_fee_minor
    o.payable_minor = o.final_total_minor
    o.weighed_at = new Date().toISOString()
    return o
  }
  if (seg[0] === 'staff' && seg[1] === 'orders' && seg.length === 3) {
    const o = db.orders.find(x => x.id === seg[2])
    return { order: o, events: o.events, can_transition_to: TRANSITIONS[o.status] }
  }

  throw new DemoError(`Preview has no answer for ${method} ${route}`)
}

const ME = {
  id: 'admin',
  email: 'siz@freshnesstoyourhome.az',
  name: 'Nümunə idarəçi',
  phone: '+994503521919',
  locale: 'az',
  profile_complete: true,
}

/** The banner the panel shows so nobody mistakes this for the shop's data. */
export const IS_DEMO = true
