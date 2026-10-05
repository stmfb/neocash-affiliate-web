<script setup lang="ts">
/**
 * Placeholder cards shown while a list loads for the first time. Mobile shows
 * the empty state instead ("No Referrals Yet" while referrals are still
 * loading, DESIGN_AUDIT.md §7 #1). These keep "loading" and "nothing there"
 * apart. Shapes follow the referral card (§4.11) and the earning row (§4.12b).
 */
withDefaults(
  defineProps<{
    kind: 'referral' | 'earning'
    label: string
    count?: number
  }>(),
  { count: 3 },
)
</script>

<template>
  <div role="status" :aria-label="label" class="space-y-3">
    <div
      v-for="n in count"
      :key="n"
      aria-hidden="true"
      class="flex items-center bg-white p-4 motion-safe:animate-pulse"
      :class="kind === 'referral' ? 'rounded-24 border border-line-lilac' : 'rounded-22'"
    >
      <span v-if="kind === 'referral'" class="mr-3 h-10 w-10 shrink-0 rounded-full bg-surface-sheet" />
      <div class="min-w-0 flex-1">
        <span class="block h-3.5 w-2/5 rounded-pill bg-surface-sheet" />
        <span class="mt-2 block h-3 w-3/5 rounded-pill bg-surface-sheet" />
      </div>
      <span v-if="kind === 'referral'" class="ml-2 h-6 w-16 shrink-0 rounded-18 bg-surface-sheet" />
      <div v-else class="ml-3 flex shrink-0 flex-col items-end">
        <span class="block h-3.5 w-20 rounded-pill bg-surface-sheet" />
        <span class="mt-2 block h-3 w-12 rounded-pill bg-surface-sheet" />
      </div>
    </div>
  </div>
</template>
