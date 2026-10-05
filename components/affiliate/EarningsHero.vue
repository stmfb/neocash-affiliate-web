<script setup lang="ts">
/**
 * `_EarningsHero` (DESIGN_AUDIT.md §4.12): the blue total-earnings card with
 * Paid / Pending mini metrics and the commission-rate footnote. The rate comes
 * from the session, not the earnings endpoint. A `null` amount (not loaded, or
 * failed) shows "—" like the Home tiles, where mobile shows ₦0.00.
 */
const props = defineProps<{
  totalKobo: number | null
  paidKobo: number | null
  pendingKobo: number | null
  ratePercent: number | null
}>()

const minis = computed(() => [
  { label: 'Paid', kobo: props.paidKobo },
  { label: 'Pending', kobo: props.pendingKobo },
])

const footnote = computed(() =>
  props.ratePercent === null
    ? 'You earn commission whenever an eligible referred loan is disbursed.'
    : `You earn ${formatPercent(props.ratePercent)}% whenever an eligible referred loan is disbursed.`,
)
</script>

<template>
  <section class="relative overflow-hidden rounded-28 bg-data-royal p-5 shadow-hero">
    <!-- Decorative circles, offsets matching mobile's (measured from the padded content). -->
    <span aria-hidden="true" class="absolute -right-10 -top-[50px] h-[100px] w-[100px] rounded-full bg-white/7" />
    <span aria-hidden="true" class="absolute -bottom-[70px] -left-[50px] h-[110px] w-[110px] rounded-full bg-white/7" />

    <div class="relative">
      <p class="text-body text-white">Total Earnings</p>
      <AffiliateFitOrCompactAmount v-if="totalKobo !== null" class="mt-2 text-hero text-white" :kobo="totalKobo" />
      <p v-else class="mt-2 text-hero text-white">—</p>
      <div class="mt-4 flex gap-3">
        <div v-for="mini in minis" :key="mini.label" class="min-w-0 flex-1 rounded-20 bg-white/12 p-3">
          <AffiliateFitOrCompactAmount v-if="mini.kobo !== null" class="text-body font-semibold text-white" :kobo="mini.kobo" />
          <p v-else class="text-body font-semibold text-white">—</p>
          <p class="mt-1 font-segoe text-label text-white">{{ mini.label }}</p>
        </div>
      </div>
      <p class="mt-4 font-segoe text-label text-white/84">{{ footnote }}</p>
    </div>
  </section>
</template>
