<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

/**
 * `AppCalendar` in range mode (DESIGN_AUDIT.md §3 S5): a Sunday-first month
 * of 36px day circles whose rows share the box's height. Days outside
 * `first`–`last` are disabled, and month paging stops at the months holding
 * them. The inline chevron after the month name is decorative, as on mobile.
 *
 * Web additions: days are buttons named by their full date. The grid is one
 * tab stop, and arrow keys, Home/End and PageUp/PageDown move between days,
 * crossing months when needed. The tap target is the whole cell, not just
 * the circle.
 */
const props = defineProps<{
  from: string | null
  to: string | null
  first: string
  last: string
  today: string
}>()

/** The month on show, `YYYY-MM`. */
const month = defineModel<string>('month', { required: true })

const emit = defineEmits<{ select: [day: string] }>()

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

const monthId = useId()
const grid = ref<HTMLElement>()

const cells = computed(() => monthCells(month.value))
const rows = computed(() => Math.ceil(cells.value.length / 7))
const canGoPrev = computed(() => addMonths(month.value, -1) >= monthOf(props.first))
const canGoNext = computed(() => addMonths(month.value, 1) <= monthOf(props.last))

const enabled = (day: string) => day >= props.first && day <= props.last

// The one day the Tab key lands on. Arrow keys and taps move it.
const focusDay = ref<string | null>(null)
const tabStop = computed(() => {
  const inMonth = (day: string | null): day is string => !!day && monthOf(day) === month.value && enabled(day)
  const candidates = [focusDay.value, props.from, props.today]
  return candidates.find(inMonth) ?? cells.value.find((day): day is string => !!day && enabled(day)) ?? null
})

function dayCell(day: string) {
  const isStart = day === props.from
  const isEnd = day === props.to
  const highlighted = isStart || isEnd
  const inRange = !!props.from && !!props.to && day > props.from && day < props.to
  const isToday = day === props.today
  const disabled = !enabled(day)

  // Same precedence as mobile's AppCalendar.
  let tone = 'text-black'
  if (disabled) tone = 'text-ink-muted'
  if (isToday) tone = 'text-primary'
  if (inRange) tone = 'bg-primary/12 text-primary'
  if (highlighted) tone = 'bg-primary text-white'

  let label = fullDayLabel(day)
  if (isStart && isEnd) label += ', start and end date'
  else if (isStart) label += ', start date'
  else if (isEnd) label += ', end date'
  else if (inRange) label += ', in selected range'

  return {
    day,
    number: Number(day.slice(8)),
    tone,
    weight: highlighted || inRange || isToday ? 'font-semibold' : 'font-normal',
    disabled,
    isToday,
    label,
  }
}

const days = computed(() => cells.value.map((day) => (day ? dayCell(day) : null)))

function select(day: string): void {
  focusDay.value = day
  emit('select', day)
}

async function moveFocus(target: string): Promise<void> {
  const day = clampDay(target, props.first, props.last)
  focusDay.value = day
  if (monthOf(day) !== month.value) month.value = monthOf(day)
  await nextTick()
  grid.value?.querySelector<HTMLElement>(`[data-day="${day}"]`)?.focus()
}

function onKeydown(event: KeyboardEvent, day: string): void {
  const weekday = weekdayOf(day)
  const targets: Record<string, () => string> = {
    ArrowLeft: () => addDays(day, -1),
    ArrowRight: () => addDays(day, 1),
    ArrowUp: () => addDays(day, -7),
    ArrowDown: () => addDays(day, 7),
    Home: () => addDays(day, -weekday),
    End: () => addDays(day, 6 - weekday),
    PageUp: () => sameDayIn(addMonths(monthOf(day), -1), day),
    PageDown: () => sameDayIn(addMonths(monthOf(day), 1), day),
  }
  const target = targets[event.key]
  if (!target) return
  event.preventDefault()
  void moveFocus(target())
}

function page(step: -1 | 1): void {
  month.value = addMonths(month.value, step)
}
</script>

<template>
  <div class="flex h-[350px] flex-col rounded-16 bg-white p-4">
    <div class="flex items-center">
      <h2 :id="monthId" class="flex items-center font-segoe text-ui font-semibold text-black" aria-live="polite">
        {{ monthLabel(month) }}
        <ChevronRight :size="20" class="ml-1 text-primary" aria-hidden="true" />
      </h2>
      <div class="ml-auto flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous month"
          class="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          :class="canGoPrev ? 'text-primary' : 'cursor-not-allowed text-ink-muted'"
          :disabled="!canGoPrev"
          @click="page(-1)"
        >
          <ChevronLeft :size="24" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Next month"
          class="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          :class="canGoNext ? 'text-primary' : 'cursor-not-allowed text-ink-muted'"
          :disabled="!canGoNext"
          @click="page(1)"
        >
          <ChevronRight :size="24" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div class="mt-3 grid grid-cols-7" aria-hidden="true">
      <span v-for="weekday in WEEKDAYS" :key="weekday" class="text-center font-segoe text-label font-bold text-calendar-weekday">
        {{ weekday }}
      </span>
    </div>

    <div
      ref="grid"
      role="group"
      :aria-labelledby="monthId"
      class="mt-1.5 grid min-h-0 flex-1 grid-cols-7 gap-y-0.5"
      :style="{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }"
    >
      <template v-for="(cell, i) in days" :key="cell?.day ?? `blank-${i}`">
        <span v-if="!cell" aria-hidden="true" />
        <button
          v-else
          type="button"
          class="group flex items-center justify-center focus-visible:outline-none disabled:cursor-default"
          :data-day="cell.day"
          :disabled="cell.disabled"
          :tabindex="cell.day === tabStop ? 0 : -1"
          :aria-label="cell.label"
          :aria-current="cell.isToday ? 'date' : undefined"
          @click="select(cell.day)"
          @keydown="onKeydown($event, cell.day)"
          @focus="focusDay = cell.day"
        >
          <span
            class="flex h-9 w-9 items-center justify-center rounded-full font-segoe text-ui group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-1"
            :class="[cell.tone, cell.weight]"
          >
            {{ cell.number }}
          </span>
        </button>
      </template>
    </div>
  </div>
</template>
