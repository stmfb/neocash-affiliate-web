import type {
  AffiliateEarnings,
  AffiliateSummary,
  DateWindow,
  Promo,
  Referral,
} from '~/types/api'

/** `?from&to` only when a window is set. Omitting both uses each endpoint's own default. */
function windowQuery(range?: DateWindow | null): Record<string, string> | undefined {
  return range ? { from: range.from, to: range.to } : undefined
}

/** The affiliate read endpoints (API_MAP.md §3.5–3.8). All require role `affiliate` except promos. */
export function useAffiliateApi() {
  const api = useApi()

  return {
    /** No window = calendar month to date (Lagos). */
    getSummary: (range?: DateWindow | null) =>
      api.get<AffiliateSummary>('/affiliate/summary', windowQuery(range)),

    getReferrals: () => api.get<Referral[]>('/affiliate/referrals'),

    /** No window = all time. The mobile app never passes one. */
    getEarnings: (range?: DateWindow | null) =>
      api.get<AffiliateEarnings>('/affiliate/earnings', windowQuery(range)),

    getPromos: () => api.get<Promo[]>('/promos'),
  }
}
