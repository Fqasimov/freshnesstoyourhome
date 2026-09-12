<script setup>
import BIcon from './BIcon.vue'
import { computed } from 'vue'
import { CONTACT } from '../data/catalogue'
import { useI18n } from '../composables/useI18n'

const { t } = useI18n()
const waHref = computed(() =>
  `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(t('ui.waPlain'))}`)

const igHref = computed(() => `https://instagram.com/${CONTACT.instagram}`)

const hours = [['h.deliv', 'h.delivv'], ['h.support', 'h.supportv']]
const terms = [['h.zone', 'h.zonev'], ['h.pay', 'h.payv'], ['h.order', 'h.orderv']]
</script>

<template>
  <section class="contact" id="contact">
    <div class="wrap contact__in">
      <div v-reveal>
        <p class="eyebrow eyebrow--inv">{{ t('ct.eyebrow') }}</p>
        <h2 class="display">{{ t('ct.h2') }}</h2>
        <p class="lede">{{ t('ct.copy') }}</p>

        <a :href="'tel:+' + CONTACT.whatsapp" class="phone">
          <BIcon name="telephone" size=".68em" />
          {{ CONTACT.phoneDisplay }}
        </a>

        <div class="contact__cta">
          <a class="btn btn--brick" :href="waHref" target="_blank" rel="noopener">
            <span>{{ t('ct.wa') }}</span>
            <BIcon name="whatsapp" :size="15" />
          </a>
          <a class="btn btn--ghost" :href="igHref" target="_blank" rel="noopener">
            <BIcon name="instagram" :size="15" />
            <span>{{ t('ct.ig') }}</span>
          </a>
        </div>
      </div>

      <div class="hours" v-reveal="'120ms'">
        <dl>
          <template v-for="[k, v] in hours" :key="k">
            <dt>{{ t(k) }}</dt>
            <dd>{{ t(v) }}</dd>
          </template>
          <hr>
          <template v-for="[k, v] in terms" :key="k">
            <dt>{{ t(k) }}</dt>
            <dd>{{ t(v) }}</dd>
          </template>
        </dl>
        <p class="hours__note">{{ t('h.zonenote') }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hours__note{ margin:16px 0 0; font-size:.78rem; line-height:1.55; color:rgba(246,243,234,.88); }
/* ---------- 14. Contact -------------------------------------------------- */
.contact{ background:var(--forest); color:var(--paper); padding:clamp(64px,8vw,110px) 0; position:relative; overflow:hidden; }
.contact::before{
  content:''; position:absolute; width:min(60vw,720px); aspect-ratio:1; border-radius:50%;
  border:1px solid rgba(168,199,130,.24); right:-14%; top:-32%;
}
.contact::after{
  content:''; position:absolute; width:min(42vw,520px); aspect-ratio:1; border-radius:50%;
  border:1px solid rgba(168,199,130,.16); right:2%; bottom:-40%;
}
.contact__in{ display:grid; grid-template-columns:1.1fr .9fr; gap:clamp(32px,5vw,80px); align-items:center; position:relative; z-index:2; }
.contact h2{ color:var(--paper); }
.contact p{ color:rgba(246,243,234,.9); }
.contact__cta{ display:flex; flex-wrap:wrap; gap:12px; margin-top:32px; }
.phone{
  font-family:var(--display); font-size:clamp(1.5rem,3.2vw,2.5rem); font-weight:400;
  letter-spacing:-.02em; display:inline-flex; align-items:center; gap:14px;
  border-bottom:1px solid rgba(246,243,234,.3); padding-bottom:8px;
  transition:border-color .4s var(--ease), gap .4s var(--ease-out);
}
.phone:hover{ border-color:var(--acid); gap:20px; }
.phone .bi{ color:var(--acid); }

.hours{ border:1px solid var(--line-inv); border-radius:var(--radius); padding:clamp(22px,2.6vw,32px); }

/* The two columns had no breakpoint at all, so on a phone the hours panel was
   being asked to hold two columns of its own inside 180px — every value wrapped
   to three lines and the panel still pushed past the gutter. */
@media (max-width:880px){
  .contact__in{ grid-template-columns:1fr; }
}
@media (max-width:420px){
  .hours dl{ grid-template-columns:1fr; gap:2px 0; }
  .hours dd{ text-align:left; padding-bottom:8px; }
}
.hours dl{ margin:0; display:grid; grid-template-columns:auto 1fr; gap:12px 18px; font-size:.88rem; }
.hours dt{ color:rgba(246,243,234,.88); }
.hours dd{ margin:0; text-align:right; }
.hours hr{ grid-column:1/-1; border:0; border-top:1px solid var(--line-inv); margin:2px 0; }
</style>
