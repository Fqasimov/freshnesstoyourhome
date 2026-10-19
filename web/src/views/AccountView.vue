<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import BIcon from '../components/BIcon.vue'
import { useI18n, lang } from '../composables/useI18n'
import { useAccount, pendingClaims } from '../composables/useAccount'
import { money } from '../data/catalogue'

/**
 * The personal cabinet: sign in, sign up, and the customer's orders.
 *
 * The same account as in the app — sign-up and sign-in call the same
 * endpoints, and the emailed code comes the same way. An order placed on this
 * site without an account is waiting in this browser to be claimed, and joins
 * the account the moment the customer signs in here.
 */
const { t } = useI18n()
const acc = useAccount()
const { user, orders, signedIn } = acc

/* ── signed out: three forms and the code step ─────────────────────────── */
const mode = ref('login')          // login · register · forgot
const step = ref('form')           // form · code
const busy = ref(false)
const error = ref('')
const fieldErrors = ref({})
const ticket = ref('')
const code = ref('')

const f = ref({ name: '', email: '', date_of_birth: '', password: '', password_confirmation: '' })

const PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
const emailOk = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value.email.trim()))
const pwOk = computed(() => PASSWORD.test(f.value.password))
const sameOk = computed(() => f.value.password === f.value.password_confirmation)
const canSubmit = computed(() => {
  if (!emailOk.value) return false
  if (mode.value === 'login') return f.value.password.length > 0
  if (mode.value === 'forgot') return pwOk.value && sameOk.value
  return f.value.name.trim().length >= 2 && f.value.date_of_birth && pwOk.value && sameOk.value
})

function switchTo (m) { mode.value = m; step.value = 'form'; error.value = ''; fieldErrors.value = {}; code.value = '' }

/* Server messages are in English; show ours, in the reader's language. */
function explain (e) {
  fieldErrors.value = e.errors ?? {}
  if (e.status === 0) return t('acc.errOffline')
  if (e.status === 429) return t('acc.errSlow')
  if (e.errors?.date_of_birth) return t('acc.errAge')
  if (e.errors?.password) return t('acc.pwRule')
  if (e.errors?.email) return t('acc.errEmail')
  return mode.value === 'login' && step.value === 'form' ? t('acc.errLogin') : t('acc.errGeneric')
}

async function submit () {
  if (!canSubmit.value || busy.value) return
  busy.value = true; error.value = ''
  const email = f.value.email.trim()
  try {
    if (mode.value === 'login') {
      await acc.login({ email, password: f.value.password })
      reset()
    } else {
      const body = mode.value === 'register'
        ? { name: f.value.name.trim(), email, date_of_birth: f.value.date_of_birth, password: f.value.password, password_confirmation: f.value.password_confirmation }
        : { email, password: f.value.password, password_confirmation: f.value.password_confirmation }
      const res = await (mode.value === 'register' ? acc.register(body) : acc.forgot(body))
      ticket.value = res.ticket
      step.value = 'code'
    }
  } catch (e) {
    error.value = explain(e)
  } finally {
    busy.value = false
  }
}

async function confirmCode () {
  if (!/^\d{6}$/.test(code.value.trim()) || busy.value) return
  busy.value = true; error.value = ''
  try {
    await acc.confirm({ ticket: ticket.value, email: f.value.email.trim(), code: code.value.trim() })
    reset()
  } catch (e) {
    error.value = e.status === 422 ? t('acc.errCode') : explain(e)
  } finally {
    busy.value = false
  }
}

/* A new code: the same form sent again, which mails a fresh one. */
async function resend () {
  step.value = 'form'
  await submit()
}

function reset () {
  f.value = { name: '', email: '', date_of_birth: '', password: '', password_confirmation: '' }
  code.value = ''; ticket.value = ''; step.value = 'form'; mode.value = 'login'
}

const waiting = computed(() => pendingClaims().length)
const maxBirth = new Date(Date.now() - 13 * 365.25 * 864e5).toISOString().slice(0, 10)

