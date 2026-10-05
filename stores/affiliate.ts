import type { AffiliateEarnings, AffiliateSummary, DateWindow, Promo, Referral } from '~/types/api'
import { toApiFailure, type ApiFailure } from '~/utils/api-failure'

/** One endpoint's state. `loaded` flips after the first response, success or failure. */
export interface Resource<T> {
  data: T | null
  error: ApiFailure | null
  pending: boolean
  loaded: boolean
}

function emptyResource<T>(): Resource<T> {
  return { data: null, error: null, pending: false, loaded: false }
}

/**
 * A resource plus its loader. Only the latest request may write, so a slow
 * response for an old date window can't overwrite a newer one. A failure
 * replaces the data, as on mobile.
 */
function useResource<T>() {
  const state = shallowRef<Resource<T>>(emptyResource<T>())
  let latest = 0

  async function run(fetcher: () => Promise<T>): Promise<void> {
    const id = ++latest
    state.value = { ...state.value, pending: true }
    try {
      const data = await fetcher()
      if (id === latest) state.value = { data, error: null, pending: false, loaded: true }
    } catch (error) {
      if (id === latest) {
        state.value = { data: null, error: toApiFailure(error), pending: false, loaded: true }
      }
    }
  }

  function reset(): void {
    latest++
    state.value = emptyResource<T>()
  }

  return { state, run, reset }
}

function timestampOrOldest(iso: string): number {
  const time = Date.parse(iso)
  return Number.isNaN(time) ? 0 : time
}

/**
 * Affiliate dashboard data (mobile's four `affiliate*Provider`s). Mobile keeps
 * all four tabs mounted, so each endpoint loads once when the shell appears and
 * is shared by every tab. The same applies here across tab routes.
 */
export const useAffiliateStore = defineStore('affiliate', () => {
  const api = useAffiliateApi()

  const summaryResource = useResource<AffiliateSummary>()
  const referralsResource = useResource<Referral[]>()
  const earningsResource = useResource<AffiliateEarnings>()
  const promosResource = useResource<Promo[]>()

  /** Home's picked range. `null` is "This Month" (the endpoint's own default). */
  const summaryWindow = ref<DateWindow | null>(null)

  /** Home's "Recent Referrals": newest stage change first, top 3. */
  const recentReferrals = computed<Referral[]>(() =>
    [...(referralsResource.state.value.data ?? [])]
      .sort((a, b) => timestampOrOldest(b.stage_updated_at) - timestampOrOldest(a.stage_updated_at))
      .slice(0, 3),
  )

  function fetchSummary(): Promise<void> {
    const range = summaryWindow.value
    return summaryResource.run(() => api.getSummary(range))
  }
  const fetchReferrals = () => referralsResource.run(() => api.getReferrals())
  const fetchEarnings = () => earningsResource.run(() => api.getEarnings())
  const fetchPromos = () => promosResource.run(() => api.getPromos())

  /** Sets Home's range (null clears it back to "This Month") and refetches the summary. */
  function setSummaryWindow(range: DateWindow | null): Promise<void> {
    summaryWindow.value = range
    return fetchSummary()
  }

  /** Shell mount: fetch whatever hasn't loaded yet, in parallel (API_MAP.md §4 row 5). */
  function ensureLoaded(): Promise<void[]> {
    const idle = (r: Resource<unknown>) => !r.loaded && !r.pending
    const pending: Promise<void>[] = []
    if (idle(summaryResource.state.value)) pending.push(fetchSummary())
    if (idle(referralsResource.state.value)) pending.push(fetchReferrals())
    if (idle(earningsResource.state.value)) pending.push(fetchEarnings())
    if (idle(promosResource.state.value)) pending.push(fetchPromos())
    return Promise.all(pending)
  }

  // Pull-to-refresh sets, per tab (API_MAP.md §4 rows 8–10).
  const refreshHome = () => Promise.all([fetchSummary(), fetchReferrals(), fetchPromos()])
  const refreshReferrals = () => Promise.all([fetchReferrals(), fetchPromos()])
  const refreshEarnings = () => fetchEarnings()

  /** Drops everything, e.g. on sign-out, so the next user starts clean. */
  function reset(): void {
    summaryWindow.value = null
    summaryResource.reset()
    referralsResource.reset()
    earningsResource.reset()
    promosResource.reset()
  }

  return {
    summary: summaryResource.state,
    referrals: referralsResource.state,
    earnings: earningsResource.state,
    promos: promosResource.state,
    summaryWindow,
    recentReferrals,
    fetchSummary,
    fetchReferrals,
    fetchEarnings,
    fetchPromos,
    setSummaryWindow,
    ensureLoaded,
    refreshHome,
    refreshReferrals,
    refreshEarnings,
    reset,
  }
})
