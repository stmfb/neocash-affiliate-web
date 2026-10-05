<script setup lang="ts">
import { CircleUser, House, UserSearch, Wallet } from 'lucide-vue-next'
import type { TabBarItem } from '~/types/ui'

/**
 * S4 affiliate shell (DESIGN_AUDIT.md §3–4): header on white, the grey sheet
 * with rounded top corners holding the tab's content, and the floating tab
 * bar 20px in from the sheet's edges (above the home indicator).
 *
 * Mobile keeps all four tabs mounted, so every endpoint loads once when the
 * shell appears. `ensureLoaded` does the same here. Tab pages are
 * `keepalive`, so each keeps its scroll position like mobile's IndexedStack.
 * Tabs are routes (/, /referrals, /earnings, /profile), so the browser back
 * button moves between them.
 */
interface ShellTab extends TabBarItem {
  title: string
  subtitle: string | null
}

const TABS: ShellTab[] = [
  { key: '/', label: 'Home', icon: House, title: 'Home', subtitle: 'Track referred customers and earnings.' },
  { key: '/referrals', label: 'Referrals', icon: UserSearch, title: 'Referrals', subtitle: 'Customers who used your referral code.' },
  { key: '/earnings', label: 'Earnings', icon: Wallet, title: 'Earnings', subtitle: 'Commission from disbursed loans.' },
  // Profile's subtitle is the affiliate's referral code.
  { key: '/profile', label: 'Profile', icon: CircleUser, title: 'Profile', subtitle: null },
]

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const affiliate = useAffiliateStore()
const { promo: dialogPromo, open: dialogOpen } = usePromoDialog()

const current = computed(() => TABS.find((tab) => tab.key === route.path) ?? TABS[0]!)
const subtitle = computed(() => current.value.subtitle ?? auth.agent?.referral_code ?? '')

function selectTab(key: string): void {
  if (key !== route.path) void router.push(key)
}

onMounted(() => {
  void affiliate.ensureLoaded()
})
</script>

<template>
  <AppColumn>
    <div class="flex h-dvh flex-col pt-[env(safe-area-inset-top)]">
      <ShellHeader class="shrink-0" :title="current.title" :subtitle="subtitle" />
      <div class="relative min-h-0 flex-1 overflow-hidden rounded-t-32 bg-surface-sheet">
        <slot />
        <div class="absolute inset-x-5 bottom-[calc(20px+env(safe-area-inset-bottom))] z-10">
          <ShellTabBar :items="TABS" :selected="current.key" @select="selectTab" />
        </div>
      </div>
    </div>
    <PromoDialog v-model:open="dialogOpen" :promo="dialogPromo" />
  </AppColumn>
</template>
