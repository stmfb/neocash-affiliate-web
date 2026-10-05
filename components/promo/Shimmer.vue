<!--
  `_PromoShimmerSweep` (DESIGN_AUDIT.md §4.8): a slanted white band (0 → 18%
  → 0) crossing the card once every 5s. Hidden under prefers-reduced-motion.
  The 133deg angle and 40/50/60% stops match Flutter's band on a
  phone-width card.
-->
<template>
  <div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden">
    <div
      class="absolute inset-0 animate-shimmer"
      style="
        background-image: linear-gradient(
          133deg,
          rgba(255, 255, 255, 0) 40%,
          rgba(255, 255, 255, 0.18) 50%,
          rgba(255, 255, 255, 0) 60%
        );
      "
    />
  </div>
</template>
