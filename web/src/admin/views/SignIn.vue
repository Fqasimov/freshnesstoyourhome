<script setup>
import { ref, nextTick } from 'vue'
import QRCode from 'qrcode'
import { api, verifyEmailCode, completeTwoFactor, loadMe, DEMO } from '../api'

const emit = defineEmits(['in'])

// The preview has no mailbox to send to, so it starts filled in.
const email = ref(DEMO ? 'siz@freshnesstoyourhome.az' : '')
const code = ref('')
const appCode = ref('')
const recovery = ref('')
const useRecovery = ref(false)

// email → code → (enroll | totp) → [codes, first time only]
const stage = ref('email')
const busy = ref(false)
const error = ref('')

const ticket = ref('')
const secret = ref('')
const qr = ref('')
const recoveryCodes = ref([])
const focusBox = ref(null)

async function focus () {
  await nextTick()
  focusBox.value?.focus()
}

async function requestCode () {
  busy.value = true
  error.value = ''
  try {
    await api('/auth/panel/request-code', {
      method: 'POST',
      auth: false,
      body: { email: email.value.trim(), locale: 'az' },
    })
    stage.value = 'code'
    focus()
  } catch (e) {
    // The endpoint answers the same way for the admin's address and for any
    // other, so there is nothing here to translate into "not an admin" — and
    // nothing an attacker can learn by watching this screen.
    error.value = e.message
  } finally {
    busy.value = false
  }
}

async function verifyEmail () {
  busy.value = true
  error.value = ''
  try {
    const step = await verifyEmailCode(email.value.trim(), code.value.trim())
    ticket.value = step.ticket

    if (step.two_factor === 'enroll') {
      secret.value = step.secret
      // Drawn here, in the browser. The secret never goes to a QR service.
      qr.value = await QRCode.toDataURL(step.otpauth, { margin: 1, width: 220 })
      stage.value = 'enroll'
    } else {
      stage.value = 'totp'
    }
    focus()
  } catch (e) {
    error.value = e.message
    code.value = ''
  } finally {
    busy.value = false
  }
}

async function verifyApp () {
  busy.value = true
  error.value = ''
  try {
    const done = await completeTwoFactor(ticket.value, useRecovery.value
      ? { recoveryCode: recovery.value.trim() }
      : { code: appCode.value.trim() })

    if (done.recovery_codes) {
      // First sign-in: show the codes once, then open the panel.
      recoveryCodes.value = done.recovery_codes
      stage.value = 'codes'
    } else {
      // The token is proof of the address, not of authority. This is the
      // request that decides whether the panel opens at all.
      await loadMe()
      emit('in')
    }
  } catch (e) {
    error.value = e.message
    appCode.value = ''
    recovery.value = ''
    // An expired or exhausted ticket cannot be retried; start again.
    if (/expired|Start again/i.test(e.message)) restart()
  } finally {
    busy.value = false
  }
}

function restart () {
  stage.value = 'email'
  code.value = ''
  appCode.value = ''
  recovery.value = ''
  ticket.value = ''
  secret.value = ''
  qr.value = ''
  useRecovery.value = false
}

async function done () {
  try {
    await loadMe()
    recoveryCodes.value = []
    emit('in')
  } catch (e) {
    error.value = e.message
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

      <!-- 1. Email -->
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

      <!-- 2. The emailed code -->
      <form v-else-if="stage === 'code'" data-step="email-code" @submit.prevent="verifyEmail">
        <div class="a-note a-note--ok">
          {{ email }} bu panelə icazəli ünvandırsa, kod ora göndərildi.
          <br><small>If this address may use the panel, a code is on its way.</small>
        </div>
        <div class="a-field">
          <label for="cd">E-poçtdakı kod</label>
          <input id="cd" ref="focusBox" v-model="code" class="a-in a-code"
                 inputmode="numeric" autocomplete="one-time-code" required placeholder="······">
        </div>
        <button class="a-btn" style="width:100%" :disabled="busy || !code">
          {{ busy ? '…' : 'Davam et' }}
        </button>
        <button type="button" class="a-btn a-btn--ghost" style="width:100%;margin-top:8px" @click="restart">
          Geri
        </button>
      </form>

      <!-- 3a. First time: set up the authenticator app -->
      <form v-else-if="stage === 'enroll'" data-step="enroll" @submit.prevent="verifyApp">
        <div class="a-note a-note--ok">
          <b>İki mərhələli giriş · Two-step sign-in.</b>
          Telefonda Google Authenticator (və ya oxşar tətbiq) açın, bu kodu skan edin.
          <br><small>Scan this with an authenticator app on your phone.</small>
        </div>
        <img v-if="qr" :src="qr" alt="QR" width="220" height="220"
             style="display:block;margin:0 auto 10px;border-radius:8px;background:#fff">
        <p style="text-align:center;margin:0 0 12px">
          <small>Skan olmursa, əl ilə daxil edin · Or type this key:</small><br>
          <code data-secret style="font-size:.85rem;word-break:break-all">{{ secret }}</code>
        </p>
        <div class="a-field">
          <label for="tf">Tətbiqdəki 6 rəqəm · Code from the app</label>
          <input id="tf" ref="focusBox" v-model="appCode" class="a-in a-code"
                 inputmode="numeric" autocomplete="one-time-code" required placeholder="······">
        </div>
        <button class="a-btn" style="width:100%" :disabled="busy || !appCode">
          {{ busy ? '…' : 'Təsdiqlə və daxil ol' }}
        </button>
      </form>

      <!-- 3b. Every time after: the app's code -->
      <form v-else-if="stage === 'totp'" data-step="totp" @submit.prevent="verifyApp">
        <div class="a-field" v-if="!useRecovery">
          <label for="tf">Tətbiqdəki 6 rəqəm · Code from the app</label>
          <input id="tf" ref="focusBox" v-model="appCode" class="a-in a-code"
                 inputmode="numeric" autocomplete="one-time-code" required placeholder="······">
        </div>
        <div class="a-field" v-else>
          <label for="rc">Bərpa kodu · Recovery code</label>
          <input id="rc" v-model="recovery" class="a-in" autocomplete="off" required placeholder="xxxxx-xxxxx">
        </div>
        <button class="a-btn" style="width:100%" :disabled="busy || !(useRecovery ? recovery : appCode)">
          {{ busy ? '…' : 'Daxil ol' }}
        </button>
        <button type="button" class="a-btn a-btn--ghost" style="width:100%;margin-top:8px"
                @click="useRecovery = !useRecovery; error = ''">
          {{ useRecovery ? 'Tətbiq kodu ilə · Use the app' : 'Telefon yoxdur? Bərpa kodu · Lost your phone?' }}
        </button>
      </form>

      <!-- 4. Recovery codes, shown once -->
      <div v-else-if="stage === 'codes'" data-step="codes">
        <div class="a-note a-note--ok">
          <b>Bu kodları indi saxlayın · Save these now.</b>
          Telefon itərsə, hər biri bir dəfə giriş verir. Bir daha göstərilməyəcək.
          <br><small>Each gets you in once if the phone is lost. They will not be shown again.</small>
        </div>
        <pre data-recovery style="font-family:var(--mono);font-size:1rem;line-height:1.7;text-align:center;margin:0 0 14px">{{ recoveryCodes.join('\n') }}</pre>
        <button class="a-btn" style="width:100%" @click="done">Saxladım · I have saved them</button>
      </div>
    </div>
  </div>
</template>
