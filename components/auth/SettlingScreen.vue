<script setup lang="ts">
import { Cloud } from 'lucide-vue-next'

/**
 * S1 "Authenticating…" (DESIGN_AUDIT.md §3), shown while the session is being
 * restored. Dots step every 400ms.
 */
const dots = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  timer = setInterval(() => (dots.value = (dots.value + 1) % 4), 400)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="relative flex min-h-dvh items-center justify-center overflow-hidden bg-white" role="status">
    <AuthSpriteBackground />
    <div class="relative flex flex-col items-center">
      <Cloud :size="40" class="text-ink" aria-hidden="true" />
      <p class="mt-3 flex font-segoe text-ui text-ink">
        <span>Authenticating</span>
        <span v-for="i in 3" :key="i" class="inline-block w-2" aria-hidden="true">{{ i <= dots ? '.' : '' }}</span>
      </p>
    </div>
  </div>
</template>
