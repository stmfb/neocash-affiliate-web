<!--
  The phone-width column every screen renders in. Full width on phones,
  centred at 480px on wider screens (the design has no tablet or desktop
  layout yet).
-->
<template>
  <div class="min-h-dvh bg-surface-sheet">
    <div class="relative mx-auto min-h-dvh max-w-app bg-white sm:border-x sm:border-line">
      <slot />
    </div>
  </div>
</template>
