<script setup>
import { computed } from 'vue'
import { CONTACT, SETS } from '../data/catalogue'
import { useI18n } from '../composables/useI18n'
import CatalogueCta from './CatalogueCta.vue'
import logo from '../assets/logo.png'

const { t } = useI18n()
const year = new Date().getFullYear()
/* Routes rather than bare fragments. The site runs on hash history, so a
   plain href="#sets" replaces the whole route with "sets", matches nothing
   and lands the visitor back at the top of the home page — these five links
   had all stopped working when the catalogue moved to its own page. */
const links = computed(() => [
  [{ path: '/', hash: '#story' }, 'nav.story'],
  // Same reason as the header: no active set, no link to one.
  ...(SETS.length ? [[{ path: '/', hash: '#sets' }, 'nav.sets']] : []),
  [{ path: '/', hash: '#week' }, 'nav.week'],
  [{ path: '/', hash: '#order' }, 'nav.how'],
  [{ path: '/', hash: '#delivery' }, 'nav.delivery'],
])
</script>

<template>
  <footer class="foot">
    <div class="wrap">
      <div class="foot__top">
        <div class="foot__brand">
          <img :src="logo" alt="">
          <div>
            <b>Freshness</b>
            <span>to your home</span>
          </div>
        </div>
        <nav class="foot__nav">
          <RouterLink v-for="[to, key] in links" :key="key" :to="to">{{ t(key) }}</RouterLink>
          <a :href="'tel:+' + CONTACT.whatsapp">{{ CONTACT.phoneDisplay }}</a>
        </nav>

        <!-- Last chance on the page, and the one place a visitor looks when
             they have read everything and still want the price list. -->
        <div class="foot__cta"><CatalogueCta variant="ghost" /></div>
      </div>
      <div class="foot__bot">
        <p>{{ t('foot.note') }}</p>
        <p>© {{ year }} Freshness To Your Home</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.foot__cta{ margin-top:4px; }

/* ---------- 15. Footer --------------------------------------------------- */
.foot{ background:var(--forest-2); color:rgba(246,243,234,.7); padding:clamp(40px,5vw,64px) 0 34px; }
.foot__top{ display:flex; justify-content:space-between; gap:32px 40px; flex-wrap:wrap; align-items:center; padding-bottom:32px; border-bottom:1px solid var(--line-inv); }
.foot__brand{ display:flex; align-items:center; gap:14px; }
.foot__brand img{ width:56px; height:56px; border-radius:50%; }
.foot__brand b{ font-family:var(--wordmark); color:var(--paper); font-size:1.5rem; font-weight:600; display:block; letter-spacing:-.024em; }
.foot__brand span{ font-family:var(--wordmark); font-size:.82rem; letter-spacing:.01em; }
.foot__nav{ display:flex; gap:clamp(18px,3vw,44px); flex-wrap:wrap; font-size:.86rem; }
.foot__nav a:hover{ color:var(--paper); }
.foot__bot{ display:flex; justify-content:space-between; gap:20px; flex-wrap:wrap; padding-top:24px; font-size:.76rem; }
.foot__bot p{ margin:0; max-width:60ch; line-height:1.6; }

@media (max-width:640px){
  .foot__top{ flex-direction:column; }
}
</style>
