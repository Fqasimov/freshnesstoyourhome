<script setup>
import { computed } from 'vue'
import { PRODUCTS } from '../data/catalogue'
import { useI18n } from '../composables/useI18n'

const { t } = useI18n()

/**
 * One button, three sizes.
 *
 * The whole catalogue moved to its own page, which is better to use and worse
 * to find: a visitor who never scrolls past the hero has no reason to know the
 * page exists. So this is a component rather than a link written five times —
 * the wording, the count and the arrow stay identical everywhere it appears,
 * which is what makes a repeated button read as one door rather than five.
 */
defineProps({
  // 'solid'  — the primary call to action (hero, nav)
  // 'ghost'  — quieter, for where it follows other content
  // 'band'   — the full-width panel between sections
  variant: { type: String, default: 'solid' },
})

/* Live, because the number in a button is a promise about the page behind it
   and the catalogue is loaded from the API. */
const count = computed(() => PRODUCTS.length)
</script>

<template>
  <div v-if="variant === 'band'" class="ctaband" v-reveal>
    <div class="ctaband__in">
      <div class="ctaband__t">
        <h3 class="display">{{ t('cta.band.h') }}</h3>
        <p>{{ t('cta.band.p') }}</p>
      </div>
      <RouterLink :to="{ name: 'catalogue' }" class="btn btn--brick ctaband__btn">
        <span>{{ t('cta.go') }}</span>
        <b class="ctacount">{{ count }}</b>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </RouterLink>
    </div>
  </div>

  <RouterLink v-else :to="{ name: 'catalogue' }" class="btn" :class="{ 'btn--ghost': variant === 'ghost' }">
    <span>{{ t('cta.go') }}</span>
    <b class="ctacount">{{ count }}</b>
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
  </RouterLink>
</template>

<style scoped>
/* The count rides inside the button so the button says what is behind it —
   "Kataloqa keçid edin · 54" is a different promise from "Kataloq". */
.ctacount{
  font: 600 .66rem/1 var(--sans);
  letter-spacing: .04em;
  padding: 3px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, currentColor 14%, transparent);
  border: 1px solid color-mix(in srgb, currentColor 26%, transparent);
}

.ctaband{
  margin: clamp(32px, 6vw, 64px) 0;
}
.ctaband__in{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: clamp(18px, 3vw, 40px);
  flex-wrap: wrap;
  padding: clamp(22px, 4vw, 40px) clamp(20px, 4vw, 46px);
  border-radius: 20px;
  border: 1px solid var(--line);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--brick) 9%, transparent), transparent 62%),
    var(--paper-2);
}
.ctaband__t{ min-width: min(100%, 260px); flex: 1 1 320px; }
.ctaband__t h3{ margin: 0 0 6px; font-size: clamp(1.3rem, 3.4vw, 1.9rem); }
.ctaband__t p{ margin: 0; color: var(--ink-2); max-width: 54ch; font-size: .95rem; line-height: 1.55; }
.ctaband__btn{ flex: 0 0 auto; }

@media (max-width: 560px){
  .ctaband__in{ flex-direction: column; align-items: stretch; text-align: left; }
  .ctaband__btn{ justify-content: center; }
}
</style>
