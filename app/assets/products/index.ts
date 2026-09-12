/**
 * Product photographs, bundled with the app.
 *
 * Generated — do not edit by hand. Metro resolves require() at build time and
 * cannot take a computed path, so every image has to be named literally. The
 * key is the product id from the API, which is what keeps a photo from drifting
 * away from the row it belongs to.
 *
 * Regenerate with: npm run build:images
 */

export const PRODUCT_IMAGES: Record<string, number> = {
  'anchovy-fillet': require('./anchovy-fillet.jpg'),
  'atlantic-lobster': require('./atlantic-lobster.jpg'),
  'baby-green-pesto': require('./baby-green-pesto.jpg'),
  'baby-octopus': require('./baby-octopus.jpg'),
  'baby-truffle': require('./baby-truffle.jpg'),
  'beluga-steaks': require('./beluga-steaks.jpg'),
  'black-mussels': require('./black-mussels.jpg'),
  'black-tiger-shrimp': require('./black-tiger-shrimp.jpg'),
  'brie': require('./brie.jpg'),
  'burrata-truffle': require('./burrata-truffle.jpg'),
  'butter': require('./butter.jpg'),
  'camembert': require('./camembert.jpg'),
  'crab-sticks': require('./crab-sticks.jpg'),
  'duck-fillet': require('./duck-fillet.jpg'),
  'duck-leg': require('./duck-leg.jpg'),
  'escolar': require('./escolar.jpg'),
  'french-chicken': require('./french-chicken.jpg'),
  'fresh-dorado': require('./fresh-dorado.jpg'),
  'fresh-forel': require('./fresh-forel.jpg'),
  'fresh-levrek': require('./fresh-levrek.jpg'),
  'frozen-bagels': require('./frozen-bagels.jpg'),
  'frozen-croissant': require('./frozen-croissant.jpg'),
  'gouda': require('./gouda.jpg'),
  'grana-padano': require('./grana-padano.jpg'),
  'green-mussels': require('./green-mussels.jpg'),
  'halloumi': require('./halloumi.jpg'),
  'kalmar': require('./kalmar.jpg'),
  'kend-colpa-700': require('./kend-colpa-700.jpg'),
  'kend-colpa-800': require('./kend-colpa-800.jpg'),
  'kitkat-matcha': require('./kitkat-matcha.jpg'),
  'kitkat-matcha-latte': require('./kitkat-matcha-latte.jpg'),
  'kitkat-strawberry': require('./kitkat-strawberry.jpg'),
  'korolevskiy-shrimp': require('./korolevskiy-shrimp.jpg'),
  'langoustine': require('./langoustine.jpg'),
  'mussel-meat': require('./mussel-meat.jpg'),
  'octopus-salgado': require('./octopus-salgado.jpg'),
  'organic-feta': require('./organic-feta.jpg'),
  'parmigiano-reggiano': require('./parmigiano-reggiano.jpg'),
  'peeled-shrimp': require('./peeled-shrimp.jpg'),
  'peking-duck': require('./peking-duck.jpg'),
  'pizza-cheese': require('./pizza-cheese.jpg'),
  'red-caviar': require('./red-caviar.jpg'),
  'salmon-steaks': require('./salmon-steaks.jpg'),
  'seafood-mix': require('./seafood-mix.jpg'),
  'smoked-beluga': require('./smoked-beluga.jpg'),
  'smoked-dorado': require('./smoked-dorado.jpg'),
  'smoked-mackerel': require('./smoked-mackerel.jpg'),
  'smoked-salmon': require('./smoked-salmon.jpg'),
  'smoked-trout': require('./smoked-trout.jpg'),
  'sudak': require('./sudak.jpg'),
  'tortilla-lavash': require('./tortilla-lavash.jpg'),
  'tuna-frozen': require('./tuna-frozen.jpg'),
  'tuna-loin': require('./tuna-loin.jpg'),
  'unagi-frozen': require('./unagi-frozen.jpg'),
}

/** Falls back to undefined, which renders the card without a photo. */
export function productImage (id: string): number | undefined {
  return PRODUCT_IMAGES[id]
}
