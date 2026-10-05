<script setup lang="ts">
import type { Component } from 'vue'

/** `_RoundActionButton` (DESIGN_AUDIT.md §4.16), plus the accessible label mobile lacks. */
defineProps<{
  icon: Component
  label: string
}>()
</script>

<template>
  <button
    type="button"
    :aria-label="label"
    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface-subtle text-ink transition-[filter] hover:brightness-95 active:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
  >
    <component :is="icon" :size="18" aria-hidden="true" />
  </button>
</template>
