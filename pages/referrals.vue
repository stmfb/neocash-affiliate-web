<script setup lang="ts">
import { TriangleAlert, UserSearch } from 'lucide-vue-next'

/**
 * T2 Referrals (DESIGN_AUDIT.md §3). Two layers: the first promo stays pinned
 * at the top of the sheet, and a white sheet of expanded referral cards
 * scrolls up over it. Mobile stacks the promo behind the list. Here it's
 * `sticky` inside the scroller instead, so it stays tappable and dragging on
 * it still scrolls the list.
 *
 * "Customers" fades out over the last stretch before it reaches the top.
 * Referrals stay in API order (only Home sorts). Pull-to-refresh reloads
 * referrals and promos. Loading shows placeholder cards, not mobile's
 * "No Referrals Yet".
 */
definePageMeta({ layout: 'shell', keepalive: true })
useHead({ title: 'Referrals' })

const PROMO_HEIGHT = 150
const REST_GAP = 20
const SHEET_PADDING_TOP = 24
const FADE_DISTANCE = 40

const affiliate = useAffiliateStore()
const { show: openPromo } = usePromoDialog()

const firstPromo = computed(() => affiliate.promos.data?.[0] ?? null)
const referrals = computed(() => affiliate.referrals.data ?? [])
const loading = computed(() => !affiliate.referrals.loaded)
const spacer = computed(() => (firstPromo.value ? PROMO_HEIGHT + REST_GAP : 0))

const scrollTop = ref(0)

const headingOpacity = computed(() => {
  const headingOffset = spacer.value + SHEET_PADDING_TOP
  // Mobile always fades over 40px, which leaves the heading at 60% opacity at
  // rest when there's no promo (it starts only 24px down). Capping the
  // distance at the offset keeps it fully opaque until scrolling starts.
  const distance = Math.min(FADE_DISTANCE, headingOffset)
  return Math.min(Math.max((headingOffset - scrollTop.value) / distance, 0), 1)
})
</script>

<template>
  <BasePullToRefresh :refresh="affiliate.refreshReferrals" @scroll="scrollTop = $event">
    <div v-if="firstPromo" class="sticky top-0 px-2">
      <PromoTappableCard :promo="firstPromo" glow @open="openPromo(firstPromo)" />
    </div>

    <!-- Tall enough to always scroll a little, as on mobile (screen height minus the promo layer). -->
    <div
      class="relative rounded-t-28 bg-white px-5 pb-nav-clearance pt-6"
      :class="{ 'mt-5': firstPromo }"
      :style="{ minHeight: `calc(100dvh - ${spacer}px)` }"
    >
      <template v-if="loading || referrals.length">
        <h2 class="text-section text-ink" :style="{ opacity: headingOpacity }">Customers</h2>
        <AffiliateLoadingList v-if="loading" class="mt-3" kind="referral" label="Loading referrals" />
        <div v-else class="mt-3 space-y-3">
          <AffiliateReferralCard v-for="referral in referrals" :key="referral.customer_id" :referral="referral" expanded />
        </div>
      </template>
      <AffiliateEmptyStateCard
        v-else-if="affiliate.referrals.error"
        :icon="TriangleAlert"
        title="Couldn't load referrals"
        :message="affiliate.referrals.error.message"
      />
      <AffiliateEmptyStateCard
        v-else
        :icon="UserSearch"
        title="No Referrals Yet"
        message="Share your referral code. Customers will show here once they sign up through NeoCash."
      />
    </div>
  </BasePullToRefresh>
</template>