/* ── signed in: the orders ──────────────────────────────────────────────── */
const openId = ref(null)
const loadingOrders = ref(false)

async function refresh () {
  if (!signedIn.value) return
  loadingOrders.value = true
  try { await acc.loadOrders() } catch (e) { /* shown as an empty list */ }
  loadingOrders.value = false
}

const STEPS = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered']
const stepIndex = o => STEPS.indexOf(o.status)
const azn = minor => `${money((minor ?? 0) / 100)} AZN`
/* Month names written out rather than asked of Intl: browsers have no proper
   Azerbaijani date format and print "2026 M10 19" instead. */
const MONTHS = {
  az: ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avq', 'sen', 'okt', 'noy', 'dek'],
  ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}
const when = iso => {
  const d = iso ? new Date(iso) : null
  if (!d || Number.isNaN(d.getTime())) return ''
  return `${d.getDate()} ${(MONTHS[lang.value] ?? MONTHS.az)[d.getMonth()]} ${d.getFullYear()}`
}

async function cancel (o) {
  if (!window.confirm(t('acc.cancelAsk'))) return
  try { await acc.cancel(o.id); await refresh() } catch (e) { window.alert(t('acc.cancelNo')) }
}

async function logout () { await acc.logout(); openId.value = null }

onMounted(async () => { await acc.load(); refresh() })
watch(signedIn, v => { if (v) refresh() })
</script>

