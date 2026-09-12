<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n, lang, LANGS } from '../composables/useI18n'
import { useCart } from '../composables/useCart'
import mark from '../assets/logo-mark.png'

const { t } = useI18n()
const { count, open } = useCart()

const solid = ref(false)
const menu  = ref(false)
const cartBtn = ref(null)
const popped = ref(false)

defineExpose({ cartBtn })

/* Sections of the home page, each carrying the route as well as the anchor —
   otherwise these links do nothing when the customer is already on the
   catalogue. The catalogue itself is not in this list: it is a page, not a
   section, and it sits in the toolbar as a button so it reads as somewhere to
   go rather than as the first of five words. */
const links = [
  { to: { path: '/', hash: '#sets' }, key: 'nav.sets' },
  { to: { path: '/', hash: '#week' }, key: 'nav.week' },
  { to: { path: '/', hash: '#story' }, key: 'nav.story' },
  { to: { path: '/', hash: '#contact' }, key: 'nav.contact' },
]

const route = useRoute()

/* The transparent header is for the home page, where it sits over a dark hero
   photograph. Every other page starts at the paper background, so the nav has
   to be solid from the first pixel or its light text is invisible on cream. */
const overHero = () => route.name === 'home'

const onScroll = () => {
  solid.value = !overHero() || window.scrollY > window.innerHeight * 0.72
}
onMounted(() => { window.addEventListener('scroll', onScroll, { passive: true }); onScroll() })
onUnmounted(() => window.removeEventListener('scroll', onScroll))

/* Re-evaluate on navigation: leaving the home page must make it solid even
   though no scroll event fires. */
watch(() => route.name, onScroll)

/* Nudge the badge whenever the basket grows. */
watch(count, (now, before) => {
  if (now <= before) return
  popped.value = false
  requestAnimationFrame(() => { popped.value = true })
  setTimeout(() => { popped.value = false }, 520)
})
</script>

<template>
  <header class="nav" :class="{ solid }">
    <div class="nav__in">
      <RouterLink to="/" class="nav__brand">
        <span class="nav__mark"><img :src="mark" alt="Freshness To Your Home"></span>
        <span class="nav__name">
          <b>Freshness</b>
          <span>To Your Home</span>
        </span>
      </RouterLink>

      <nav class="nav__links" :class="{ open: menu }">
        <RouterLink v-for="l in links" :key="l.key" :to="l.to" @click="menu = false">{{ t(l.key) }}</RouterLink>
      </nav>

      <div class="nav__tools">
        <RouterLink :to="{ name: 'catalogue' }" class="navcat" @click="menu = false">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
          <span>{{ t('cta.go') }}</span>
        </RouterLink>

        <div class="lang">
          <button v-for="l in LANGS" :key="l" :class="{ on: lang === l }"
                  :aria-pressed="lang === l" @click="lang = l">
            <span>{{ l.toUpperCase() }}</span>
          </button>
        </div>

        <button class="cartbtn" ref="cartBtn" aria-label="Open cart" @click="open = true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          <span class="lbl">{{ t('nav.cart') }}</span>
          <span class="cartbtn__n" :class="{ pop: popped }">{{ count }}</span>
        </button>

        <button class="burger" :class="{ x: menu }" aria-label="Menu" @click="menu = !menu"><i></i></button>
      </div>
    </div>
  </header>
</template>

<style scoped>
/* Solid, so it does not read as one more nav word. It keeps its own colours in
   both states of the header — over the dark hero and on cream — because a
   button that disappears halfway down the page is worse than no button. */
