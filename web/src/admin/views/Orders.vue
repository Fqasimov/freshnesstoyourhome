<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { api, money, toAzn } from '../api'
import { say, complain } from '../toast'

const STATUS = {
  placed: 'Yeni', confirmed: 'Təsdiqlənib', preparing: 'Hazırlanır',
  out_for_delivery: 'Yoldadır', delivered: 'Çatdırılıb', cancelled: 'Ləğv edilib',
}

const rows = ref([])
const busy = ref(true)
const status = ref('')
const date = ref('')

const open = ref(null)       // the order in the drawer
const events = ref([])
const nextSteps = ref([])
const weights = ref({})      // item id → kg typed by the courier
const working = ref(false)

async function load () {
  busy.value = true
  try {
    const query = new URLSearchParams()
    if (status.value) query.set('status', status.value)
    if (date.value) query.set('date', date.value)
    rows.value = (await api(`/staff/orders?${query}`)).data
  } catch (e) {
    complain(e)
  } finally {
    busy.value = false
  }
}

async function show (id) {
  working.value = true
  try {
    const body = await api(`/staff/orders/${id}`)
    open.value = body.order
    events.value = body.events
    // The buttons come from the server's transition table, so a status this
    // order cannot legally reach is not offered in the first place.
    nextSteps.value = body.can_transition_to
    weights.value = Object.fromEntries(
      open.value.items.filter(i => i.is_weight_based)
        .map(i => [i.id, i.confirmed_qty ?? i.qty]))
  } catch (e) {
    complain(e)
  } finally {
    working.value = false
  }
}

async function move (to) {
  working.value = true
  try {
    const updated = await api(`/staff/orders/${open.value.id}/transition`, {
      method: 'POST',
      body: { status: to },
    })
    say(`${open.value.code} → ${STATUS[to] ?? to}`)
    await show(updated.id)
    await load()
  } catch (e) {
    complain(e)
  } finally {
    working.value = false
  }
}

/**
 * The courier sends kilograms. Never money.
 *
 * The server re-prices each line from the unit price already stored on the
 * order, so nothing typed on this screen can change what a kilo costs.
 */
async function saveWeights () {
  working.value = true
  try {
    const updated = await api(`/staff/orders/${open.value.id}/weights`, {
      method: 'POST',
      body: { weights: weights.value },
    })
    open.value = updated
    say(`Çəki yazıldı — yekun ${money(updated.final_total_minor ?? updated.total_minor)}`)
    await load()
  } catch (e) {
    complain(e)
  } finally {
    working.value = false
  }
}

const needsWeighing = computed(() =>
  open.value?.requires_weighing && !open.value?.weighed_at)

watch([status, date], load)
onMounted(load)
defineExpose({ load })
</script>

