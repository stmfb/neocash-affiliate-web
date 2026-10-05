<script setup lang="ts">
import { LogOut } from 'lucide-vue-next'

/** "Log out?" confirmation (DESIGN_AUDIT.md §3 D2). Emits `confirm` and closes. Signing out is the parent's job. */
const open = defineModel<boolean>('open', { required: true })

const emit = defineEmits<{ confirm: [] }>()

const titleId = useId()

function confirm(): void {
  open.value = false
  emit('confirm')
}
</script>

<template>
  <BaseDialog v-model:open="open" radius="20" :labelledby="titleId">
    <div class="p-6 text-center">
      <h2 :id="titleId" class="text-section text-ink">Log out?</h2>
      <p class="mt-2 font-segoe text-ui text-ink-muted">You'll need to sign in again to continue.</p>
      <div class="mt-6 flex gap-2">
        <BaseButton class="flex-1" variant="outlined" block @click="open = false">Cancel</BaseButton>
        <BaseButton class="flex-1" variant="danger" block @click="confirm">
          Log Out
          <template #icon><LogOut :size="16" aria-hidden="true" /></template>
        </BaseButton>
      </div>
    </div>
  </BaseDialog>
</template>
