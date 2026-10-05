<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next'

/**
 * `_InlineErrorNote` (DESIGN_AUDIT.md §4.6): a partial failure shown beside
 * content that did load, so a failed fetch never looks like "no data".
 */
defineProps<{ message: string }>()
</script>

<template>
  <div role="alert" class="flex items-start gap-2 rounded-14 border border-danger/20 bg-danger/6 px-3 py-2.5 text-danger">
    <TriangleAlert :size="16" class="mt-px shrink-0" aria-hidden="true" />
    <p class="font-segoe text-label">{{ message }}</p>
  </div>
</template>
