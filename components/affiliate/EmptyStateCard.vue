<script setup lang="ts">
import type { Component } from 'vue'

/** `_AffiliateEmptyStateCard` (DESIGN_AUDIT.md §4.9). Also used for whole-list errors. */
defineProps<{
  icon: Component
  title: string
  message: string
}>()
</script>

<template>
  <section class="flex flex-col items-center rounded-28 border border-line bg-white px-5 py-6 text-center">
    <span class="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface-subtle text-ink">
      <component :is="icon" :size="22" aria-hidden="true" />
    </span>
    <h3 class="mt-4 text-section text-ink">{{ title }}</h3>
    <p class="mt-2 text-body text-ink-muted">{{ message }}</p>
  </section>
</template>
