<script setup>
import { computed } from 'vue'

/**
 * Every icon on the site.
 *
 * They used to be hand-drawn inline SVGs: twenty-two of them, at four
 * different stroke widths and three different viewBoxes, which is why the
 * truck and the map pin never quite looked like a set. These are Bootstrap
 * Icons, drawn as solid shapes on one 16×16 grid, so they match each other by
 * construction rather than by me getting the numbers right.
 *
 * To add one: copy the file from `node_modules/bootstrap-icons/icons` into
 * `src/assets/icons`, then `<BIcon name="that-filename" />`. Only the icons in
 * that folder are in the bundle, so the other two thousand cost nothing — and
 * nothing outside that folder can creep in.
 */
const FILES = import.meta.glob('../assets/icons/*.svg', {
  eager: true, query: '?raw', import: 'default',
})

const ICONS = Object.fromEntries(
  Object.entries(FILES).map(([path, svg]) => [
    path.split('/').pop().replace('.svg', ''),
    // Keep the drawing, drop the wrapper: this component owns the size, the
    // colour and the accessibility attributes, so the file's own <svg> tag
    // would only be a second opinion about all three.
    svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim(),
  ]),
)

const props = defineProps({
  name: { type: String, required: true },
  /* A number of pixels, or any CSS length. Defaults to the text size around
     it, which is what makes an icon inside a button line up with its label. */
  size: { type: [Number, String], default: '1em' },
  /* Icons are decoration beside a label almost everywhere. Where one stands
     alone — the close button, the back-to-top arrow — pass a label and it
     becomes an image with a name instead of being hidden. */
  label: { type: String, default: '' },
})

const body = computed(() => ICONS[props.name] ?? '')
const dim = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size))

if (import.meta.env.DEV && !ICONS[props.name]) {
  console.warn(`[BIcon] "${props.name}" is not in src/assets/icons. Copy it from bootstrap-icons.`)
}
</script>

<template>
  <svg
    class="bi"
    :style="{ width: dim, height: dim }"
    viewBox="0 0 16 16"
    fill="currentColor"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
    focusable="false"
    v-html="body"
  />
</template>

<style scoped>
/* Sits on the text baseline rather than below it, which is the whole
   difference between an icon in a button and an icon near a button. */
.bi{ display:inline-block; vertical-align:-.125em; flex:none; }
</style>
