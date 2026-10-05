import { useFreshStores } from '../support/stores'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { AffiliateSummary, Referral } from '~/types/api'
import { authSession, createFakeNeocore, fail, ok } from '../support/fake-neocore'

const neocore = createFakeNeocore()

function summary(overrides: Partial<AffiliateSummary> = {}): AffiliateSummary {
  return {
    from: '2026-09-01T00:00:00+01:00',
    to: '2026-09-25T10:00:00+01:00',
    referrals: 4,
    applications: 2,
    disbursed_count: 1,
    disbursed_kobo: 30000000,
    earnings_kobo: 450000,
    ...overrides,
  }
}

function referral(name: string, stageUpdatedAt: string): Referral {
  return {
    customer_id: name,
    name,
    phone: '+2348000000000',
    signed_up_at: '2026-09-01T00:00:00+01:00',
    stage: 'signed_up',
    stage_updated_at: stageUpdatedAt,
    loan: null,
    commission: null,
  }
}

function serveDashboard() {
  neocore.on('GET', '/affiliate/summary', () => ok(summary()))
  neocore.on('GET', '/affiliate/referrals', () => ok([]))
  neocore.on('GET', '/affiliate/earnings', () => ok({ total_kobo: 0, paid_kobo: 0, pending_kobo: 0, records: [] }))
  neocore.on('GET', '/promos', () => ok([]))
}

beforeEach(async () => {
  useFreshStores()
  localStorage.clear()
  neocore.on('POST', '/auth/login', () => ok(authSession()))
  await useAuthStore().login('aisha@example.com', 'secret')
})
afterEach(() => neocore.dispose())

describe('ensureLoaded', () => {
  it('fetches all four endpoints once, with the Bearer token', async () => {
    serveDashboard()
    const affiliate = useAffiliateStore()

    await affiliate.ensureLoaded()
    await affiliate.ensureLoaded()

    const reads = neocore.calls.filter((c) => c.method === 'GET')
    expect(reads.map((c) => c.path).sort()).toEqual([
      '/affiliate/earnings',
      '/affiliate/referrals',
      '/affiliate/summary',
      '/promos',
    ])
    expect(reads.every((c) => c.authorization === 'Bearer access-1')).toBe(true)
    expect(affiliate.summary).toMatchObject({ loaded: true, pending: false, error: null })
    expect(affiliate.summary.data?.referrals).toBe(4)
  })

  it('records a failure per resource without touching the others', async () => {
    serveDashboard()
    neocore.on('GET', '/affiliate/earnings', () => fail(500, 'could not load your earnings'))
    const affiliate = useAffiliateStore()

    await affiliate.ensureLoaded()

    expect(affiliate.earnings).toMatchObject({ data: null, loaded: true, error: { kind: 'server', message: 'could not load your earnings' } })
    expect(affiliate.promos).toMatchObject({ data: [], error: null })
  })
})

describe('summary window', () => {
  it('sends from/to for a picked range and nothing for "This Month"', async () => {
    serveDashboard()
    const affiliate = useAffiliateStore()

    await affiliate.setSummaryWindow({ from: '2026-09-03', to: '2026-09-25' })
    await affiliate.setSummaryWindow(null)

    expect(neocore.callsTo('GET', '/affiliate/summary').map((c) => c.query)).toEqual([
      { from: '2026-09-03', to: '2026-09-25' },
      {},
    ])
  })

  it('ignores a slow response for a window that has since changed', async () => {
    let releaseSlow!: () => void
    const slow = new Promise<void>((resolve) => (releaseSlow = resolve))
    neocore.on('GET', '/affiliate/summary', async (req) => {
      if (req.query.from === '2026-08-01') {
        await slow
        return ok(summary({ referrals: 111 }))
      }
      return ok(summary({ referrals: 222 }))
    })
    const affiliate = useAffiliateStore()

    const first = affiliate.setSummaryWindow({ from: '2026-08-01', to: '2026-08-31' })
    await affiliate.setSummaryWindow({ from: '2026-09-01', to: '2026-09-25' })
    releaseSlow()
    await first

    expect(affiliate.summary.data?.referrals).toBe(222)
  })
})

describe('recentReferrals', () => {
  it('is the three most recent stage changes, unparseable dates last', async () => {
    neocore.on('GET', '/affiliate/referrals', () =>
      ok([
        referral('old', '2026-09-01T10:00:00+01:00'),
        referral('broken', 'not-a-date'),
        referral('newest', '2026-09-20T10:00:00+01:00'),
        referral('middle', '2026-09-10T10:00:00+01:00'),
      ]),
    )
    const affiliate = useAffiliateStore()
    await affiliate.fetchReferrals()

    expect(affiliate.recentReferrals.map((r) => r.name)).toEqual(['newest', 'middle', 'old'])
    expect(affiliate.referrals.data?.map((r) => r.name)).toEqual(['old', 'broken', 'newest', 'middle'])
  })
})

describe('refresh sets', () => {
  it('Home refreshes summary, referrals and promos. Earnings refreshes only earnings', async () => {
    serveDashboard()
    const affiliate = useAffiliateStore()

    await affiliate.refreshHome()
    const homePaths = neocore.calls.filter((c) => c.method === 'GET').map((c) => c.path).sort()
    neocore.calls.length = 0
    await affiliate.refreshEarnings()

    expect(homePaths).toEqual(['/affiliate/referrals', '/affiliate/summary', '/promos'])
    expect(neocore.calls.map((c) => c.path)).toEqual(['/affiliate/earnings'])
  })
})
