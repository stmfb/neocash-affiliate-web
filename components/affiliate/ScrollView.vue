<script setup lang="ts">
/**
 * `_AffiliateScrollView` (DESIGN_AUDIT.md §4.3): the standard tab scroller.
 * Padding is 20/24/20, plus 116 at the bottom to clear the floating tab bar.
 * Pull-to-refresh only when `refresh` is given (Profile has none).
 */
defineProps<{
  refresh?: () => Promise<unknown>
}>()
</script>

<template>
  <BasePullToRefresh :refresh="refresh">
    <div class="px-5 pb-nav-clearance pt-6">
      <slot />
    </div>
  </BasePullToRefresh>
</template>
