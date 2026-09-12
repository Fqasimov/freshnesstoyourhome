<script setup>
import { ref, onMounted } from 'vue'
import { api, money } from '../api'
import { say, complain } from '../toast'

/**
 * Aksiyalar.
 *
 * Every set ships switched off, because its contents and its discount were
 * invented while the site was being designed. Switching one on here is the
 * moment an invented promotion becomes a real one, so the screen says plainly
 * what the customer will see and what it will cost the shop.
 */
const rows = ref([])
const busy = ref(true)
const draft = ref({})

async function load () {
  busy.value = true
  try {
    rows.value = (await api('/admin/bundles')).data
    draft.value = Object.fromEntries(rows.value.map(b => [b.id, b.discount_percent]))
  } catch (e) {
    complain(e)
  } finally {
    busy.value = false
  }
}

async function patch (bundle, body, note) {
  try {
    const updated = await api(`/admin/bundles/${bundle.id}`, { method: 'PATCH', body })
    Object.assign(bundle, updated)
    draft.value[bundle.id] = bundle.discount_percent
    say(note)
  } catch (e) {
    complain(e)
    draft.value[bundle.id] = bundle.discount_percent
  }
}

const toggle = b =>
  patch(b, { is_active: !b.is_active },
    `${b.name?.az ?? b.id} ${b.is_active ? 'söndürüldü' : 'yandırıldı'}`)

function saveDiscount (b) {
  const value = Number(draft.value[b.id])
  if (!Number.isFinite(value) || value === b.discount_percent) return
  patch(b, { discount_percent: Math.round(value) }, `Endirim ${Math.round(value)}%`)
}

onMounted(load)
</script>

<template>
  <h2 class="a-h">Aksiyalar və setlər</h2>
  <p class="a-sub">
    Setlər söndürülmüş vəziyyətdə gəlir. Yandırılan set yalnız tərkibindəki
    bütün məhsullar stokda olduqda saytda görünür.
  </p>

  <div v-if="busy" class="a-empty">Yüklənir…</div>
  <div v-else-if="!rows.length" class="a-empty">Set yoxdur.</div>

  <div v-else class="a-grid" style="grid-template-columns:repeat(auto-fill,minmax(310px,1fr))">
    <div v-for="b in rows" :key="b.id" class="a-card">
      <div class="a-row" style="margin-bottom:8px">
        <b style="flex:1">{{ b.name?.az ?? b.id }}</b>
        <label class="a-sw">
          <input type="checkbox" :checked="b.is_active" @change="toggle(b)">
          <span>{{ b.is_active ? 'Aktiv' : 'Söndürülüb' }}</span>
        </label>
      </div>

      <p class="a-muted" style="font-size:.82rem; margin:0 0 12px">{{ b.description?.az }}</p>

      <table class="a-t" style="min-width:0; margin-bottom:12px">
        <tbody>
          <tr v-for="i in b.items" :key="i.product_id">
            <td>
              {{ i.name?.az ?? i.product_id }}
              <span v-if="i.qty !== 1" class="a-muted">× {{ i.qty }}</span>
            </td>
            <td class="num">
              <span v-if="!i.orderable" class="a-pill a-pill--cancelled">stokda yox</span>
              <span v-else>{{ money(i.price_minor) }}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="a-row" style="margin-bottom:10px">
        <span class="a-muted" style="flex:1">Endirim</span>
        <input v-model="draft[b.id]" class="a-in a-in--num" style="width:78px" inputmode="numeric"
               @keyup.enter="saveDiscount(b)" @blur="saveDiscount(b)">
        <span class="a-muted">%</span>
      </div>

      <dl class="a-dl" style="margin-bottom:10px">
        <dt>Tam qiymət</dt><dd>{{ money(b.full_minor) }}</dd>
        <dt>Set qiyməti</dt><dd><b>{{ money(b.price_minor) }}</b></dd>
        <dt>Qənaət</dt><dd>{{ money(b.saving_minor) }}</dd>
      </dl>

      <!-- Active is not the same as visible, and a shopkeeper who has just
           switched a set on deserves to be told which one they are looking at. -->
      <p v-if="b.is_active && !b.shown_on_site" class="a-note a-note--err" style="margin:0">
        Aktivdir, amma saytda görünmür — tərkibində stokda olmayan məhsul var.
      </p>
      <p v-else-if="b.shown_on_site" class="a-note a-note--ok" style="margin:0">
        Saytda görünür.
      </p>
    </div>
  </div>
</template>
