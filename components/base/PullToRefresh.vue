<script setup lang="ts">
/**
 * A vertical scroll container with Material-style pull-to-refresh
 * (`RefreshIndicator`). Pulling down from the top on touch shows the
 * indicator. Releasing past the threshold runs `refresh` and spins until it
 * settles. Without `refresh` it's a plain scroller. Emits `scroll` with
 * `scrollTop` for scroll-linked effects.
 */
const props = defineProps<{
  refresh?: () => Promise<unknown>
}>()

const emit = defineEmits<{ scroll: [scrollTop: number] }>()

const TRIGGER_PX = 64
const MAX_PULL_PX = 96
const REFRESHING_PX = 56
const RESISTANCE = 0.5

const scroller = ref<HTMLElement>()
const pull = ref(0)
const dragging = ref(false)
const refreshing = ref(false)
let startY: number | null = null

const progress = computed(() => Math.min(pull.value / TRIGGER_PX, 1))

function onTouchStart(event: TouchEvent): void {
  if (!props.refresh || refreshing.value || (scroller.value?.scrollTop ?? 0) > 0) return
  startY = event.touches[0]?.clientY ?? null
}

function onTouchMove(event: TouchEvent): void {
  if (startY === null) return
  const dy = (event.touches[0]?.clientY ?? startY) - startY
  if (dy <= 0) {
    pull.value = 0
    dragging.value = false
    return
  }
  // Take over from native scroll/overscroll while pulling down from the top.
  if (event.cancelable) event.preventDefault()
  dragging.value = true
  pull.value = Math.min(dy * RESISTANCE, MAX_PULL_PX)
}

async function onTouchEnd(): Promise<void> {
  if (startY === null) return
  startY = null
  dragging.value = false
  if (pull.value < TRIGGER_PX || !props.refresh) {
    pull.value = 0
    return
  }
  refreshing.value = true
  pull.value = REFRESHING_PX
  try {
    await props.refresh()
  } finally {
    refreshing.value = false
    pull.value = 0
  }
}

// Inside a kept-alive tab the DOM is detached while hidden, and browsers reset
// a detached scroller to the top. Put the last position back when the tab
// returns, as mobile's IndexedStack keeps it. It's recorded on every scroll:
// by the time `onDeactivated` runs, the DOM is already detached and reads 0.
let lastScrollTop = 0

function onScroll(event: Event): void {
  lastScrollTop = (event.target as HTMLElement).scrollTop
  emit('scroll', lastScrollTop)
}

onActivated(() => {
  if (scroller.value) scroller.value.scrollTop = lastScrollTop
})

defineExpose({ scroller })
</script>

<template>
  <div class="relative h-full min-h-0">
    <div
      ref="scroller"
      class="h-full overflow-y-auto overscroll-y-contain"
      :aria-busy="refreshing || undefined"
      @touchstart.passive="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
      @scroll.passive="onScroll"
    >
      <slot />
    </div>
    <div
      v-if="refresh"
      aria-hidden="true"
      class="pointer-events-none absolute left-1/2 top-0 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary shadow-[0_1px_4px_rgba(0,0,0,0.2)]"
      :class="{ 'transition-transform duration-200 ease-out': !dragging }"
      :style="{
        transform: `translate(-50%, ${pull - 44}px)`,
        opacity: pull > 0 ? 1 : 0,
      }"
    >
      <BaseSpinner
        :size="22"
        :stroke-width="2.5"
        :spinning="refreshing"
        :style="refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }"
      />
    </div>
  </div>
</template>
