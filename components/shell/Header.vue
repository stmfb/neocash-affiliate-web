<script setup lang="ts">
/** `_AffiliateHeader` (DESIGN_AUDIT.md §4.1): title plus a subtitle of up to two lines. */
defineProps<{
  title: string
  subtitle: string
}>()
</script>

<template>
  <header class="pb-6 pl-6 pr-5 pt-6">
    <h1 class="truncate text-title text-ink">{{ title }}</h1>
    <p class="mt-1 line-clamp-2 text-body text-ink-muted">{{ subtitle }}</p>
  </header>
</template>