.navcat{
  display:inline-flex; align-items:center; gap:8px;
  padding:9px 15px; border-radius:100px;
  font-size:.74rem; font-weight:600; letter-spacing:.03em; white-space:nowrap;
  background:var(--brick); color:#fff;
  transition:transform .3s var(--ease-out), box-shadow .3s var(--ease-out), opacity .3s;
}
.navcat:hover{ transform:translateY(-1px); box-shadow:0 8px 20px rgba(0,0,0,.2); color:#fff; }
.navcat.router-link-active{ opacity:.55; pointer-events:none; }

/* Below the toolbar's breaking point the label goes and the icon stays: the
   basket and the language switch have first call on the width. */
@media (max-width:720px){
  .navcat span{ display:none; }
  .navcat{ padding:9px 11px; }
}

/* ---------- 4. Header ---------------------------------------------------- */
.nav{
  position:fixed; inset:0 0 auto 0; z-index:200;
  height:var(--nav-h);
  display:flex; align-items:center;
  transition:background .45s var(--ease), height .45s var(--ease), box-shadow .45s var(--ease);
}
.nav__in{
  width:100%; max-width:var(--maxw); margin-inline:auto; padding-inline:var(--gutter);
  display:flex; align-items:center; gap:clamp(16px,3vw,48px);
}
.nav__brand{ display:flex; align-items:center; gap:12px; margin-right:auto; }
.nav__mark{
  width:40px; height:40px; border-radius:50%; background:var(--paper);
  display:grid; place-items:center; overflow:hidden; flex:none;
  box-shadow:0 0 0 1px rgba(255,255,255,.2);
  transition:transform .5s var(--ease-out);
}
.nav__brand:hover .nav__mark{ transform:rotate(-8deg) scale(1.06); }
.nav__mark img{ width:100%; height:100%; object-fit:contain; padding:2px; }
.nav__name{ display:flex; flex-direction:column; line-height:1; }
.nav__name b{ font-family:var(--display); font-size:1.05rem; font-weight:500; letter-spacing:-.01em; white-space:nowrap; }
.nav__name span{ font-size:.58rem; letter-spacing:.2em; text-transform:uppercase; opacity:.7; margin-top:4px; white-space:nowrap; }

.nav__links{ display:flex; gap:clamp(14px,1.8vw,30px); }
.nav__links a{
  font-size:.83rem; letter-spacing:.01em; position:relative; padding:6px 0; opacity:.85;
  transition:opacity .3s var(--ease);
}
.nav__links a::after{
  content:''; position:absolute; left:0; right:0; bottom:2px; height:1px;
  background:currentColor; transform:scaleX(0); transform-origin:right;
  transition:transform .45s var(--ease-out);
}
.nav__links a:hover{ opacity:1; }
.nav__links a:hover::after{ transform:scaleX(1); transform-origin:left; }

.nav__tools{ display:flex; align-items:center; gap:10px; }

.lang{
  display:flex; align-items:center; border:1px solid currentColor; border-radius:100px;
  padding:2px; opacity:.8; transition:opacity .3s var(--ease);
}
.lang:hover{ opacity:1; }
.lang button{
  font-size:.68rem; font-weight:600; letter-spacing:.09em; padding:4px 10px; border-radius:100px;
  opacity:.62; transition:background .35s var(--ease), color .35s var(--ease), opacity .3s var(--ease);
}
.lang button:hover{ opacity:1; }
.lang button.on{ background:var(--acid); color:var(--ink); opacity:1; }

.cartbtn{
  display:flex; align-items:center; gap:9px;
  border:1px solid currentColor; border-radius:100px; padding:8px 14px 8px 15px;
  font-size:.78rem; letter-spacing:.04em; position:relative;
  transition:background .4s var(--ease), color .4s var(--ease), transform .3s var(--ease-out);
}
.cartbtn:hover{ transform:translateY(-1px); }
.cartbtn__n{
  min-width:20px; height:20px; padding:0 5px; border-radius:100px;
  background:var(--brick); color:#fff;
  font-size:.68rem; font-weight:700; display:grid; place-items:center;
  transition:transform .4s var(--ease-out);
}
.cartbtn__n.pop{ animation:pop .5s var(--ease-out); }
@keyframes pop{ 0%{transform:scale(1)} 35%{transform:scale(1.45)} 100%{transform:scale(1)} }

.burger{ display:none; width:40px; height:40px; place-items:center; }
.burger i{ display:block; width:20px; height:1.5px; background:currentColor; position:relative; transition:.4s var(--ease); }
.burger i::before,.burger i::after{ content:''; position:absolute; left:0; width:20px; height:1.5px; background:currentColor; transition:.4s var(--ease); }
.burger i::before{ top:-6px; } .burger i::after{ top:6px; }

/* over-hero (dark) vs scrolled (paper) */
.nav{ color:var(--paper); }
.nav.solid{
  color:var(--ink); height:64px;
  background:rgba(246,243,234,.92);
  backdrop-filter:saturate(1.4) blur(14px);
  -webkit-backdrop-filter:saturate(1.4) blur(14px);
  box-shadow:0 1px 0 var(--line);
}
.nav.solid .nav__mark{ box-shadow:0 0 0 1px var(--line); }

@media (max-width:860px){
  .nav__links{
    position:fixed; inset:0 0 auto 0; z-index:-1;
    flex-direction:column; gap:0;
    background:var(--paper); color:var(--ink);
    padding:calc(var(--nav-h) + 14px) var(--gutter) 26px;
    transform:translateY(-102%); transition:transform .6s var(--ease-out);
    box-shadow:0 20px 40px rgba(0,0,0,.14);
  }
  .nav__links.open{ transform:none; }
  .nav__links a{ padding:14px 0; border-bottom:1px solid var(--line-soft); font-size:1.05rem; font-family:var(--display); }
  .burger{ display:grid; order:3; }
  .burger.x i{ background:transparent; }
  .burger.x i::before{ transform:translateY(6px) rotate(45deg); }
  .burger.x i::after{ transform:translateY(-6px) rotate(-45deg); }
  .cartbtn span.lbl{ display:none; }
  .cartbtn{ padding:8px 11px; }
  .nav__in{ gap:10px; }
  .nav__brand{ min-width:0; }
  .lang button{ padding:4px 8px; }
}

@media (max-width:440px){
  .nav__name{ display:none; }
}
</style>
