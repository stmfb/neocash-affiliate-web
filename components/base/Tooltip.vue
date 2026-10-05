<script setup lang="ts">
/**
 * Material tooltip with `triggerMode: tap` (DESIGN_AUDIT.md §3). Tap shows it
 * for 1.5s. On web, mouse hover and keyboard focus also show it. It anchors
 * to whichever edge keeps it inside the viewport.
 */
defineProps<{ text: string }>()

const TAP_SHOW_MS = 1500

const id = useId()
const root = ref<HTMLElement>()
const visible = ref(false)
const alignEnd = ref(false)
let hideTimer: ReturnType<typeof setTimeout> | undefined

function show(durationMs?: number): void {
  const rect = root.value?.getBoundingClientRect()
  alignEnd.value = !!rect && rect.left + rect.width / 2 > window.innerWidth / 2
  visible.value = true
  clearTimeout(hideTimer)
  if (durationMs) hideTimer = setTimeout(hide, durationMs)
}

function hide(): void {
  clearTimeout(hideTimer)
  visible.value = false
}

function onPointerEnter(event: PointerEvent): void {
  if (event.pointerType === 'mouse') show()
}

function onPointerLeave(event: PointerEvent): void {
  if (event.pointerType === 'mouse') hide()
}

onBeforeUnmount(() => clearTimeout(hideTimer))
</script>

<template>
  <span ref="root" class="relative block min-w-0">
    <button
      type="button"
      class="block w-full rounded-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      :aria-describedby="visible ? id : undefined"
      @click="show(TAP_SHOW_MS)"
      @pointerenter="onPointerEnter"
      @pointerleave="onPointerLeave"
      @focus="show()"
      @blur="hide"
    >
      <slot />
    </button>
    <span
      v-if="visible"
      :id="id"
      role="tooltip"
      class="pointer-events-none absolute top-full z-30 mt-1 whitespace-nowrap rounded-4 bg-tooltip px-2 py-1 font-segoe text-label font-normal text-white"
      :class="alignEnd ? 'right-0' : 'left-0'"
    >
      {{ text }}
    </span>
  </span>
</template>
