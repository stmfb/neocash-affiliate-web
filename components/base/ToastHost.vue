<script setup lang="ts">
/**
 * Renders the toast store's current message as a Material floating SnackBar,
 * centred on the app column. Tap to dismiss. Sits above dialogs so the
 * "Copied …" confirmation from Share Promo stays visible.
 */
const toast = useToastStore()
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-[calc(16px+env(safe-area-inset-bottom))]"
    role="status"
    aria-live="polite"
  >
    <Transition
      enter-active-class="transition duration-200 ease-out"
      leave-active-class="transition duration-150 ease-in"
      enter-from-class="translate-y-2 opacity-0"
      leave-to-class="opacity-0"
    >
      <button
        v-if="toast.current"
        :key="toast.current.id"
        type="button"
        class="pointer-events-auto w-full max-w-[448px] rounded-4 bg-toast px-4 py-3.5 text-left font-segoe text-toast text-white shadow-[0_3px_5px_rgba(0,0,0,0.2)]"
        @click="toast.dismiss()"
      >
        {{ toast.current.message }}
      </button>
    </Transition>
  </div>
</template>
