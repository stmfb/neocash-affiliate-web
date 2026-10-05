<script setup lang="ts">
import type { CampaignTheme } from '~/utils/promo-theme'

/** `_PromoDoodleLayer` (DESIGN_AUDIT.md §4.8): decorative rings, pill, icons and spark. Positions are px from the card edges. */
defineProps<{ theme: CampaignTheme }>()
</script>

<template>
  <div aria-hidden="true" class="pointer-events-none absolute inset-0">
    <span class="absolute h-[116px] w-[116px] rounded-full border-[16px] border-white/16" style="right: -24px; top: -28px" />
    <span class="absolute h-[94px] w-[94px] rounded-full border-[16px] border-white/10" style="right: 70px; bottom: -42px" />
    <span
      class="absolute h-7 w-[92px] rounded-pill border-[7px] border-white/14"
      style="left: -18px; bottom: -26px; transform: rotate(-0.16rad)"
    />
    <component
      :is="theme.secondary"
      :size="34"
      class="absolute text-white/16"
      style="right: 88px; top: 24px; transform: rotate(-0.18rad)"
    />
    <component
      :is="theme.tertiary"
      :size="28"
      class="absolute text-white/14"
      style="right: 26px; bottom: 26px; transform: rotate(0.2rad)"
    />
    <span class="absolute flex h-7 w-7 items-center justify-center" style="left: 18px; top: 16px">
      <span class="absolute h-[26px] w-1 bg-white/18" />
      <span class="absolute h-1 w-[26px] bg-white/18" />
    </span>
  </div>
</template>