<template>
  <main class="acc">
    <div class="wrap">
      <RouterLink to="/" class="acc__back"><BIcon name="arrow-left" :size="12" /> {{ t('cat.back') }}</RouterLink>

      <!-- ── signed in ─────────────────────────────────────────────────── -->
      <template v-if="signedIn">
        <header class="acc__head">
          <h1 class="acc__h">{{ t('acc.hello') }}{{ user?.name ? `, ${user.name.split(' ')[0]}` : '' }}</h1>
          <p class="acc__sub">{{ user?.email }}</p>
          <div class="acc__tools">
            <button type="button" class="acc__link" @click="refresh">{{ t('acc.refresh') }}</button>
            <button type="button" class="acc__link" @click="logout">{{ t('acc.logout') }}</button>
          </div>
        </header>

        <h2 class="acc__h2">{{ t('acc.orders') }}</h2>
        <p v-if="loadingOrders && !orders.length" class="acc__muted">…</p>
        <div v-else-if="!orders.length" class="acc__empty">
          <p>{{ t('acc.none') }}</p>
          <RouterLink :to="{ name: 'catalogue' }" class="btn btn--brick"><span>{{ t('cta.go') }}</span></RouterLink>
        </div>

        <ul v-else class="ord">
          <li v-for="o in orders" :key="o.id" class="ord__it" :class="{ open: openId === o.id }">
            <button type="button" class="ord__row" :aria-expanded="openId === o.id" @click="openId = openId === o.id ? null : o.id">
              <span class="ord__code">{{ o.code }}</span>
              <span class="ord__date">{{ when(o.placed_at) }}</span>
              <span class="ord__st" :class="`st--${o.status}`">{{ t(`st.${o.status}`) }}</span>
              <span class="ord__sum">{{ o.final_total_minor == null && o.requires_weighing ? '≈ ' : '' }}{{ azn(o.payable_minor ?? o.total_minor) }}</span>
              <BIcon name="chevron-down" :size="11" class="ord__chev" />
            </button>

            <div v-if="openId === o.id" class="ord__body">
              <!-- Where the order is now. A cancelled order has no steps. -->
              <ol v-if="o.status !== 'cancelled'" class="track">
                <li v-for="(s, i) in STEPS" :key="s" :class="{ done: i <= stepIndex(o), now: i === stepIndex(o) }">
                  <i></i><span>{{ t(`st.${s}`) }}</span>
                </li>
              </ol>
              <p v-else class="acc__muted">{{ t('st.cancelled') }}{{ o.cancel_reason ? ` — ${o.cancel_reason}` : '' }}</p>

              <ul class="ord__lines">
                <li v-for="it in o.items" :key="it.id">
                  <span>{{ it.name }}</span>
                  <span class="acc__muted">{{ it.confirmed_qty ?? it.qty }} {{ it.unit_kind === 'kg' ? t('acc.kg') : t('acc.pcs') }}</span>
                  <b>{{ azn(it.final_line_total_minor ?? it.line_total_minor) }}</b>
                </li>
              </ul>

              <dl class="ord__dl">
                <dt>{{ t('acc.delivery') }}</dt><dd>{{ azn(o.delivery_fee_minor) }}</dd>
                <dt>{{ t('acc.total') }}</dt><dd><b>{{ o.payable_display ?? azn(o.total_minor) }}</b></dd>
                <template v-if="o.delivery_date"><dt>{{ t('acc.date') }}</dt><dd>{{ o.delivery_date }} {{ o.delivery_slot ?? '' }}</dd></template>
                <template v-if="o.address_line"><dt>{{ t('acc.address') }}</dt><dd>{{ o.address_line }}</dd></template>
              </dl>
              <p v-if="o.requires_weighing && o.final_total_minor == null" class="acc__note">{{ t('acc.weighed') }}</p>

              <button v-if="o.can_cancel" type="button" class="acc__link acc__link--danger" @click="cancel(o)">{{ t('acc.cancel') }}</button>
            </div>
          </li>
        </ul>

        <p class="acc__note">{{ t('acc.sameApp') }}</p>
      </template>

      <!-- ── signed out ────────────────────────────────────────────────── -->
      <template v-else>
        <header class="acc__head">
          <h1 class="acc__h">{{ t('acc.h') }}</h1>
          <p class="acc__sub">{{ t('acc.why') }}</p>
          <p v-if="waiting" class="acc__claim">{{ t('acc.waiting') }}</p>
        </header>

        <section class="box">
          <div v-if="step === 'form'" class="tabs" role="tablist">
            <button role="tab" :aria-selected="mode === 'login'" :class="{ on: mode === 'login' }" @click="switchTo('login')">{{ t('acc.login') }}</button>
            <button role="tab" :aria-selected="mode === 'register'" :class="{ on: mode === 'register' }" @click="switchTo('register')">{{ t('acc.register') }}</button>
          </div>

          <form v-if="step === 'form'" class="form" @submit.prevent="submit" novalidate>
            <p v-if="mode === 'forgot'" class="acc__muted">{{ t('acc.forgotP') }}</p>

            <template v-if="mode === 'register'">
              <label class="lbl" for="acc-name">{{ t('acc.name') }}</label>
              <input id="acc-name" v-model="f.name" class="in" autocomplete="name" maxlength="80">
              <label class="lbl" for="acc-dob">{{ t('acc.dob') }}</label>
              <input id="acc-dob" v-model="f.date_of_birth" class="in" type="date" :max="maxBirth" min="1900-01-01">
            </template>

            <label class="lbl" for="acc-email">{{ t('acc.email') }}</label>
            <input id="acc-email" v-model="f.email" class="in" type="email" autocomplete="email" inputmode="email" maxlength="254"
                   :class="{ bad: f.email && !emailOk }">

            <label class="lbl" for="acc-pw">{{ mode === 'forgot' ? t('acc.newPw') : t('acc.pw') }}</label>
            <input id="acc-pw" v-model="f.password" class="in" type="password" maxlength="128"
                   :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
                   :class="{ bad: mode !== 'login' && f.password && !pwOk }">
            <p v-if="mode !== 'login'" class="hint">{{ t('acc.pwRule') }}</p>

            <template v-if="mode !== 'login'">
              <label class="lbl" for="acc-pw2">{{ t('acc.pw2') }}</label>
              <input id="acc-pw2" v-model="f.password_confirmation" class="in" type="password" autocomplete="new-password" maxlength="128"
                     :class="{ bad: f.password_confirmation && !sameOk }">
            </template>

            <p v-if="error" class="err" role="alert">{{ error }}</p>

            <button class="btn btn--brick form__go" :disabled="!canSubmit || busy">
              <span>{{ busy ? '…' : mode === 'login' ? t('acc.login') : mode === 'register' ? t('acc.register') : t('acc.sendCode') }}</span>
            </button>

            <button v-if="mode === 'login'" type="button" class="acc__link" @click="switchTo('forgot')">{{ t('acc.forgot') }}</button>
            <button v-if="mode === 'forgot'" type="button" class="acc__link" @click="switchTo('login')">{{ t('acc.backLogin') }}</button>
          </form>

          <!-- The emailed code. The account exists only after this. -->
          <form v-else class="form" @submit.prevent="confirmCode" novalidate>
            <p class="acc__sub">{{ t('acc.codeP') }} <b>{{ f.email }}</b></p>
            <label class="lbl" for="acc-code">{{ t('acc.code') }}</label>
            <input id="acc-code" v-model="code" class="in in--code" inputmode="numeric" autocomplete="one-time-code" maxlength="6">
            <p v-if="error" class="err" role="alert">{{ error }}</p>
            <button class="btn btn--brick form__go" :disabled="busy || !/^\d{6}$/.test(code.trim())"><span>{{ busy ? '…' : t('acc.confirm') }}</span></button>
            <button type="button" class="acc__link" :disabled="busy" @click="resend">{{ t('acc.resend') }}</button>
            <button type="button" class="acc__link" @click="step = 'form'; error = ''">{{ t('acc.edit') }}</button>
          </form>
        </section>

        <p class="acc__note">{{ t('acc.sameApp') }}</p>
      </template>
    </div>
  </main>
