<script setup>
import { ref, onMounted } from 'vue'
import { api, money } from '../api'
import { say, complain } from '../toast'

/**
 * Customers, as little of them as the job needs.
 *
 * The list shows masked contact details. Opening one shows them in full and
 * writes a line to the audit trail — which is the point: phoning a customer
 * about a late order is normal, reading four hundred numbers in an afternoon
 * is not, and only a record of the looking tells them apart.
 */
const rows = ref([])
const busy = ref(true)
const email = ref('')
const open = ref(null)

async function load () {
  busy.value = true
  try {
    const query = email.value.trim() ? `?email=${encodeURIComponent(email.value.trim())}` : ''
    rows.value = (await api(`/admin/customers${query}`)).data
  } catch (e) {
    complain(e)
  } finally {
    busy.value = false
  }
}

async function show (id) {
  try {
    open.value = await api(`/admin/customers/${id}`)
  } catch (e) {
    complain(e)
  }
}

async function block (blocked) {
  try {
    const body = await api(`/admin/customers/${open.value.id}/block`, {
      method: 'POST',
      body: { blocked },
    })
    open.value.blocked_at = body.blocked_at
    say(blocked ? 'Hesab bloklandı' : 'Blok götürüldü')
    await load()
  } catch (e) {
    complain(e)
  }
}

onMounted(load)
</script>

<template>
  <h2 class="a-h">Müştərilər</h2>
  <p class="a-sub">
    Siyahıda əlaqə məlumatları gizlidir. Tam məlumat açıldıqda jurnala yazılır.
  </p>

  <form class="a-row" style="margin-bottom:12px" @submit.prevent="load">
    <input v-model="email" class="a-in" style="max-width:280px" placeholder="E-poçt ilə tap…">
    <button class="a-btn a-btn--sm">Axtar</button>
    <button v-if="email" type="button" class="a-btn a-btn--sm a-btn--ghost"
            @click="email = ''; load()">Sıfırla</button>
  </form>

  <div v-if="busy" class="a-empty">Yüklənir…</div>
  <div v-else-if="!rows.length" class="a-empty">Müştəri tapılmadı.</div>

  <div v-else class="a-scroll">
    <table class="a-t">
      <thead>
        <tr><th>Ad</th><th>E-poçt</th><th>Telefon</th><th class="num">Sifariş</th><th>Status</th><th></th></tr>
      </thead>
      <tbody>
        <tr v-for="u in rows" :key="u.id">
          <td>{{ u.name || '—' }}</td>
          <td class="a-mono a-muted">{{ u.email_masked ?? '—' }}</td>
          <td class="a-mono a-muted">{{ u.phone_masked ?? '—' }}</td>
          <td class="num">{{ u.orders_count }}</td>
          <td>
            <span v-if="u.anonymised_at" class="a-pill">silinib</span>
            <span v-else-if="u.blocked_at" class="a-pill a-pill--cancelled">bloklanıb</span>
            <span v-else-if="u.role !== 'customer'" class="a-pill a-pill--delivered">{{ u.role }}</span>
            <span v-else class="a-pill a-pill--off">müştəri</span>
          </td>
          <td><button class="a-btn a-btn--sm a-btn--ghost" @click="show(u.id)">Aç</button></td>
        </tr>
      </tbody>
    </table>
  </div>

  <template v-if="open">
    <div class="a-scrim" @click="open = null"></div>
    <aside class="a-drawer">
      <div class="a-drawer__head">
        <h2>{{ open.name || 'Adsız müştəri' }}</h2>
        <button class="a-x" aria-label="Bağla" @click="open = null">×</button>
      </div>

      <dl class="a-dl">
        <dt>E-poçt</dt><dd class="a-mono">{{ open.email ?? '—' }}</dd>
        <dt>Telefon</dt><dd class="a-mono">{{ open.phone ?? '—' }}</dd>
        <dt>Rol</dt><dd>{{ open.role }}</dd>
        <dt>Sifariş</dt><dd>{{ open.orders_count }}</dd>
        <dt>Xərclədiyi</dt><dd>{{ money(open.spent_minor) }}</dd>
        <dt>Qeydiyyat</dt><dd>{{ new Date(open.created_at).toLocaleDateString('az-AZ') }}</dd>
        <dt v-if="open.blocked_at">Bloklanıb</dt>
        <dd v-if="open.blocked_at">{{ new Date(open.blocked_at).toLocaleString('az-AZ') }}</dd>
      </dl>

      <div class="a-sec">
        <h3>Son sifarişlər</h3>
        <div v-if="!open.orders.length" class="a-muted">Hələ sifariş yoxdur.</div>
        <table v-else class="a-t" style="min-width:0">
          <tbody>
            <tr v-for="o in open.orders" :key="o.id">
              <td class="a-mono">{{ o.delivery_date }}</td>
              <td><span class="a-pill" :class="`a-pill--${o.status}`">{{ o.status }}</span></td>
              <td class="num">{{ money(o.total_minor) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="open.role === 'customer'" class="a-sec">
        <h3>Hesab</h3>
        <button v-if="!open.blocked_at" class="a-btn a-btn--danger" @click="block(true)">
          Hesabı blokla
        </button>
        <button v-else class="a-btn a-btn--ghost" @click="block(false)">Bloku götür</button>
        <p class="a-muted" style="font-size:.78rem; margin:8px 0 0">
          Bloklama dərhal işə düşür — açıq tətbiqdəki token da ləğv olunur.
        </p>
      </div>
      <p v-else class="a-muted" style="font-size:.78rem">
        Heyət hesabları serverdəki konsol əmri ilə idarə olunur.
      </p>
    </aside>
  </template>
</template>
