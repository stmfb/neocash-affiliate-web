<script setup lang="ts">
// Placeholder until the Profile tab (T4) lands. Keeps a sign-out button so
// the auth flows can be exercised meanwhile.
definePageMeta({ layout: 'shell', keepalive: true })
useHead({ title: 'Profile' })

const auth = useAuthStore()
</script>

<template>
  <AffiliateScrollView>
    <p class="text-body text-ink-muted">Profile tab: coming soon.</p>
    <BaseButton class="mt-6" variant="danger" @click="auth.signOut()">Log Out</BaseButton>
  </AffiliateScrollView>
</template>
