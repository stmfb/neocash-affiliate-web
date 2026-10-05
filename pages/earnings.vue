<script setup lang="ts">
import { TriangleAlert, Wallet } from 'lucide-vue-next'

/**
 * T3 Earnings (DESIGN_AUDIT.md §3): the total-earnings card, then every
 * commission record in API order (newest first). Always all-time: the
 * endpoint takes a window but mobile never sends one. Pull-to-refresh reloads
 * earnings only.
 *
 * Loading shows "—" in the card and placeholder rows, not mobile's ₦0.00 and
 * "No Earnings Yet".
 */
definePageMeta({ layout: 'shell', keepalive: true })
useHead({ title: 'Earnings' })

const auth = useAuthStore()
const affiliate = useAffiliateStore()

const earnings = computed(() => affiliate.earnings.data)
const records = computed(() => earnings.value?.records ?? [])
const loading = computed(() => !affiliate.earnings.loaded)
</script>

<template>
  <AffiliateScrollView :refresh="affiliate.refreshEarnings">
    <AffiliateEarningsHero
      :total-kobo="earnings?.total_kobo ?? null"
      :paid-kobo="earnings?.paid_kobo ?? null"
      :pending-kobo="earnings?.pending_kobo ?? null"
      :rate-percent="auth.commissionRatePercent"
    />

    <h2 class="mt-5 text-section text-ink">Commission Records</h2>

    <AffiliateLoadingList v-if="loading" class="mt-3" kind="earning" label="Loading earnings" />
    <div v-else-if="records.length" class="mt-3 space-y-3">
      <AffiliateEarningRow v-for="(record, i) in records" :key="`${record.earned_at}-${i}`" :record="record" />
    </div>
    <AffiliateEmptyStateCard
      v-else-if="affiliate.earnings.error"
      class="mt-3"
      :icon="TriangleAlert"
      title="Couldn't load earnings"
      :message="affiliate.earnings.error.message"
    />
    <AffiliateEmptyStateCard
      v-else
      class="mt-3"
      :icon="Wallet"
      title="No Earnings Yet"
      message="Commission history will appear here after referred loans are disbursed."
    />
  </AffiliateScrollView>
</template>
