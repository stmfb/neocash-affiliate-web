<script setup lang="ts">
/**
 * `_FitOrCompactAmount` (DESIGN_AUDIT.md §4.12c). Shows the full `₦` amount
 * when it fits the available width. Otherwise the compact form (`₦1.2M`) with
 * a tooltip holding the full value. Font styles come from the classes you
 * pass, which the hidden measuring copy inherits too.
 */
const props = defineProps<{ kobo: number }>()

const full = computed(() => formatKobo(props.kobo))
const compactText = computed(() => formatKoboCompact(props.kobo))

const box = ref<HTMLElement>()
const probe = ref<HTMLElement>()
const fits = ref(true)

function measure(): void {
  if (box.value && probe.value) fits.value = probe.value.offsetWidth <= box.value.clientWidth
}

let observer: ResizeObserver | undefined

onMounted(() => {
  observer = new ResizeObserver(measure)
  if (box.value) observer.observe(box.value)
  measure()
  // Clash Grotesk loads with `font-display: swap`, so re-measure once it's in.
  void document.fonts?.ready.then(measure)
})

onBeforeUnmount(() => observer?.disconnect())

watch(full, () => nextTick(measure))
</script>

<template>
  <div ref="box" class="relative min-w-0">
    <span ref="probe" aria-hidden="true" class="invisible absolute left-0 top-0 whitespace-nowrap">{{ full }}</span>
    <p v-if="fits" class="truncate">{{ full }}</p>
    <BaseTooltip v-else :text="full">
      <span class="block truncate">{{ compactText }}</span>
    </BaseTooltip>
  </div>
</template>
