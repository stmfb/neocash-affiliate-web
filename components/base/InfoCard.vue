<script setup lang="ts">
import { Info } from 'lucide-vue-next'

/**
 * `AppInfoCard` as the auth screens use it (DESIGN_AUDIT.md §4.14): white
 * card with red icon and text. With a `title` it's the "titledFull" variant.
 */
defineProps<{
  message: string
  title?: string | null
}>()
</script>

<template>
  <div v-if="title" role="alert" class="w-full rounded-12 bg-white px-3 py-4 font-segoe text-danger">
    <div class="flex items-center gap-2">
      <Info :size="20" class="shrink-0" aria-hidden="true" />
      <p class="text-label font-semibold">{{ title }}</p>
    </div>
    <p class="mt-2 text-label">{{ message }}</p>
  </div>
  <div v-else role="alert" class="flex w-full items-center gap-2 rounded-12 bg-white px-3.5 py-2.5 font-segoe text-danger">
    <Info :size="20" class="shrink-0" aria-hidden="true" />
    <p class="text-label">{{ message }}</p>
  </div>
</template>
