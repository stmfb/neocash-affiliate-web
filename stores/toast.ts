/** Material SnackBar's default display time. */
const TOAST_DURATION_MS = 4000

export interface Toast {
  id: number
  message: string
}

/**
 * Mobile's floating SnackBar ("Copied …"). Like `ScaffoldMessenger`, toasts
 * queue and show one at a time.
 */
export const useToastStore = defineStore('toast', () => {
  const queue = ref<Toast[]>([])
  const current = computed<Toast | null>(() => queue.value[0] ?? null)

  let nextId = 1
  let timer: ReturnType<typeof setTimeout> | undefined

  function schedule(): void {
    clearTimeout(timer)
    timer = setTimeout(dismiss, TOAST_DURATION_MS)
  }

  function show(message: string): void {
    queue.value.push({ id: nextId++, message })
    if (queue.value.length === 1) schedule()
  }

  /** Hides the visible toast and moves on to the next one, if any. */
  function dismiss(): void {
    clearTimeout(timer)
    queue.value.shift()
    if (queue.value.length > 0) schedule()
  }

  return { queue, current, show, dismiss }
})
