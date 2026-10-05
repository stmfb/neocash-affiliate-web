<script setup lang="ts">
import type { Promo } from '~/types/api'

/**
 * `_TappablePromoCard`: a promo card that opens the promo dialog. A focusable
 * `role="button"` wrapper, because a real `<button>` can't hold the card's
 * block content.
 */
defineProps<{
  promo: Promo
  glow?: boolean
}>()

const emit = defineEmits<{ open: [] }>()
</script>

<template>
  <div
    role="button"
    tabindex="0"
    :aria-label="`${promo.title}. Open promo`"
    class="cursor-pointer rounded-28 transition-[filter] active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    @click="emit('open')"
    @keydown.enter.prevent="emit('open')"
    @keydown.space.prevent="emit('open')"
  >
    <PromoCard :promo="promo" :glow="glow" />
  </div>
</template>
