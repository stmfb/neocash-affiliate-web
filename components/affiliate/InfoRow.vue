<script setup lang="ts">
/**
 * `_ProfileInfoRow` (DESIGN_AUDIT.md §4.15): label left, value right. Place it
 * inside a `<dl>`. As in Flutter's Expanded + Flexible pairing, the value
 * takes at most half the row and wraps past that.
 */
defineProps<{
  title: string
  value: string
}>()
</script>

<template>
  <div class="flex items-center gap-3 pb-3">
    <dt class="min-w-0 flex-1 font-segoe text-label text-ink-muted">{{ title }}</dt>
    <dd class="min-w-0 max-w-[calc(50%-6px)] text-right text-body font-medium text-ink">{{ value }}</dd>
  </div>
</template>
