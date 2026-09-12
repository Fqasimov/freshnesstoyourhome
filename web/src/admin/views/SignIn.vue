<script setup>
import { ref, nextTick } from 'vue'
import { api, signIn, ApiError, DEMO } from '../api'

const emit = defineEmits(['in'])

// The preview has no mailbox to send to, so it starts filled in.
const email = ref(DEMO ? 'siz@freshnesstoyourhome.az' : '')
const code = ref('')
const stage = ref('email')
const busy = ref(false)
const error = ref('')
const codeBox = ref(null)

async function requestCode () {
  busy.value = true
  error.value = ''
  try {
    await api('/auth/request-code', {
      method: 'POST',
      auth: false,
      body: { email: email.value.trim(), locale: 'az' },
    })
    stage.value = 'code'
    await nextTick()
    codeBox.value?.focus()
  } catch (e) {
    // The endpoint answers the same way whether or not the address exists, so
    // there is nothing here to translate into "no such account" — and nothing
    // an attacker can learn by watching this screen.
    error.value = e.message
  } finally {
    busy.value = false
  }
}

async function verify () {
  busy.value = true
  error.value = ''
  try {
    await signIn(email.value.trim(), code.value.trim())
    emit('in')
  } catch (e) {
    error.value = e instanceof ApiError && e.body?.message === 'not-admin'
      ? 'Bu hesab idarəçi deyil. / This account is not an administrator.'
      : e.message
    if (e.body?.message === 'not-admin') stage.value = 'email'
    code.value = ''
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="a-signin">
    <div class="a-signin__box">
      <h1><span class="a-brand"><i></i> Freshness</span></h1>
      <p>İdarə paneli · Admin panel</p>

      <div v-if="DEMO" class="a-note a-note--ok">
        <b>Nümunə</b> — bu, real mağaza məlumatı deyil. İstənilən e-poçt və
        istənilən 6 rəqəm ilə daxil ola bilərsiniz.
        <br><b>Preview</b> — not real shop data. Any address and any six digits will let you in.
      </div>

      <div v-if="error" class="a-note a-note--err">{{ error }}</div>

      <form v-if="stage === 'email'" @submit.prevent="requestCode">
        <div class="a-field">
          <label for="em">E-poçt</label>
          <input id="em" v-model="email" class="a-in" type="email" autocomplete="username"
                 required autofocus placeholder="you@example.com">
        </div>
        <button class="a-btn" style="width:100%" :disabled="busy || !email">
          {{ busy ? '…' : 'Kod göndər' }}
        </button>
      </form>

      <form v-else @submit.prevent="verify">
        <div class="a-note a-note--ok">
          Kod {{ email }} ünvanına göndərildi.
        </div>
        <div class="a-field">
          <label for="cd">Təsdiq kodu</label>
          <input id="cd" ref="codeBox" v-model="code" class="a-in a-code"
                 inputmode="numeric" autocomplete="one-time-code" required placeholder="······">
        </div>
        <button class="a-btn" style="width:100%" :disabled="busy || !code">
          {{ busy ? '…' : 'Daxil ol' }}
        </button>
        <button type="button" class="a-btn a-btn--ghost" style="width:100%;margin-top:8px"
                @click="stage = 'email'; code = ''">
          Geri
        </button>
      </form>
    </div>
  </div>
</template>
