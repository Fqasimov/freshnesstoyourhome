<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api'
import { complain } from '../toast'

const rows = ref([])
const busy = ref(true)
const total = ref(0)

async function load () {
  busy.value = true
  try {
    const body = await api('/admin/audits')
    rows.value = body.data
    total.value = body.total
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
