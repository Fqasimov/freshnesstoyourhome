<script setup>
import { ref, onMounted, computed } from 'vue'
import { token, me, loadMe, signOut, DEMO } from './api'
import { toast } from './toast'
import SignIn from './views/SignIn.vue'
import Dashboard from './views/Dashboard.vue'
import Orders from './views/Orders.vue'
import Products from './views/Products.vue'
import Bundles from './views/Bundles.vue'
import Zones from './views/Zones.vue'
import Customers from './views/Customers.vue'
import Audits from './views/Audits.vue'
import { api } from './api'

const TABS = [
  { id: 'dashboard', label: 'Bu gün', is: Dashboard },
  { id: 'orders', label: 'Sifarişlər', is: Orders },
  { id: 'products', label: 'Məhsullar', is: Products },
  { id: 'bundles', label: 'Aksiyalar', is: Bundles },
  { id: 'zones', label: 'Zonalar', is: Zones },
  { id: 'customers', label: 'Müştərilər', is: Customers },
  { id: 'audits', label: 'Jurnal', is: Audits },
]

const tab = ref('dashboard')
const ready = ref(false)
const current = computed(() => TABS.find(t => t.id === tab.value))

/* Two badges on the tabs, because these are the two things that go wrong
   quietly: an order nobody has looked at, and goods delivered without the
   scales being recorded. */
const openOrders = ref(0)
const awaitingWeights = ref(0)

async function refreshBadges () {
  try {
    const d = await api('/admin/dashboard')
    openOrders.value = d.orders.open
    awaitingWeights.value = d.orders.awaiting_weights
  } catch {
    // A badge is not worth an error message.
  }
}

/**
 * A token in storage is not a session.
 *
 * The panel asks the server who this is and whether it is an admin before it
 * renders anything; a tampered-with sessionStorage value gets the sign-in
 * screen, and every request after that is checked again server-side anyway.
 */
async function boot () {
  if (token.value) {
    try {
      await loadMe()
      await refreshBadges()
    } catch {
      // Expired, revoked, blocked, or never an admin.
    }
  }
  ready.value = true
}

function onSignedIn () {
  tab.value = 'dashboard'
  refreshBadges()
}

onMounted(boot)
</script>

<template>
  <div v-if="!ready" class="a-empty" style="min-height:100dvh; display:grid; place-items:center">…</div>

  <SignIn v-else-if="!me" @in="onSignedIn" />

  <template v-else>
    <!-- Loud on purpose. Somebody looking at a dashboard full of numbers
         should never have to wonder whether they are the shop's numbers. -->
    <div v-if="DEMO" class="a-demo">
      Nümunə rejimi — bu rəqəmlər uydurmadır və heç nə saxlanmır ·
      Preview mode — sample data, nothing is saved
    </div>

    <header class="a-top">
      <div class="a-wrap a-top__in">
        <span class="a-brand"><i></i> Freshness</span>
        <span class="a-top__spacer"></span>
        <span class="a-who">{{ me.email }}</span>
        <button class="a-btn a-btn--sm a-btn--ghost" @click="signOut()">Çıxış</button>
      </div>
    </header>

    <nav class="a-wrap">
      <div class="a-tabs">
        <button v-for="t in TABS" :key="t.id" :class="{ on: tab === t.id }" @click="tab = t.id">
          {{ t.label }}
          <span v-if="t.id === 'orders' && openOrders" class="a-pip"
                :class="{ 'a-pip--warn': awaitingWeights > 0 }">{{ openOrders }}</span>
        </button>
      </div>
    </nav>

    <main class="a-wrap a-main">
      <!-- Keyed, so switching tabs reloads rather than showing numbers from
           five minutes ago: a shop screen that lies quietly is worse than one
           that takes half a second. -->
      <component :is="current.is" :key="tab" @changed="refreshBadges" />
    </main>

    <div v-if="toast" class="a-toast" :class="{ 'a-toast--err': toast.kind === 'err' }">
      {{ toast.message }}
    </div>
  </template>
</template>
