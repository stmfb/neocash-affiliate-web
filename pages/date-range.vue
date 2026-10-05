<script setup lang="ts">
// Placeholder until S5 "Select Date Range" lands. Home's period label links here.
useHead({ title: 'Select Date Range' })

const router = useRouter()

function back(): void {
  if (window.history.state?.back) router.back()
  else void router.replace('/')
}
</script>

<template>
  <div class="min-h-dvh pt-[env(safe-area-inset-top)]">
    <BaseStepHeader title="Select Date Range" @back="back" />
    <p class="px-6 text-body text-ink-muted">Date range picker: coming soon.</p>
  </div>
</template>
