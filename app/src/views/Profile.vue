<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/auth'
import AppBar from '../components/AppBar.vue'
import { t, LANGS, currentLang, setLang } from '../i18n'

const auth = useAuth()
const router = useRouter()

const name = ref(auth.user?.name ?? '')
const phone = ref(auth.user?.phone ?? '')
const saving = ref(false)
const saved = ref(false)
const error = ref('')

// Two taps to delete an account, never one.
const confirmingDelete = ref(false)
const deleting = ref(false)

watch(() => auth.user, (u) => {
  name.value = u?.name ?? ''
  phone.value = u?.phone ?? ''
})

async function save () {
  saving.value = true
  saved.value = false
  error.value = ''

  try {
    await auth.updateProfile({ name: name.value.trim(), phone: phone.value.trim() })
    saved.value = true
    setTimeout(() => { saved.value = false }, 2400)
  } catch (e) {
    error.value = Object.values(e.fieldErrors ?? {})[0] ?? t('err.generic')
  } finally {
    saving.value = false
  }
}

async function changeLang (l) {
  await setLang(l)
  // Persisted on the account too, so the confirmation emails arrive in the
  // language the customer actually reads.
  if (auth.isSignedIn) {
    try { await auth.updateProfile({ locale: l }) } catch { /* local change stands */ }
  }
}

async function signOut () {
  await auth.signOut()
  router.replace('/shop')
}

async function deleteAccount () {
  deleting.value = true
  error.value = ''
  try {
    await auth.deleteAccount()
    router.replace('/shop')
  } catch (e) {
    // 409: an order is still in flight and somebody is about to deliver it.
    error.value = e.message ?? t('err.generic')
    confirmingDelete.value = false
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <main class="screen">
    <AppBar :title="t('profile.title')" />

    <div v-if="!auth.isSignedIn" class="empty">
      <h3>{{ t('auth.title') }}</h3>
      <RouterLink to="/sign-in" class="btn btn--primary" style="margin-top:16px">
        {{ t('auth.verify') }}
      </RouterLink>
    </div>

    <template v-else>
      <section class="wrap profile__section">
        <p v-if="!auth.profileComplete" class="note note--warn" style="margin-bottom:16px">
          {{ t('profile.complete') }}
        </p>

        <label class="field">
          <span class="field__label">{{ t('profile.name') }}</span>
          <input v-model="name" class="field__input" type="text" autocomplete="name" enterkeyhint="done">
        </label>

        <label class="field">
          <span class="field__label">{{ t('profile.phone') }}</span>
          <input
            v-model="phone"
            class="field__input"
            type="tel"
            inputmode="tel"
            autocomplete="tel"
            placeholder="+994 50 000 00 00"
          >
        </label>

        <p v-if="error" class="field__error">{{ error }}</p>

        <button class="btn btn--primary btn--block" :disabled="saving" @click="save">
          <span v-if="saving" class="spinner" />
          {{ saved ? t('profile.saved') : t('profile.save') }}
        </button>
      </section>

      <section class="wrap profile__section">
        <h2 class="profile__heading">{{ t('profile.language') }}</h2>
        <div class="profile__langs">
          <button
            v-for="l in LANGS"
            :key="l"
            class="chip"
            :class="{ 'is-on': currentLang === l }"
            @click="changeLang(l)"
          >{{ l.toUpperCase() }}</button>
        </div>
      </section>

      <section class="wrap profile__section">
        <RouterLink to="/profile/addresses" class="link-row">
          <span>{{ t('profile.addresses') }}</span>
          <span aria-hidden="true">→</span>
        </RouterLink>
      </section>

      <section class="wrap profile__section">
        <button class="btn btn--ghost btn--block" @click="signOut">{{ t('profile.logout') }}</button>
      </section>

      <!-- Apple Guideline 5.1.1(v): deleting the account must be possible from
           inside the app. It destroys the personal data rather than hiding it. -->
      <section class="wrap profile__section profile__danger">
        <template v-if="!confirmingDelete">
          <button class="profile__deletelink" @click="confirmingDelete = true">
            {{ t('profile.deleteAccount') }}
          </button>
        </template>

        <div v-else class="stack">
          <p class="note note--warn">{{ t('profile.deleteWarn') }}</p>
          <button class="btn btn--danger btn--block" :disabled="deleting" @click="deleteAccount">
            <span v-if="deleting" class="spinner" /> {{ t('profile.deleteConfirm') }}
          </button>
          <button class="btn btn--ghost btn--block" @click="confirmingDelete = false">{{ t('cancel') }}</button>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.profile__section{ padding-top:22px; }
.profile__heading{ margin-bottom:11px; font-size:1.1rem; }
.profile__langs{ display:flex; gap:8px; }
.chip{
  padding:9px 17px;
  background:var(--paper-2); color:var(--ink-2);
  border-radius:999px; font-size:.85rem; font-weight:600;
}
.chip.is-on{ background:var(--forest); color:#fff; }

.link-row{
  display:flex; align-items:center; justify-content:space-between;
  padding:16px 15px;
  background:#fff; border:1px solid var(--line-soft); border-radius:var(--radius);
  color:inherit; text-decoration:none; font-weight:600;
}

.profile__danger{ padding-bottom:34px; }
.profile__deletelink{
  padding:10px 0;
  font-size:.9rem; color:var(--brick);
  text-decoration:underline; text-underline-offset:3px;
}
</style>
