<script setup lang="ts">
import { ChevronLeft } from 'lucide-vue-next'

/**
 * Mobile's shared `StepHeader` (lib/shared/layout/step_header.dart): a round
 * back button beside a title.
 */
defineProps<{ title: string }>()

defineEmits<{ back: [] }>()
</script>

<template>
  <header class="flex items-center p-6">
    <button
      type="button"
      aria-label="Back"
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface-subtle text-primary transition-[filter] hover:brightness-95 active:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      @click="$emit('back')"
    >
      <ChevronLeft :size="16" aria-hidden="true" />
    </button>
    <h1 class="ml-3 min-w-0 flex-1 text-title-sm text-ink">{{ title }}</h1>
  </header>
</template>
