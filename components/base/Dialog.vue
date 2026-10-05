<script setup lang="ts">
/**
 * Material `Dialog` shell (DESIGN_AUDIT.md §3 D1/D2): centred white panel,
 * 24px inset, black 54% barrier. Barrier tap and Escape dismiss it. Focus
 * moves into the panel, is trapped there, and returns to the opener on close.
 * The panel's padding is up to the content.
 */
const open = defineModel<boolean>('open', { required: true })

withDefaults(
  defineProps<{
    radius?: '20' | '28'
    /** id of the element that names the dialog. */
    labelledby?: string
  }>(),
  { radius: '28', labelledby: undefined },
)

const panel = ref<HTMLElement>()
let opener: HTMLElement | null = null

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])'

watch(open, async (isOpen) => {
  if (isOpen) {
    opener = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    await nextTick()
    panel.value?.focus()
  } else {
    document.body.style.overflow = ''
    opener?.focus()
    opener = null
  }
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    open.value = false
    return
  }
  if (event.key !== 'Tab' || !panel.value) return
  const focusable = Array.from(panel.value.querySelectorAll<HTMLElement>(FOCUSABLE))
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (!first || !last) {
    event.preventDefault()
    return
  }
  if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.value)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/54 p-6"
        @click.self="open = false"
        @keydown="onKeydown"
      >
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="labelledby"
          tabindex="-1"
          class="max-h-full w-full max-w-dialog overflow-y-auto bg-white focus:outline-none"
          :class="radius === '20' ? 'rounded-20' : 'rounded-28'"
        >
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
