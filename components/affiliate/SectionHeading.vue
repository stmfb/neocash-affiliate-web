<script setup lang="ts">
/** `_SectionHeading` (DESIGN_AUDIT.md §4.7): section title, with an optional text action on the right. */
defineProps<{
  title: string
  action?: string
}>()

defineEmits<{ action: [] }>()
</script>

<template>
  <div class="flex items-center">
    <h2 class="min-w-0 flex-1 text-section text-ink">{{ title }}</h2>
    <button
      v-if="action"
      type="button"
      class="min-h-11 rounded-16 px-2 py-1 text-action text-primary hover:bg-primary/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      @click="$emit('action')"
    >
      {{ action }}
    </button>
  </div>
</template>
