<script setup>
import { computed } from 'vue'
import { useCart } from '../stores/cart'
import { useCatalogue } from '../stores/catalogue'
import { pick, t, money } from '../i18n'

const props = defineProps({ product: { type: Object, required: true } })

const cart = useCart()
const catalogue = useCatalogue()

const qty = computed(() => cart.qtyOf(props.product.id))

// Half-kilo steps for weighed goods, whole units for everything else — asking
// someone to type 0.5 on a phone to buy half a kilo of cheese is a bad screen.
const step = computed(() => (props.product.is_weight_based ? 0.5 : 1))

const category = computed(() =>
  catalogue.categories.find((c) => c.id === props.product.category_id)
)

const qtyLabel = computed(() =>
  props.product.is_weight_based ? `${qty.value} kg` : `${qty.value}`
)
</script>

<template>
  <article class="card">
    <div class="card__media">
      <img
        v-if="product.photo"
        :src="product.photo"
        :alt="pick(product.name)"
        loading="lazy"
        decoding="async"
      >
      <span v-if="product.is_weight_based" class="card__flag">{{ t('shop.perKg') }}</span>
    </div>

    <div class="card__body">
      <span v-if="category" class="card__cat">{{ pick(category.name) }}</span>
      <h3 class="card__name">{{ pick(product.name) }}</h3>
      <span class="card__unit">{{ pick(product.unit_label) }}</span>

      <div class="card__foot">
        <span class="card__price"><b>{{ money(product.price_minor, product.currency) }}</b></span>

        <div v-if="qty > 0" class="stepper">
          <button :aria-label="t('cart.remove')" @click="cart.setQty(product.id, qty - step)">−</button>
          <span>{{ qtyLabel }}</span>
          <button :aria-label="t('shop.add')" @click="cart.add(product.id, step)">+</button>
        </div>

        <button v-else class="add" :aria-label="t('shop.add')" @click="cart.add(product.id, step)">+</button>
      </div>
    </div>
  </article>
</template>
