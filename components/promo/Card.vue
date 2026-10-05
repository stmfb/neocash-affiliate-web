<script setup lang="ts">
import type { Promo } from '~/types/api'

/**
 * `_MiniPromoCard` (DESIGN_AUDIT.md §4.8): 150px gradient card with doodles,
 * the decorative "NeoCash Promo" badge, title, subtitle and logo disc.
 * `glow` adds the shimmer.
 */
const props = withDefaults(
  defineProps<{
    promo: Promo
    glow?: boolean
  }>(),
  { glow: false },
)

const theme = computed(() => campaignTheme(props.promo.id))
</script>

<template>
  <div class="relative h-promo w-full overflow-hidden rounded-28 shadow-promo" :class="theme.gradient">
    <PromoDoodles :theme="theme" />
    <div class="relative flex h-full items-center p-5">
      <div class="min-w-0 flex-1">
        <span class="inline-flex max-w-full items-center gap-1.5 rounded-pill border border-white/22 bg-white/18 px-2.5 py-[5px] text-white">
          <component :is="theme.primary" :size="13" class="shrink-0" aria-hidden="true" />
          <span class="truncate font-segoe text-micro">NeoCash Promo</span>
        </span>
        <h3 class="mt-2 truncate text-promo-title text-white">{{ promo.title }}</h3>
        <p class="mt-1 line-clamp-2 text-body leading-promo text-white/88">{{ promo.subtitle }}</p>
      </div>
      <span class="ml-3 flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-white/92 shadow-logo">
        <img src="/images/neocash-logo.png" alt="" width="34" height="24" class="h-6 w-[34px] object-contain" />
      </span>
    </div>
    <PromoShimmer v-if="glow" />
  </div>
</template>
