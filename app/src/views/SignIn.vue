<script setup>
import { ref, computed, nextTick, useTemplateRef } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../stores/auth'
import { useCatalogue } from '../stores/catalogue'
import { ApiError } from '../api/client'
import { t, currentLang, LANGS, setLang } from '../i18n'

const auth = useAuth()
const catalogue = useCatalogue()
const router = useRouter()
const route = useRoute()

const step = ref('email')   // 'email' -> 'code'
const email = ref('')
const code = ref('')
const error = ref('')
const busy = ref(false)

const codeInput = useTemplateRef('codeInput')

const ttl = computed(() => catalogue.delivery?.code_ttl_minutes ?? 10)

const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim()))
const codeValid = computed(() => /^\d{6}$/.test(code.value))

async function sendCode () {
  if (!emailValid.value || busy.value) return
  busy.value = true
  error.value = ''

  try {
    await auth.requestCode(email.value.trim(), currentLang.value)
    step.value = 'code'
    await nextTick()
    codeInput.value?.focus()
  } catch (e) {
    // The server answers identically whether or not the account exists, so
    // there is nothing here that could leak it. A 429 is the one case worth
    // naming, because the customer can act on it by waiting.
    error.value = e.status === 429
      ? t('auth.sent')
      : e.status === 0 ? t('err.offline') : t('err.generic')
  } finally {
    busy.value = false
  }
}

async function verify () {
  if (!codeValid.value || busy.value) return
  busy.value = true
  error.value = ''

  try {
    await auth.verifyCode(email.value.trim(), code.value)
    router.replace(route.query.next || '/shop')
  } catch (e) {
    error.value = e instanceof ApiError && e.status === 0 ? t('err.offline') : t('err.code')
    code.value = ''
  } finally {
    busy.value = false
  }
}

function back () {
  step.value = 'email'
  code.value = ''
  error.value = ''
}
</script>

<template>
  <main class="screen screen--plain signin">
    <div class="signin__top">
      <div class="signin__langs">
        <button
          v-for="l in LANGS"
          :key="l"
          class="signin__lang"
          :class="{ 'is-on': currentLang === l }"
          @click="setLang(l)"
        >{{ l.toUpperCase() }}</button>
      </div>

      <h1 class="signin__brand">Freshness<br>To Your Home</h1>
      <p class="signin__tagline">{{ t('app.tagline') }}</p>
    </div>

    <div class="signin__panel">
      <Transition name="fade" mode="out-in">
        <!-- Step one: the address -->
        <form v-if="step === 'email'" key="email" @submit.prevent="sendCode">
          <h2>{{ t('auth.title') }}</h2>
          <p class="muted small signin__lead">{{ t('auth.lead') }}</p>

          <label class="field">
            <span class="field__label">{{ t('auth.email') }}</span>
            <input
              v-model="email"
              class="field__input"
              type="email"
              inputmode="email"
              autocomplete="email"
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
              enterkeyhint="send"
              placeholder="ad@example.com"
            >
          </label>

          <p v-if="error" class="field__error">{{ error }}</p>

          <button class="btn btn--primary btn--block" :disabled="!emailValid || busy" type="submit">
            <span v-if="busy" class="spinner" /> {{ t('auth.send') }}
          </button>
        </form>

        <!-- Step two: the code -->
        <form v-else key="code" @submit.prevent="verify">
          <h2>{{ t('auth.codeTitle') }}</h2>
          <p class="muted small signin__lead">{{ t('auth.codeLead', { email: email.trim(), minutes: ttl }) }}</p>

          <label class="field">
            <span class="field__label">{{ t('auth.code') }}</span>
            <input
              ref="codeInput"
              v-model="code"
              class="field__input signin__code"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              enterkeyhint="go"
              placeholder="000000"
            >
          </label>

          <p v-if="error" class="field__error">{{ error }}</p>

          <button class="btn btn--primary btn--block" :disabled="!codeValid || busy" type="submit">
            <span v-if="busy" class="spinner" /> {{ t('auth.verify') }}
          </button>

          <div class="signin__alt">
            <button type="button" @click="back">{{ t('auth.back') }}</button>
            <button type="button" :disabled="busy" @click="sendCode">{{ t('auth.resend') }}</button>
          </div>

          <p class="note note--warn signin__warn">{{ t('auth.never') }}</p>
          <p class="muted small signin__spam">{{ t('auth.spam') }}</p>
        </form>
      </Transition>
    </div>
  </main>
</template>

<style scoped>
.signin{
  display:flex; flex-direction:column;
  min-height:100dvh;
  background:var(--forest);
}
.signin__top{
  padding:calc(var(--safe-top) + 20px) var(--gutter) 34px;
  color:#fff;
}
.signin__langs{ display:flex; gap:6px; justify-content:flex-end; margin-bottom:26px; }
.signin__lang{
  padding:5px 11px; border-radius:999px;
  font-size:.74rem; font-weight:700; letter-spacing:.04em;
  background:rgba(255,255,255,.14); color:#fff;
}
.signin__lang.is-on{ background:var(--acid); color:var(--ink); }

.signin__brand{
  font-family:var(--display); font-size:2.5rem; font-weight:600;
  line-height:1.02; letter-spacing:-.015em;
}
.signin__tagline{
  margin-top:10px;
  /* --leaf-xl rather than --leaf-l: this is small text on a dark ground. */
  color:var(--leaf-xl); font-size:.95rem; letter-spacing:.02em;
}

.signin__panel{
  flex:1;
  padding:26px var(--gutter) calc(var(--safe-bottom) + 26px);
  background:var(--paper);
  border-radius:18px 18px 0 0;
}
.signin__lead{ margin:8px 0 22px; }

.signin__code{
  font-size:1.6rem; font-weight:700;
  letter-spacing:.42em; text-align:center;
  font-variant-numeric:tabular-nums;
}

.signin__alt{
  display:flex; justify-content:space-between; gap:12px;
  margin-top:16px;
}
.signin__alt button{
  padding:10px 2px;
  font-size:.88rem; font-weight:600; color:var(--forest);
  text-decoration:underline; text-underline-offset:3px;
}
.signin__warn{ margin-top:24px; }
.signin__spam{ margin-top:12px; }
</style>
