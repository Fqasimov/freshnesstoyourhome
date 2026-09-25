<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api'
import { complain } from '../toast'

const rows = ref([])
const busy = ref(true)
const total = ref(0)
const chain = ref(null)

async function load () {
  busy.value = true
  try {
    const [body, check] = await Promise.all([api('/admin/audits'), api('/admin/audits/verify')])
    rows.value = body.data
    total.value = body.total
    chain.value = check
  } catch (e) {
    complain(e)
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<template>
  <h2 class="a-h">Jurnal</h2>
  <p class="a-sub">
    Kim nəyi dəyişdi. Bu qeydlər nə redaktə olunur, nə də silinir — dəyişiklik
    tarixçəsinin dəyəri məhz bundadır.
  </p>

  <!-- The count is part of the check: the chain shows an edited or removed
       line, but not lines cut off the end — a total that goes down does. -->
  <div v-if="chain" class="a-note" :class="chain.intact ? 'a-note--ok' : 'a-note--err'" data-chain>
    <template v-if="chain.intact">
      Jurnal toxunulmazdır · {{ chain.total }} qeyd yoxlanıldı.
      <small>Journal intact — {{ chain.total }} entries checked.</small>
    </template>
    <template v-else>
      <b>Diqqət: jurnal dəyişdirilib</b> (qeyd #{{ chain.broken_at }}).
      <small>Warning: the journal was altered at entry #{{ chain.broken_at }}. Tell whoever manages the server.</small>
    </template>
  </div>

  <div v-if="busy" class="a-empty">Yüklənir…</div>
  <div v-else-if="!rows.length" class="a-empty">Hələ qeyd yoxdur.</div>

  <div v-else class="a-scroll">
    <table class="a-t">
      <thead>
        <tr><th>Vaxt</th><th>Əməliyyat</th><th>Obyekt</th><th>Dəyişiklik</th><th>Rol</th><th>IP</th></tr>
      </thead>
      <tbody>
        <tr v-for="a in rows" :key="a.id">
          <td class="a-mono a-muted">{{ new Date(a.created_at).toLocaleString('az-AZ') }}</td>
          <td>{{ a.action }}</td>
          <td class="a-mono">{{ a.subject_id ?? a.subject_type }}</td>
          <td class="a-mono a-muted">
            <div v-for="(v, k) in (a.changes ?? {})" :key="k">
              {{ k }}: {{ Array.isArray(v.from) ? v.from.join(', ') : v.from }}
              → {{ Array.isArray(v.to) ? v.to.join(', ') : v.to }}
            </div>
            <span v-if="!a.changes">—</span>
          </td>
          <td class="a-muted">{{ a.actor_role ?? '—' }}</td>
          <td class="a-mono a-muted">{{ a.ip ?? '—' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
