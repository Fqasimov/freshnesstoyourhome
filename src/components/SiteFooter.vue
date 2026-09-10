<script setup>
import { CONTACT } from '../data/catalogue'
import { useI18n } from '../composables/useI18n'
import logo from '../assets/logo.png'

const { t } = useI18n()
const year = new Date().getFullYear()
const links = [['#catalogue', 'nav.shop'], ['#week', 'nav.week'], ['#story', 'nav.story'], ['#order', 'nav.how']]
</script>

<template>
  <footer class="foot">
    <div class="wrap">
      <div class="foot__top">
        <div class="foot__brand">
          <img :src="logo" alt="">
          <div>
            <b>Freshness</b>
            <span>To Your Home</span>
          </div>
        </div>
        <nav class="foot__nav">
          <a v-for="[href, key] in links" :key="href" :href="href">{{ t(key) }}</a>
          <a :href="'tel:+' + CONTACT.whatsapp">{{ CONTACT.phoneDisplay }}</a>
        </nav>
      </div>
      <div class="foot__bot">
        <p>{{ t('foot.note') }}</p>
        <p>© {{ year }} Freshness To Your Home</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
/* ---------- 15. Footer --------------------------------------------------- */
.foot{ background:var(--forest-2); color:rgba(246,243,234,.7); padding:clamp(40px,5vw,64px) 0 34px; }
.foot__top{ display:flex; justify-content:space-between; gap:32px; flex-wrap:wrap; align-items:flex-start; padding-bottom:32px; border-bottom:1px solid var(--line-inv); }
.foot__brand{ display:flex; align-items:center; gap:14px; }
.foot__brand img{ width:56px; height:56px; border-radius:50%; }
.foot__brand b{ font-family:var(--display); color:var(--paper); font-size:1.3rem; font-weight:500; display:block; letter-spacing:-.012em; }
.foot__brand span{ font-size:.7rem; letter-spacing:.2em; text-transform:uppercase; }
.foot__nav{ display:flex; gap:clamp(18px,3vw,44px); flex-wrap:wrap; font-size:.86rem; }
.foot__nav a:hover{ color:var(--paper); }
.foot__bot{ display:flex; justify-content:space-between; gap:20px; flex-wrap:wrap; padding-top:24px; font-size:.76rem; }
.foot__bot p{ margin:0; max-width:60ch; line-height:1.6; }

@media (max-width:640px){
  .foot__top{ flex-direction:column; }
}
</style>
