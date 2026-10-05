<script setup lang="ts">
import { Share2 } from 'lucide-vue-next'
import type { Promo } from '~/types/api'

/**
 * "Official promo" dialog (DESIGN_AUDIT.md §3 D1). Share Promo copies the
 * server's `share_text` exactly as sent (it already carries the affiliate's
 * link or code) and shows a toast. The dialog stays open, as on mobile.
 */
const open = defineModel<boolean>('open', { required: true })

defineProps<{ promo: Promo | null }>()

const { copy } = useCopy()
const titleId = useId()
</script>

<template>
  <BaseDialog v-model:open="open" radius="28" :labelledby="titleId">
    <div v-if="promo" class="p-5">
      <div class="flex items-center">
        <img src="/images/neocash-logo.png" alt="NeoCash" width="84" height="28" class="h-7 w-[84px] object-contain" />
        <span class="ml-auto font-segoe text-label font-semibold text-primary">Official promo</span>
      </div>
      <PromoCard class="mt-4" :promo="promo" />
      <h2 :id="titleId" class="mt-5 text-section text-ink">{{ promo.title }}</h2>
      <p class="mt-2 text-body text-ink-muted">
        Share this promo with your network. Customers who sign up with your referral code can be tracked from your dashboard.
      </p>
      <div class="mt-5 flex justify-end">
        <BaseButton size="sm" @click="copy(promo.share_text)">
          Share Promo
          <template #icon><Share2 :size="18" aria-hidden="true" /></template>
        </BaseButton>
      </div>
    </div>
  </BaseDialog>
</template>
