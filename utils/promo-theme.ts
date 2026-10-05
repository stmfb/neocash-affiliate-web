import type { Component } from 'vue'
import {
  BriefcaseBusiness,
  CalendarClock,
  Coins,
  LockKeyhole,
  PackageCheck,
  Percent,
  Share2,
  Store,
  TrendingUp,
  UsersRound,
  Vault,
  WalletCards,
} from 'lucide-vue-next'

export interface CampaignTheme {
  /** `bg-campaign-N` gradient class (tailwind.config.ts). */
  gradient: string
  /** Badge icon. */
  primary: Component
  /** Doodle icons. */
  secondary: Component
  tertiary: Component
}

/** DESIGN_AUDIT.md §4.8 campaign themes, in mobile's order. */
export const CAMPAIGN_THEMES: readonly CampaignTheme[] = [
  { gradient: 'bg-campaign-0', primary: UsersRound, secondary: Coins, tertiary: Share2 },
  { gradient: 'bg-campaign-1', primary: BriefcaseBusiness, secondary: CalendarClock, tertiary: WalletCards },
  { gradient: 'bg-campaign-2', primary: Store, secondary: TrendingUp, tertiary: PackageCheck },
  { gradient: 'bg-campaign-3', primary: Vault, secondary: LockKeyhole, tertiary: Percent },
]

/**
 * Picks a promo's decorative theme from its id. Mobile uses Dart's
 * `String.hashCode`, which JS can't reproduce, so this uses FNV-1a instead.
 * It's stable, but won't pick the same theme mobile does for a given id.
 */
export function campaignThemeIndex(id: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0) % CAMPAIGN_THEMES.length
}

export function campaignTheme(id: string): CampaignTheme {
  return CAMPAIGN_THEMES[campaignThemeIndex(id)]!
}
