<script setup lang="ts">
import { Copy } from 'lucide-vue-next'

/** `_ReferralCodeCard` (DESIGN_AUDIT.md §4.4). Copy puts the code on the clipboard and shows a toast. */
defineProps<{ code: string }>()

const { copy } = useCopy()
</script>

<template>
  <section class="rounded-28 border border-line-lilac bg-white p-5">
    <p class="font-segoe text-label text-ink-muted">Your Referral Code</p>
    <div class="mt-2 flex items-center">
      <p class="min-w-0 flex-1 break-words text-code text-ink">{{ code }}</p>
      <AffiliateRoundActionButton :icon="Copy" label="Copy referral code" @click="copy(code)" />
    </div>
  </section>
</template>
