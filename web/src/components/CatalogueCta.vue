<script setup>
import { useI18n } from '../composables/useI18n'
import BIcon from './BIcon.vue'

const { t } = useI18n()

/**
 * One button, three sizes.
 *
 * The whole catalogue moved to its own page, which is better to use and worse
 * to find: a visitor who never scrolls past the hero has no reason to know the
 * page exists. So this is a component rather than a link written five times —
 * the wording and the arrow stay identical everywhere it appears,
 * which is what makes a repeated button read as one door rather than five.
 */
defineProps({
  // 'solid'  — the primary call to action (hero, nav)
  // 'ghost'  — quieter, for where it follows other content
  // 'band'   — the full-width panel between sections
  variant: { type: String, default: 'solid' },
})
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
        <BIcon name="arrow-right" :size="14" />
      </RouterLink>
    </div>
  </div>

  <RouterLink v-else :to="{ name: 'catalogue' }" class="btn" :class="{ 'btn--ghost': variant === 'ghost' }">
    <span>{{ t('cta.go') }}</span>
    <BIcon name="arrow-right" :size="14" />
  </RouterLink>
</template>

<style scoped>
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
  /* `flex: 1 1 320px` means a 320px *height* once the axis turns vertical, so
     the panel grew a 280px hole between the text and the button. */
  .ctaband__t{ flex: 0 0 auto; }
  .ctaband__btn{ justify-content: center; }
}
</style>
