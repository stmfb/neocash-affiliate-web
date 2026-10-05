<script setup lang="ts">
import type { Promo } from '~/types/api'

/**
 * `_AnimatedPromoStrip` (DESIGN_AUDIT.md §4.8): one promo per page with 8px
 * side padding, native swipe via scroll-snap, and autoplay every 5s (460ms
 * easeOutCubic, wrapping to the first). Like mobile, the timer doesn't reset
 * on a manual swipe. Only the current page shimmers. Dots appear from two
 * promos up. Under reduced motion there's no autoplay and pages jump.
 *
 * Full-bleed is the caller's job (e.g. wrap it in `-mx-5`).
 */
const props = defineProps<{ promos: Promo[] }>()

const emit = defineEmits<{ open: [promo: Promo] }>()

const AUTOPLAY_MS = 5000
const SLIDE_MS = 460

const scroller = ref<HTMLElement>()
const index = ref(0)
let timer: ReturnType<typeof setInterval> | undefined
let frame = 0
let animating = false

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3

function onScroll(): void {
  const el = scroller.value
  if (animating || !el?.clientWidth) return
  index.value = Math.round(el.scrollLeft / el.clientWidth)
}

function goTo(target: number): void {
  const el = scroller.value
  if (!el) return
  const from = el.scrollLeft
  const to = target * el.clientWidth
  cancelAnimationFrame(frame)
  if (prefersReducedMotion()) {
    el.scrollLeft = to
    index.value = target
    return
  }
  // Snap would fight a frame-by-frame scroll, so drop it for the animation.
  animating = true
  el.style.scrollSnapType = 'none'
  const start = performance.now()
  const step = (now: number) => {
    const t = Math.min((now - start) / SLIDE_MS, 1)
    el.scrollLeft = from + (to - from) * easeOutCubic(t)
    if (t < 1) {
      frame = requestAnimationFrame(step)
    } else {
      animating = false
      el.style.scrollSnapType = ''
      index.value = target
    }
  }
  frame = requestAnimationFrame(step)
}

function startAutoplay(): void {
  clearInterval(timer)
  if (props.promos.length < 2 || prefersReducedMotion()) return
  timer = setInterval(() => goTo((index.value + 1) % props.promos.length), AUTOPLAY_MS)
}

watch(
  () => props.promos.length,
  () => {
    index.value = 0
    if (scroller.value) scroller.value.scrollLeft = 0
    startAutoplay()
  },
)

onMounted(startAutoplay)

onBeforeUnmount(() => {
  clearInterval(timer)
  cancelAnimationFrame(frame)
})
</script>

<template>
  <div role="region" aria-roledescription="carousel" aria-label="Promotions">
    <div
      ref="scroller"
      class="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      @scroll.passive="onScroll"
    >
      <div
        v-for="(promo, i) in promos"
        :key="promo.id"
        class="w-full shrink-0 snap-center px-2"
        role="group"
        aria-roledescription="slide"
        :aria-label="`${i + 1} of ${promos.length}`"
      >
        <PromoTappableCard :promo="promo" :glow="i === index" @open="emit('open', promo)" />
      </div>
    </div>
    <div v-if="promos.length > 1" aria-hidden="true" class="mt-2.5 flex justify-center">
      <span
        v-for="(promo, i) in promos"
        :key="promo.id"
        class="mx-[3px] h-1.5 rounded-pill transition-all duration-220 ease-linear"
        :class="i === index ? 'w-[18px] bg-primary' : 'w-1.5 bg-primary/22'"
      />
    </div>
  </div>
</template>
