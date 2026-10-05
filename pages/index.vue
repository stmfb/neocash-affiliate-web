<script setup lang="ts">
import { BadgeCheck, HandCoins, UserSearch, Wallet, X } from 'lucide-vue-next'

/**
 * T1 Home (DESIGN_AUDIT.md §3). Top to bottom: referral code, promo carousel,
 * summary period, 2×2 summary tiles, then the three most recent referrals.
 * Pull-to-refresh reloads summary, referrals and promos.
 *
 * Loading vs empty: the promo carousel shows its loading card only until the
 * first response. After that, a refresh keeps the current content on screen
 * instead of flashing back to loading.
 */
definePageMeta({ layout: 'shell', keepalive: true })
useHead({ title: 'Home' })

const auth = useAuthStore()
const affiliate = useAffiliateStore()
const { show: openPromo } = usePromoDialog()

const referralCode = computed(() => auth.agent?.referral_code ?? '')

const promosLoading = computed(() => !affiliate.promos.loaded)
const promos = computed(() => affiliate.promos.data ?? [])

const rangeText = computed(() => rangeLabel(affiliate.summaryWindow))

const tiles = computed(() => {
  const s = affiliate.summary.data
  return [
    { id: 'referrals', label: 'Referrals', value: s ? String(s.referrals) : '—', fullValue: null, icon: UserSearch, tone: 'primary' as const },
    { id: 'applications', label: 'Applications', value: s ? String(s.applications) : '—', fullValue: null, icon: HandCoins, tone: 'blue' as const },
    {
      id: 'disbursed',
      label: s ? `Disbursed • ${s.disbursed_count} ${pluralize('loan', s.disbursed_count)}` : 'Disbursed',
      value: s ? formatKoboCompact(s.disbursed_kobo) : '—',
      fullValue: s ? formatKobo(s.disbursed_kobo) : null,
      icon: BadgeCheck,
      tone: 'green' as const,
    },
    {
      id: 'earnings',
      label: 'Earnings',
      value: s ? formatKoboCompact(s.earnings_kobo) : '—',
      fullValue: s ? formatKobo(s.earnings_kobo) : null,
      icon: Wallet,
      tone: 'navy' as const,
    },
  ]
})

function viewAllReferrals(): void {
  void navigateTo('/referrals')
}
</script>

<template>
  <AffiliateScrollView :refresh="affiliate.refreshHome">
    <AffiliateReferralCodeCard v-if="referralCode" class="mb-4" :code="referralCode" />

    <!-- Full-bleed promos: out past the 20px padding, 8px from the edges. -->
    <div v-if="promosLoading" class="-mx-5 mb-5 px-2">
      <PromoLoadingCard />
    </div>
    <div v-else-if="promos.length" class="-mx-5 mb-5">
      <PromoCarousel :promos="promos" @open="openPromo" />
    </div>

    <div class="flex items-center">
      <NuxtLink
        to="/date-range"
        class="rounded-8 text-section text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        :aria-label="`Summary period: ${rangeText}. Change`"
      >
        {{ rangeText }}
      </NuxtLink>
      <button
        v-if="affiliate.summaryWindow"
        type="button"
        class="ml-2 rounded-full p-0.5 text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Clear date range"
        @click="affiliate.setSummaryWindow(null)"
      >
        <X :size="16" aria-hidden="true" />
      </button>
    </div>

    <AffiliateInlineErrorNote v-if="affiliate.summary.error" class="mt-3" :message="affiliate.summary.error.message" />

    <div class="mt-3 grid grid-cols-2 gap-3">
      <div v-for="tile in tiles" :key="tile.id" class="aspect-[1.42]">
        <AffiliateMetricCard
          :label="tile.label"
          :value="tile.value"
          :full-value="tile.fullValue"
          :icon="tile.icon"
          :tone="tile.tone"
        />
      </div>
    </div>

    <template v-if="affiliate.referrals.error">
      <AffiliateSectionHeading class="mt-5" title="Recent Referrals" action="View all" @action="viewAllReferrals" />
      <AffiliateInlineErrorNote class="mt-3" :message="affiliate.referrals.error.message" />
    </template>
    <template v-else-if="affiliate.recentReferrals.length">
      <AffiliateSectionHeading class="mt-5" title="Recent Referrals" action="View all" @action="viewAllReferrals" />
      <div class="mt-3 space-y-3">
        <AffiliateReferralCard v-for="referral in affiliate.recentReferrals" :key="referral.customer_id" :referral="referral" />
      </div>
    </template>
  </AffiliateScrollView>
</template>
