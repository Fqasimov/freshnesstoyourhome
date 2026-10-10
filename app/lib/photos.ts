import { productImage } from '@/assets/products'
import type { Bundle, Product } from './api'

export type PhotoSource = number | { uri: string } | undefined

/**
 * The picture for a product, the same way the website chooses it: a
 * photograph uploaded in the panel wins; otherwise the one that ships with
 * the app. Removing an upload therefore restores the original, and a product
 * added in the panel today shows the photo it was added with.
 *
 * `thumb` for cards and lists, `full` for the product page.
 */
export function productPhoto (product: Product | undefined, size: 'thumb' | 'full' = 'thumb'): PhotoSource {
  if (!product) return undefined

  const uploaded = size === 'thumb'
    ? product.thumb_url ?? product.image_url
    : product.image_url ?? product.thumb_url
  if (uploaded) return { uri: uploaded }

  return productImage(product.id) ?? (product.image ? productImage(product.image.replace(/\.jpg$/, '')) : undefined)
}

/** A set's own photograph, if the shop took one. */
export function bundlePhoto (bundle: Bundle, size: 'thumb' | 'full' = 'thumb'): PhotoSource {
  const uri = size === 'thumb' ? bundle.thumb_url ?? bundle.image_url : bundle.image_url ?? bundle.thumb_url
  return uri ? { uri } : undefined
}
