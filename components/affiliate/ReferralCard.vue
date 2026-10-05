<script setup lang="ts">
import { CircleUser } from 'lucide-vue-next'
import type { Referral } from '~/types/api'

/**
 * `_ReferralCard` (DESIGN_AUDIT.md §4.11). Collapsed on Home. `expanded` on
 * the Referrals tab adds phone, loan, commission and the follow-up hint.
 */
const props = withDefaults(
  defineProps<{
    referral: Referral
    expanded?: boolean
  }>(),
  { expanded: false },
)

const stage = computed(() => stagePresentation(props.referral.stage))
const metaLine = computed(() => `${stage.value.statusText} • ${formatIsoShortDate(props.referral.stage_updated_at)}`)
const loanAmount = computed(() => loanAmountText(props.referral))
const commission = computed(() => commissionText(props.referral))
const hint = computed(() => followUpHint(props.referral))
</script>

<template>
  <article class="rounded-24 border border-line-lilac bg-white p-4">
    <div class="flex items-center">
      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface-subtle text-ink">
        <CircleUser :size="18" aria-hidden="true" />
      </span>
      <div class="ml-3 min-w-0 flex-1">
        <h3 class="text-body font-semibold text-ink">{{ referral.name }}</h3>
        <p class="mt-1 font-segoe text-label text-ink-muted">{{ metaLine }}</p>
      </div>
      <span class="ml-2 shrink-0 rounded-18 px-2.5 py-1.5 text-badge" :class="[stage.badgeClass, stage.textClass]">
        {{ stage.label }}
      </span>
    </div>

    <template v-if="expanded">
      <hr class="my-4 border-line" />
      <dl>
        <AffiliateInfoRow title="Phone Number" :value="referral.phone" />
        <AffiliateInfoRow title="Loan Amount" :value="loanAmount" />
        <AffiliateInfoRow title="Commission" :value="commission" />
      </dl>
      <p class="mt-2 text-body text-ink-muted">{{ hint }}</p>
    </template>
  </article>
</template>
