<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import type { PickedRange } from '~/utils/calendar'

/**
 * S5 Select Date Range (DESIGN_AUDIT.md §3), opened from Home's period label.
 * It starts on the current range, or on this month with nothing picked.
 * Days run from 1 January two years back to today. Confirm Dates sets Home's
 * summary window, which refetches the summary, and goes back.
 *
 * Like mobile's pushed route, it opens over the shell rather than replacing
 * it (`pushed`), so the tabs underneath keep their state and scroll. The
 * `keepalive` exclude keeps the tabs cached without caching this screen: it
 * starts fresh each time, as on mobile.
 */
definePageMeta({ layout: 'shell', pushed: true, keepalive: { exclude: ['date-range'] } })
useHead({ title: 'Select Date Range' })

const router = useRouter()
const affiliate = useAffiliateStore()

const today = lagosToday()
const first = `${Number(today.slice(0, 4)) - 2}-01-01`

const picked = ref<PickedRange>({
  from: affiliate.summaryWindow?.from ?? null,
  to: affiliate.summaryWindow?.to ?? null,
})
const month = ref(monthOf(picked.value.from ?? today))

const hint = computed(() => {
  if (!picked.value.from) return 'Tap a start date'
  if (!picked.value.to) return 'Now tap your end date'
  return 'Date range selected'
})

const fromLabel = computed(() => (picked.value.from ? pickerDate(parseCalendarDate(picked.value.from)) : '___'))
const toLabel = computed(() => (picked.value.to ? pickerDate(parseCalendarDate(picked.value.to)) : '___'))

function onSelect(day: string): void {
  picked.value = nextRange(picked.value, day)
}

function back(): void {
  if (window.history.state?.back) router.back()
  else void router.replace('/')
}

function confirm(): void {
  const { from, to } = picked.value
  if (!from || !to) return
  void affiliate.setSummaryWindow({ from, to })
  back()
}

// A new screen: move focus to its title, as a native push would.
const heading = ref<HTMLElement>()
onMounted(() => heading.value?.focus({ preventScroll: true }))
</script>

<template>
  <div class="flex min-h-full flex-col">
    <header class="flex items-center px-6 py-2">
      <button
        type="button"
        aria-label="Back"
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-back p-1 text-black transition-[filter] hover:brightness-95 active:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        @click="back"
      >
        <ChevronLeft :size="18" aria-hidden="true" />
      </button>
      <h1 ref="heading" tabindex="-1" class="min-w-0 flex-1 text-center font-segoe text-ui-title text-ink focus:outline-none">
        Select Date Range
      </h1>
      <span class="w-8 shrink-0" aria-hidden="true" />
    </header>

    <p class="mt-2 self-center rounded-pill bg-primary/12 px-4 py-1.5 font-segoe text-label font-semibold text-primary" aria-live="polite">
      {{ hint }}
    </p>

    <DateRangeCalendar
      v-model:month="month"
      class="mx-3.5 mt-4"
      :from="picked.from"
      :to="picked.to"
      :first="first"
      :last="today"
      :today="today"
      @select="onSelect"
    />

    <dl class="mx-3.5 mt-4 flex items-center rounded-12 bg-white px-8 py-3.5 font-segoe text-ui">
      <div class="flex-1">
        <dt class="text-ink-secondary">FROM</dt>
        <dd class="mt-1 font-semibold text-ink">{{ fromLabel }}</dd>
      </div>
      <ChevronRight :size="20" class="shrink-0 text-ink-muted" aria-hidden="true" />
      <div class="flex flex-1 justify-end">
        <div>
          <dt class="text-ink-secondary">TO</dt>
          <dd class="mt-1 font-semibold text-ink">{{ toLabel }}</dd>
        </div>
      </div>
    </dl>

    <div class="mt-auto px-6 pb-[calc(24px+env(safe-area-inset-bottom))] pt-4">
      <BaseButton block :disabled="!picked.from || !picked.to" @click="confirm">
        Confirm Dates
        <template #icon><ChevronRight :size="14" aria-hidden="true" /></template>
      </BaseButton>
    </div>
  </div>
</template>