</template>

<style scoped>
.acc{ padding:calc(var(--nav-h, 76px) + 28px) 0 90px; min-height:80vh; background:var(--paper); }
.acc .wrap{ max-width:760px; }
.acc__back{
  display:inline-flex; align-items:center; gap:6px; margin-bottom:12px;
  font-size:.78rem; letter-spacing:.08em; text-transform:uppercase; color:var(--ink-3); text-decoration:none;
}
.acc__head{ margin-bottom:22px; }
.acc__h{ margin:0; font-family:var(--display); font-weight:600; font-size:clamp(2rem,4.4vw,3rem); line-height:1.05; letter-spacing:-.02em; }
.acc__h2{ margin:26px 0 12px; font-family:var(--display); font-weight:600; font-size:1.4rem; }
.acc__sub{ margin:8px 0 0; color:var(--ink-2); font-size:.95rem; line-height:1.5; }
.acc__muted{ color:var(--ink-3); font-size:.85rem; }
.acc__note{ margin:18px 0 0; color:var(--ink-3); font-size:.8rem; line-height:1.5; }
.acc__claim{ margin:12px 0 0; padding:10px 14px; border-radius:12px; background:var(--paper-2); font-size:.86rem; color:var(--forest); }
.acc__tools{ display:flex; gap:16px; margin-top:12px; }
.acc__link{ background:none; border:0; padding:6px 0; color:var(--forest); font:inherit; font-size:.86rem; font-weight:600; cursor:pointer; text-align:left; }
.acc__link:hover{ text-decoration:underline; }
.acc__link--danger{ color:var(--brick); }
.acc__empty{ display:flex; flex-direction:column; align-items:flex-start; gap:14px; padding:22px; border-radius:18px; background:var(--paper-2); }
.acc__empty p{ margin:0; color:var(--ink-2); }

