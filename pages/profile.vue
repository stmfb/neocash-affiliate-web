<script setup lang="ts">
import { ArrowRight, CircleUser } from 'lucide-vue-next'

/**
 * T4 Profile (DESIGN_AUDIT.md §3): the account card, the last promo, and
 * Log Out behind a confirmation. No pull-to-refresh, as on mobile. Everything
 * comes from the session except the promo.
 *
 * The phone line is left out when the server sends "" (it always sends a
 * string), where mobile would show an empty line (§7 #10).
 */
definePageMeta({ layout: 'shell', keepalive: true })
useHead({ title: 'Profile' })

const auth = useAuthStore()
const affiliate = useAffiliateStore()
const { show: openPromo } = usePromoDialog()

const name = computed(() => auth.agent?.name ?? '')
const email = computed(() => auth.agent?.email ?? '')
const phone = computed(() => auth.agent?.phone?.trim() ?? '')
const referralCode = computed(() => auth.agent?.referral_code ?? '')
const commissionRate = computed(() =>
  auth.commissionRatePercent === null ? '—' : `${formatPercent(auth.commissionRatePercent)}% per disbursed loan`,
)
const lastPromo = computed(() => affiliate.promos.data?.at(-1) ?? null)

const confirmingLogOut = ref(false)
</script>

<template>
  <AffiliateScrollView>
    <section class="rounded-28 border border-line bg-white p-5">
      <div class="flex items-start">
        <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-lilac text-ink">
          <CircleUser :size="26" aria-hidden="true" />
        </span>
        <div class="ml-4 min-w-0 flex-1">
          <h2 class="text-section text-ink">{{ name }}</h2>
          <p v-if="phone" class="mt-1.5 truncate text-body text-ink-muted">{{ phone }}</p>
          <p class="mt-1.5 truncate text-body text-ink-muted">{{ email }}</p>
        </div>
      </div>
      <dl class="mt-5">
        <AffiliateInfoRow title="Role" value="Affiliate Marketer" />
        <AffiliateInfoRow v-if="referralCode" title="Referral Code" :value="referralCode" />
        <AffiliateInfoRow title="Commission Rate" :value="commissionRate" />
      </dl>
    </section>

    <!-- Full-bleed: out past the 20px padding, 8px from the edges. -->
    <div v-if="lastPromo" class="-mx-5 mt-4 px-2">
      <PromoTappableCard :promo="lastPromo" glow @open="openPromo(lastPromo)" />
    </div>

    <div class="mt-8 flex justify-end">
      <BaseButton variant="danger" @click="confirmingLogOut = true">
        Log Out
        <template #icon><ArrowRight :size="18" aria-hidden="true" /></template>
      </BaseButton>
    </div>

    <AffiliateLogOutDialog v-model:open="confirmingLogOut" @confirm="auth.signOut()" />
  </AffiliateScrollView>
</template>
