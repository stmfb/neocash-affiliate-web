import type { AffiliateEarnings, AffiliateSummary, Promo, Referral } from '~/types/api'
import { ok, type createFakeNeocore } from './fake-neocore'

type FakeNeocore = ReturnType<typeof createFakeNeocore>

export function summaryFixture(overrides: Partial<AffiliateSummary> = {}): AffiliateSummary {
  return {
    from: '2026-09-01T00:00:00+01:00',
    to: '2026-09-25T10:00:00+01:00',
    referrals: 4,
    applications: 2,
    disbursed_count: 1,
    disbursed_kobo: 300000000000,
    earnings_kobo: 450000,
    ...overrides,
  }
}

export function referralFixture(name: string, stageUpdatedAt: string, overrides: Partial<Referral> = {}): Referral {
  return {
    customer_id: name,
    name,
    phone: '+2348000000000',
    signed_up_at: '2026-09-01T00:00:00+01:00',
    stage: 'signed_up',
    stage_updated_at: stageUpdatedAt,
    loan: null,
    commission: null,
    ...overrides,
  }
}

export function promoFixture(id: string, title: string): Promo {
  return { id, title, subtitle: `${title} subtitle`, image_url: '', share_text: `${title} share`, link: '' }
}

export const earningsFixture: AffiliateEarnings = { total_kobo: 0, paid_kobo: 0, pending_kobo: 0, records: [] }

/** Serves all four dashboard reads with sensible defaults. Override any afterwards with `neocore.on`. */
export function serveDashboard(neocore: FakeNeocore): void {
  neocore.on('GET', '/affiliate/summary', () => ok(summaryFixture()))
  neocore.on('GET', '/affiliate/referrals', () =>
    ok([
      referralFixture('Oldest', '2026-09-01T10:00:00+01:00'),
      referralFixture('Newest', '2026-09-20T10:00:00+01:00'),
      referralFixture('Middle', '2026-09-10T10:00:00+01:00'),
      referralFixture('Second', '2026-09-15T10:00:00+01:00'),
    ]),
  )
  neocore.on('GET', '/affiliate/earnings', () => ok(earningsFixture))
  neocore.on('GET', '/promos', () => ok([promoFixture('p1', 'Fast Payday Loans'), promoFixture('p2', 'Business growth')]))
}