.box{ padding:22px; border:1px solid var(--line); border-radius:20px; background:var(--paper); max-width:440px; }
.tabs{ display:flex; gap:6px; padding:4px; margin-bottom:18px; border-radius:999px; background:var(--paper-2); }
.tabs button{ flex:1; border:0; background:none; padding:9px 12px; border-radius:999px; font:inherit; font-size:.86rem; font-weight:600; color:var(--ink-2); cursor:pointer; }
.tabs button.on{ background:var(--paper); color:var(--ink); box-shadow:0 1px 4px rgba(0,0,0,.08); }
.form{ display:flex; flex-direction:column; }
.lbl{ font-size:.74rem; color:var(--ink-3); margin:0 0 4px; }
.in{
  width:100%; margin-bottom:12px; padding:10px 12px; border:1px solid var(--line); border-radius:8px;
  background:var(--paper); font-family:var(--sans); font-size:.92rem; color:var(--ink);
}
.in:focus{ outline:none; border-color:var(--logo); }
.in.bad{ border-color:var(--brick); }
.in--code{ font-size:1.4rem; letter-spacing:.4em; text-align:center; font-variant-numeric:tabular-nums; }
.hint{ margin:-6px 0 12px; font-size:.72rem; color:var(--ink-3); line-height:1.45; }
.err{ margin:0 0 12px; padding:9px 12px; border-radius:8px; background:rgba(144,69,46,.1); color:var(--brick); font-size:.84rem; }
.form__go{ justify-content:center; margin:4px 0 8px; }
.form__go:disabled{ opacity:.5; pointer-events:none; }

.ord{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; }
.ord__it{ border:1px solid var(--line); border-radius:16px; background:var(--paper); overflow:hidden; }
.ord__row{
  width:100%; display:grid; grid-template-columns:auto 1fr auto auto 14px; align-items:center; gap:12px;
  padding:14px 16px; border:0; background:none; font:inherit; color:inherit; text-align:left; cursor:pointer;
}
.ord__code{ font-weight:700; letter-spacing:.06em; }
.ord__date{ color:var(--ink-3); font-size:.82rem; }
.ord__sum{ font-weight:600; font-variant-numeric:tabular-nums; }
.ord__chev{ transition:transform .3s; }
.ord__it.open .ord__chev{ transform:rotate(180deg); }
.ord__st{ font-size:.72rem; font-weight:700; padding:4px 9px; border-radius:999px; background:var(--paper-2); color:var(--ink-2); white-space:nowrap; }
.st--confirmed, .st--preparing{ background:#efe7c9; color:#6b5413; }
.st--out_for_delivery{ background:#dbe9f3; color:#1d4b6b; }
.st--delivered{ background:#dcebd6; color:var(--forest); }
.st--cancelled{ background:rgba(144,69,46,.12); color:var(--brick); }
.ord__body{ padding:4px 16px 16px; border-top:1px solid var(--line-soft, var(--line)); }
.ord__lines{ list-style:none; margin:12px 0; padding:0; }
.ord__lines li{ display:grid; grid-template-columns:1fr auto auto; gap:12px; padding:6px 0; font-size:.88rem; border-bottom:1px dashed var(--line); }
.ord__dl{ display:grid; grid-template-columns:auto 1fr; gap:6px 16px; margin:8px 0; font-size:.88rem; }
.ord__dl dt{ color:var(--ink-3); }
.ord__dl dd{ margin:0; text-align:right; }

.track{ list-style:none; margin:14px 0 4px; padding:0; display:grid; grid-template-columns:repeat(5,1fr); gap:4px; }
.track li{ display:flex; flex-direction:column; gap:6px; font-size:.7rem; color:var(--ink-3); }
.track i{ height:4px; border-radius:4px; background:var(--line); }
.track li.done i{ background:var(--forest); }
.track li.now span{ color:var(--ink); font-weight:700; }

@media (max-width:560px){
  .ord__row{ grid-template-columns:1fr auto 14px; }
  .ord__date{ grid-column:1; grid-row:2; }
  .ord__st{ grid-column:2; grid-row:1; }
  .ord__sum{ grid-column:2; grid-row:2; text-align:right; }
  .ord__chev{ grid-column:3; grid-row:1 / span 2; }
  .track{ grid-template-columns:1fr; }
  .track li{ flex-direction:row; align-items:center; }
  .track i{ width:18px; height:18px; border-radius:50%; flex:none; }
}
</style>
