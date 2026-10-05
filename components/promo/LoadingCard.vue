<script setup lang="ts">
/** `_PromoLoadingCard` (DESIGN_AUDIT.md §4.10): the first theme's gradient and doodles, a spinner and the shimmer, no text. */
const theme = CAMPAIGN_THEMES[0]!
</script>

<template>
  <div class="relative h-promo w-full overflow-hidden rounded-28" :class="theme.gradient">
    <PromoDoodles :theme="theme" />
    <div class="absolute inset-0 flex items-center justify-center text-white/70">
      <BaseSpinner :size="26" :stroke-width="2.4" label="Loading promos" />
    </div>
    <PromoShimmer />
  </div>
</template>
