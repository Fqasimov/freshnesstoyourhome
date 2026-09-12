<script setup>
import { ref, onMounted } from 'vue'
import { api, money } from '../api'
import { complain } from '../toast'

const data = ref(null)
const busy = ref(true)

const STATUS_AZ = {
  placed: 'Yeni', confirmed: 'Təsdiqlənib', preparing: 'Hazırlanır',
  out_for_delivery: 'Yoldadır', delivered: 'Çatdırılıb', cancelled: 'Ləğv edilib',
}

async function load () {
  busy.value = true
  try {
    data.value = await api('/admin/dashboard')
  } catch (e) {
    complain(e)
  } finally {
    busy.value = false
  }
}

onMounted(load)
defineExpose({ load })
</script>

<template>
  <div v-if="busy && !data" class="a-empty">Yüklənir…</div>

  <div v-else-if="data">
    <h2 class="a-h">Bu gün</h2>
    <p class="a-sub">Səhər açılanda baxılacaq rəqəmlər.</p>

    <div class="a-grid">
      <div class="a-card a-stat">
        <b>{{ data.orders.today }}</b>
        <span>Bugünkü çatdırılma</span>
      </div>
      <div class="a-card a-stat">
        <b>{{ data.orders.tomorrow }}</b>
        <span>Sabah</span>
      </div>
      <div class="a-card a-stat">
        <b>{{ data.orders.open }}</b>
        <span>Açıq sifariş</span>
      </div>
      <!-- The one number that costs money when it is ignored: goods delivered
           without the scales being recorded cannot be invoiced correctly. -->
      <div class="a-card a-stat" :class="{ 'a-stat--warn': data.orders.awaiting_weights > 0 }">
        <b>{{ data.orders.awaiting_weights }}</b>
        <span>Çəki gözləyir</span>
      </div>
    </div>

    <h2 class="a-h" style="margin-top:26px">Dövriyyə</h2>
    <p class="a-sub">Yalnız çatdırılmış sifarişlər sayılır.</p>
    <div class="a-grid">
      <div class="a-card a-stat"><b>{{ money(data.revenue.today_minor) }}</b><span>Bu gün</span></div>
      <div class="a-card a-stat"><b>{{ money(data.revenue.week_minor) }}</b><span>7 gün</span></div>
      <div class="a-card a-stat"><b>{{ money(data.revenue.month_minor) }}</b><span>Bu ay</span></div>
    </div>

    <h2 class="a-h" style="margin-top:26px">Statuslar</h2>
    <p class="a-sub">Bütün vaxtlar üzrə.</p>
    <div class="a-grid">
      <div v-for="(n, status) in data.orders.by_status" :key="status" class="a-card a-stat">
        <b>{{ n }}</b>
        <span>{{ STATUS_AZ[status] ?? status }}</span>
      </div>
    </div>

    <h2 class="a-h" style="margin-top:26px">Kataloq</h2>
    <p class="a-sub">Vitrində nə var, nə yoxdur.</p>
    <div class="a-grid">
      <div class="a-card a-stat"><b>{{ data.catalogue.products }}</b><span>Məhsul</span></div>
      <div class="a-card a-stat" :class="{ 'a-stat--warn': data.catalogue.out_of_stock > 0 }">
        <b>{{ data.catalogue.out_of_stock }}</b><span>Stokda yoxdur</span>
      </div>
      <div class="a-card a-stat"><b>{{ data.catalogue.inactive }}</b><span>Deaktiv</span></div>
      <div class="a-card a-stat">
        <b>{{ data.catalogue.bundles_active }}/{{ data.catalogue.bundles_total }}</b>
        <span>Aktiv set</span>
      </div>
      <div class="a-card a-stat"><b>{{ data.customers.total }}</b><span>Müştəri</span></div>
    </div>

    <h2 class="a-h" style="margin-top:26px">Son dəyişikliklər</h2>
    <p class="a-sub">Kim nəyi dəyişdi — silinmir.</p>
    <div v-if="!data.recent_changes.length" class="a-empty">Hələ heç bir dəyişiklik yoxdur.</div>
    <div v-else class="a-scroll">
      <table class="a-t">
        <thead>
          <tr><th>Vaxt</th><th>Əməliyyat</th><th>Obyekt</th><th>Dəyişiklik</th></tr>
        </thead>
        <tbody>
          <tr v-for="a in data.recent_changes" :key="a.id">
            <td class="a-muted a-mono">{{ new Date(a.created_at).toLocaleString('az-AZ') }}</td>
            <td>{{ a.action }}</td>
            <td class="a-mono">{{ a.subject_id ?? a.subject_type }}</td>
            <td class="a-mono a-muted">
              <span v-for="(v, k) in (a.changes ?? {})" :key="k" style="margin-right:10px">
                {{ k }}: {{ v.from }} → {{ v.to }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
