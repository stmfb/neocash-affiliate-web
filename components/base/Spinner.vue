<script setup lang="ts">
/** Material-style circular progress indicator. Colour comes from `currentColor`. */
const props = withDefaults(
  defineProps<{
    size?: number
    strokeWidth?: number
    /** False holds the arc still, e.g. while a pull-to-refresh is being dragged. */
    spinning?: boolean
    /** Accessible name. Omit when a parent already announces the busy state. */
    label?: string
  }>(),
  { size: 16, strokeWidth: 2, spinning: true, label: undefined },
)

const radius = computed(() => (props.size - props.strokeWidth) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
</script>

<template>
  <svg
    :width="size"
    :height="size"
    :viewBox="`0 0 ${size} ${size}`"
    :class="{ 'animate-spin': spinning }"
    :role="label ? 'status' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
  >
    <circle
      :cx="size / 2"
      :cy="size / 2"
      :r="radius"
      fill="none"
      stroke="currentColor"
      :stroke-width="strokeWidth"
      :stroke-dasharray="`${circumference * 0.7} ${circumference}`"
    />
  </svg>
</template>
