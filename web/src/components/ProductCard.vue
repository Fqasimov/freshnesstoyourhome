<script setup>
import { computed } from 'vue'
import { money, perKg } from '../data/catalogue'
import { useI18n } from '../composables/useI18n'

const props = defineProps({
  product: { type: Object, required: true },
  /* 'grid' sits in the catalogue; 'slide' sizes itself for the slider. */
  variant: { type: String, default: 'grid' }
})
const emit = defineEmits(['add', 'peek'])

const { t, nm, alt, catName, unitOf } = useI18n()
const kg = computed(() => perKg(props.product))
</script>

<template>
  <article class="card" :class="{ 'card--slide': variant === 'slide' }">
    <div class="card__media">
      <img :src="product.img" :alt="nm(product)" loading="lazy" decoding="async">
      <div class="card__flags">
        <span v-if="kg" class="flag flag--kg">{{ money(kg) }} AZN{{ t('ui.perkg') }}</span>
        <!-- Sold by weight: the price shown is for the stated amount, and the
             courier's scales decide the final figure. -->
        <span v-else-if="product.weighed" class="flag flag--kg">{{ t('ui.weighedFlag') }}</span>
      </div>
      <div class="card__peek">
        <button type="button" @click="emit('peek', product)">{{ t('ui.quick') }}</button>
      </div>
    </div>

    <div class="card__body">
      <span class="card__cat">{{ catName(product.cat) }}</span>
      <h3 class="card__name">{{ nm(product) }}</h3>
      <p class="card__alt">{{ alt(product) }}</p>

      <div class="card__foot">
        <span class="card__price">
          <b>{{ product.price }}<i>AZN</i></b>
          <span>{{ unitOf(product) }}</span>
        </span>
        <button class="add" type="button" :aria-label="t('ui.add')"
                @click="emit('add', { product, el: $event.currentTarget.closest('.card') })">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
/* ---------- 11. Product card -------------------------------------------- */
.card{
  position:relative; display:flex; flex-direction:column;
  background:var(--paper); border:1px solid var(--line); border-radius:var(--radius);
  overflow:hidden; will-change:transform;
  transition:border-color .45s var(--ease), box-shadow .5s var(--ease-out), transform .5s var(--ease-out);
}
.card:hover{ border-color:rgba(27,41,22,.3); box-shadow:0 20px 44px -22px rgba(27,41,22,.4); transform:translateY(-3px); }
.card::before{
  content:''; position:absolute; top:0; left:0; right:0; height:3px; background:var(--acid);
  transform:scaleX(0); transform-origin:left; z-index:4;
  transition:transform .6s var(--ease-out);
}
.card:hover::before{ transform:scaleX(1); }

.card__media{ position:relative; aspect-ratio:1/1; overflow:hidden; background:var(--paper-2); }
.card__media img{
  width:100%; height:100%; object-fit:cover;
  transition:transform 1.1s var(--ease-out), filter .6s var(--ease);
}
.card:hover .card__media img{ transform:scale(1.06); }

.card__flags{ position:absolute; top:10px; left:10px; display:flex; flex-direction:column; gap:6px; z-index:3; }
.flag{
  font-size:.6rem; font-weight:700; letter-spacing:.13em; text-transform:uppercase;
  padding:5px 9px; border-radius:2px; background:var(--brick); color:#fff;
}
.flag--kg{ background:rgba(27,41,22,.82); color:var(--paper); font-weight:600; letter-spacing:.06em; }

.card__peek{
  position:absolute; inset:auto 10px 10px; z-index:3;
  display:flex; justify-content:center;
  opacity:0; transform:translateY(10px);
  transition:opacity .45s var(--ease), transform .5s var(--ease-out);
}
.card:hover .card__peek, .card:focus-within .card__peek{ opacity:1; transform:none; }
.card__peek button{
  background:rgba(246,243,234,.95); backdrop-filter:blur(6px);
  border-radius:100px; padding:8px 16px; font-size:.74rem; font-weight:600; letter-spacing:.07em;
  text-transform:uppercase; box-shadow:0 6px 18px rgba(0,0,0,.16);
  transition:background .35s var(--ease), color .35s var(--ease);
}
.card__peek button:hover{ background:var(--ink); color:var(--paper); }

.card__body{ padding:16px 16px 18px; display:flex; flex-direction:column; gap:4px; flex:1; }
.card__cat{ font-size:.6rem; letter-spacing:.18em; text-transform:uppercase; color:var(--leaf-d); font-weight:600; }
.card__name{ font-family:var(--display); font-size:1.09rem; font-weight:500; letter-spacing:-.014em; line-height:1.18; margin:2px 0 0; }
.card__alt{ font-size:.78rem; color:var(--ink-3); line-height:1.4; }
.card__foot{ display:flex; align-items:flex-end; justify-content:space-between; gap:12px; margin-top:auto; padding-top:14px; }
.card__price{ display:flex; flex-direction:column; line-height:1; }
.card__price b{ font-family:var(--display); font-size:1.42rem; font-weight:600; letter-spacing:-.02em; }
.card__price b i{ font-style:normal; font-size:.58em; font-weight:500; margin-left:3px; opacity:.62; }
.card__price span{ font-size:.72rem; color:var(--ink-3); margin-top:6px; letter-spacing:.02em; }

.add{
  width:42px; height:42px; border-radius:100px; flex:none;
  background:var(--forest); color:var(--paper);
  display:grid; place-items:center; position:relative; overflow:hidden;
  transition:width .5s var(--ease-out), background .4s var(--ease);
}
.add:hover{ background:var(--brick); }
.add svg{ width:16px; height:16px; transition:transform .45s var(--ease-out); }
.add:hover svg{ transform:rotate(90deg); }
.add.done{ background:var(--leaf-d); }
@media (max-width:640px){
  .card__body{ padding:13px 13px 15px; }
  .card__name{ font-size:.98rem; }
  .card__price b{ font-size:1.2rem; }
  .add{ width:38px; height:38px; }
}
</style>

<style scoped>
/* Sizing for the slider, so the parent never has to style a child's root. */
.card--slide{ scroll-snap-align:start; flex:0 0 clamp(230px,25vw,318px); }
</style>
