<script setup lang="ts">
import type { TabBarItem } from '~/types/ui'

/**
 * `_AffiliateBottomNavigation` (DESIGN_AUDIT.md §4.2). A floating bar with a
 * pill behind the selected tab.
 * - Tap: select at once, pill springs over (230ms easeOutBack).
 * - Drag: pill follows the finger, then snaps to the tab under it (260ms).
 * - Colour: each item blends ink → primary by how much the pill overlaps it.
 * - Keyboard: every item is a real button.
 * - Selection changed from outside: the pill jumps, like mobile.
 */
const props = defineProps<{
  items: TabBarItem[]
  selected: string
}>()

const emit = defineEmits<{ select: [key: string] }>()

const TAP_MS = 230
const SETTLE_MS = 260
const DRAG_SLOP_PX = 6
const INK = [51, 51, 102] as const // #333366
const PRIMARY = [140, 112, 255] as const // #8C70FF

const track = ref<HTMLElement>()
const trackWidth = ref(0)
/** Pill x while dragging or animating. null = resting on the selected tab. */
const pillX = ref<number | null>(null)

const itemWidth = computed(() => (props.items.length ? trackWidth.value / props.items.length : 0))
const selectedIndex = computed(() => Math.max(0, props.items.findIndex((item) => item.key === props.selected)))
const left = computed(() => pillX.value ?? selectedIndex.value * itemWidth.value)

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/** Flutter's Curves.easeOutBack. */
function easeOutBack(t: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
}

function activation(index: number): number {
  const width = itemWidth.value
  if (!width) return index === selectedIndex.value ? 1 : 0
  const itemLeft = index * width
  const overlap = Math.min(left.value + width, itemLeft + width) - Math.max(left.value, itemLeft)
  return clamp(overlap / width, 0, 1)
}

function itemColor(index: number): string {
  const a = activation(index)
  const [r, g, b] = INK.map((from, i) => Math.round(from + (PRIMARY[i]! - from) * a))
  return `rgb(${r} ${g} ${b})`
}

// ── Pill animation ─────────────────────────────────────────────────────────

let frame = 0
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function animatePill(from: number, to: number, durationMs: number): void {
  cancelAnimationFrame(frame)
  if (prefersReducedMotion()) {
    pillX.value = null
    return
  }
  const start = performance.now()
  const step = (now: number) => {
    const t = Math.min((now - start) / durationMs, 1)
    pillX.value = from + (to - from) * easeOutBack(t)
    if (t < 1) frame = requestAnimationFrame(step)
    else pillX.value = null
  }
  frame = requestAnimationFrame(step)
}

function selectIndex(index: number, durationMs: number): void {
  const item = props.items[index]
  if (!item) return
  if (index === selectedIndex.value && pillX.value === null) return
  const from = left.value
  if (index !== selectedIndex.value) emit('select', item.key)
  animatePill(from, index * itemWidth.value, durationMs)
}

// ── Pointer: tap vs drag ───────────────────────────────────────────────────

let pointerId: number | null = null
let downX = 0
let dragging = false
let hoverIndex = 0

function localX(event: PointerEvent): number {
  return event.clientX - (track.value?.getBoundingClientRect().left ?? 0)
}

function indexAt(x: number): number {
  return clamp(Math.floor(x / (itemWidth.value || 1)), 0, props.items.length - 1)
}

function onPointerDown(event: PointerEvent): void {
  if (event.button !== 0 || pointerId !== null) return
  pointerId = event.pointerId
  downX = localX(event)
  dragging = false
  track.value?.setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent): void {
  if (event.pointerId !== pointerId) return
  const x = localX(event)
  if (!dragging && Math.abs(x - downX) < DRAG_SLOP_PX) return
  dragging = true
  cancelAnimationFrame(frame)
  const width = itemWidth.value
  pillX.value = clamp(x - width / 2, 0, trackWidth.value - width)
  hoverIndex = indexAt(x)
}

function onPointerUp(event: PointerEvent): void {
  if (event.pointerId !== pointerId) return
  pointerId = null
  if (dragging) {
    dragging = false
    selectIndex(hoverIndex, SETTLE_MS)
  } else {
    selectIndex(indexAt(localX(event)), TAP_MS)
  }
}

function onPointerCancel(event: PointerEvent): void {
  if (event.pointerId !== pointerId) return
  pointerId = null
  if (dragging) {
    dragging = false
    selectIndex(hoverIndex, SETTLE_MS)
  }
}

/** Pointer taps are handled above. This only catches keyboard activation (`detail` 0). */
function onClick(event: MouseEvent, index: number): void {
  if (event.detail === 0) selectIndex(index, TAP_MS)
}

// ── Layout ─────────────────────────────────────────────────────────────────

let observer: ResizeObserver | undefined

onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    if (entry) trackWidth.value = entry.contentRect.width
  })
  if (track.value) observer.observe(track.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  cancelAnimationFrame(frame)
})
</script>

<template>
  <nav aria-label="Main" class="h-nav rounded-32 border border-white bg-white/85 px-1.5 py-1 shadow-nav">
    <div
      ref="track"
      class="relative flex h-full touch-none select-none"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
    >
      <div
        v-show="itemWidth > 0"
        aria-hidden="true"
        class="absolute inset-y-0 left-0 rounded-28 bg-primary/14"
        :style="{ width: `${itemWidth}px`, transform: `translateX(${left}px)` }"
      />
      <button
        v-for="(item, index) in items"
        :key="item.key"
        type="button"
        class="relative flex min-w-0 flex-1 flex-col items-center justify-center rounded-28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        :style="{ color: itemColor(index) }"
        :aria-current="item.key === selected ? 'page' : undefined"
        @click="onClick($event, index)"
      >
        <component :is="item.icon" :size="18" aria-hidden="true" />
        <span class="mt-1 max-w-full truncate text-nav">{{ item.label }}</span>
      </button>
    </div>
  </nav>
</template>
