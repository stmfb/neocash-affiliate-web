<script setup lang="ts">
const APP_NAME = 'NeoCash Affiliate'

useHead({
  titleTemplate: (title) => (title && title !== APP_NAME ? `${title} · ${APP_NAME}` : APP_NAME),
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <BaseToastHost />
</template>
