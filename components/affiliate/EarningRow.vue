<script setup lang="ts">
import type { EarningRecord } from '~/types/api'

/** `_EarningRow` (DESIGN_AUDIT.md §4.12b): one commission record. */
const props = defineProps<{ record: EarningRecord }>()

const meta = computed(() => `${formatKobo(props.record.principal_kobo)} disbursed • ${formatIsoShortDate(props.record.earned_at)}`)
const amount = computed(() => formatKobo(props.record.amount_kobo))
const status = computed(() => capitalize(props.record.status))
const paid = computed(() => props.record.status.toLowerCase() === 'paid')
</script>

<template>
  <article class="flex items-center gap-3 rounded-22 bg-white p-4">
    <div class="min-w-0 flex-1">
      <h3 class="text-body font-semibold text-ink">{{ record.customer_name }}</h3>
      <p class="mt-1 font-segoe text-label text-ink-muted">{{ meta }}</p>
    </div>
    <div class="flex shrink-0 flex-col items-end">
      <p class="text-body font-bold text-ink">{{ amount }}</p>
      <p class="mt-1 font-segoe text-label font-semibold" :class="paid ? 'text-data-green' : 'text-primary'">{{ status }}</p>
    </div>
  </article>
</template>
