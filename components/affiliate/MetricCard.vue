<script setup lang="ts">
import type { Component } from 'vue'

/**
 * `_MetricCard` (DESIGN_AUDIT.md §4.5), a Home tile. When `fullValue` is set,
 * the value (usually a compact `₦3B`) gets a tooltip with the exact amount.
 */
type Tone = 'primary' | 'blue' | 'green' | 'navy'

defineProps<{
  label: string
  value: string
  fullValue?: string | null
  icon: Component
  tone: Tone
}>()

const TONES: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary',
  blue: 'bg-data-blue/10 text-data-blue',
  green: 'bg-data-green/10 text-data-green',
  navy: 'bg-data-navy/10 text-data-navy',
}
</script>

<template>
  <div class="flex h-full flex-col justify-between rounded-24 bg-white p-4">
    <span class="flex h-8 w-8 items-center justify-center rounded-full" :class="TONES[tone]">
      <component :is="icon" :size="17" aria-hidden="true" />
    </span>
    <div class="min-w-0">
      <BaseTooltip v-if="fullValue" :text="fullValue">
        <span class="block truncate text-metric text-ink">{{ value }}</span>
      </BaseTooltip>
      <p v-else class="truncate text-metric text-ink">{{ value }}</p>
      <p class="font-segoe text-label text-ink-muted">{{ label }}</p>
    </div>
  </div>
</template>