<template>
  <h2 class="a-h">Sifarişlər</h2>
  <p class="a-sub">Sətrə toxunun — statusu dəyişin, çəkini yazın.</p>

  <div class="a-row" style="margin-bottom:12px">
    <select v-model="status" class="a-in" style="max-width:190px">
      <option value="">Bütün statuslar</option>
      <option v-for="(label, key) in STATUS" :key="key" :value="key">{{ label }}</option>
    </select>
    <input v-model="date" type="date" class="a-in" style="max-width:170px">
    <button v-if="status || date" class="a-btn a-btn--sm a-btn--ghost"
            @click="status = ''; date = ''">Sıfırla</button>
    <span class="a-muted" style="font-size:.8rem">{{ rows.length }} sifariş</span>
  </div>

  <div v-if="busy" class="a-empty">Yüklənir…</div>
  <div v-else-if="!rows.length" class="a-empty">Bu filtrlərə uyğun sifariş yoxdur.</div>

  <div v-else class="a-scroll">
    <table class="a-t">
      <thead>
        <tr>
          <th>Kod</th><th>Status</th><th>Çatdırılma</th><th>Müştəri</th>
          <th class="num">Məbləğ</th><th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="o in rows" :key="o.id">
          <td class="a-mono">{{ o.code }}</td>
          <td><span class="a-pill" :class="`a-pill--${o.status}`">{{ STATUS[o.status] ?? o.status }}</span></td>
          <td>
            {{ o.delivery_date }}
            <span class="a-muted">{{ o.delivery_slot }}</span>
          </td>
          <td>
            {{ o.contact_name }}
            <div class="a-mono a-muted">{{ o.contact_phone }}</div>
          </td>
          <td class="num">
            {{ money(o.payable_minor) }}
            <div v-if="o.requires_weighing && !o.weighed_at" class="a-muted" style="font-size:.72rem">təxmini</div>
          </td>
          <td><button class="a-btn a-btn--sm a-btn--ghost" @click="show(o.id)">Aç</button></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ---------- detail drawer ------------------------------------------ -->
  <template v-if="open">
    <div class="a-scrim" @click="open = null"></div>
    <aside class="a-drawer">
      <div class="a-drawer__head">
        <div>
          <h2>{{ open.code }}</h2>
          <span class="a-pill" :class="`a-pill--${open.status}`">{{ STATUS[open.status] ?? open.status }}</span>
        </div>
        <button class="a-x" aria-label="Bağla" @click="open = null">×</button>
      </div>

      <dl class="a-dl">
        <dt>Müştəri</dt><dd>{{ open.contact_name }}</dd>
        <dt>Telefon</dt><dd><a :href="`tel:${open.contact_phone}`">{{ open.contact_phone }}</a></dd>
        <dt>Ünvan</dt><dd>{{ open.address_line }}</dd>
        <dt v-if="open.address_notes">Qeyd</dt><dd v-if="open.address_notes">{{ open.address_notes }}</dd>
        <!-- The customer's own pin. Only Google's map hosts are accepted when
             it is saved, so this is safe to make clickable; rel="noopener
             noreferrer" keeps the panel out of the opened tab regardless. -->
        <dt v-if="open.address_map_link">Xəritə</dt>
        <dd v-if="open.address_map_link">
          <a :href="open.address_map_link" target="_blank" rel="noopener noreferrer">Xəritədə aç</a>
        </dd>
        <dt>Çatdırılma</dt><dd>{{ open.delivery_date }} · {{ open.delivery_slot }}</dd>
        <dt>Ödəniş</dt><dd>{{ open.payment_method }}</dd>
        <dt v-if="open.note">Müştəri qeydi</dt><dd v-if="open.note">{{ open.note }}</dd>
      </dl>

      <div class="a-sec">
        <h3>Məhsullar</h3>
        <div class="a-scroll">
          <table class="a-t" style="min-width:0">
            <tbody>
              <tr v-for="i in open.items" :key="i.id">
                <td>
                  {{ i.name }}
                  <div class="a-muted" style="font-size:.75rem">
                    {{ i.qty }} × {{ toAzn(i.unit_price_minor) }} AZN
                    <span v-if="i.is_weight_based">· çəkiyə görə</span>
                  </div>
                </td>
                <td class="num">{{ money(i.final_line_total_minor ?? i.line_total_minor) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="a-sec">
        <h3>Məbləğ</h3>
        <dl class="a-dl">
          <dt>Məhsullar</dt><dd>{{ money(open.subtotal_minor) }}</dd>
          <dt>Çatdırılma</dt><dd>{{ money(open.delivery_fee_minor) }}</dd>
          <dt v-if="open.discount_minor">Endirim</dt>
          <dd v-if="open.discount_minor">−{{ money(open.discount_minor) }}</dd>
          <dt><b>Yekun</b></dt>
          <dd>
            <b>{{ money(open.payable_minor) }}</b>
            <span v-if="needsWeighing" class="a-muted"> (təxmini)</span>
          </dd>
        </dl>
      </div>

      <!-- Weighing comes before the status buttons on purpose: an order that
           goes out without its weights recorded is invoiced on an estimate. -->
      <div v-if="needsWeighing" class="a-sec">
        <h3>Çəkini yaz</h3>
        <div v-for="i in open.items.filter(x => x.is_weight_based)" :key="i.id"
             class="a-row" style="margin-bottom:8px">
          <span style="flex:1">{{ i.name }}</span>
          <input v-model.number="weights[i.id]" class="a-in a-in--num" inputmode="decimal" step="0.001">
          <span class="a-muted">kq</span>
        </div>
        <button class="a-btn" :disabled="working" @click="saveWeights">Çəkini təsdiqlə</button>
      </div>

      <div v-if="nextSteps.length" class="a-sec">
        <h3>Növbəti addım</h3>
        <div class="a-row">
          <button v-for="s in nextSteps" :key="s" class="a-btn"
                  :class="{ 'a-btn--danger': s === 'cancelled' }"
                  :disabled="working" @click="move(s)">
            {{ STATUS[s] ?? s }}
          </button>
        </div>
      </div>

      <div class="a-sec">
        <h3>Tarixçə</h3>
        <table class="a-t" style="min-width:0">
          <tbody>
            <tr v-for="e in events" :key="e.id">
              <td class="a-mono a-muted">{{ new Date(e.created_at).toLocaleString('az-AZ') }}</td>
              <td>
                {{ STATUS[e.to_status] ?? e.to_status }}
                <span class="a-muted">· {{ e.actor_role ?? 'sistem' }}</span>
                <div v-if="e.note" class="a-muted" style="font-size:.75rem">{{ e.note }}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </aside>
  </template>
</template>
