import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import EarningsPage from '~/pages/earnings.vue'
import type { AffiliateEarnings } from '~/types/api'
import { serveDashboard } from '../support/dashboard'
import { authSession, createFakeNeocore, fail, ok } from '../support/fake-neocore'
import { useFreshStores } from '../support/stores'

const neocore = createFakeNeocore()

async function signIn(agent = {}) {
  neocore.on('POST', '/auth/login', () => ok(authSession({}, agent)))
  await useAuthStore().login('aisha@example.com', 'secret')
}

beforeEach(async () => {
  useFreshStores()
  localStorage.clear()
  await signIn()
  serveDashboard(neocore)
})
afterEach(() => neocore.dispose())

async function mountLoaded() {
  await useAffiliateStore().ensureLoaded()
  return mountSuspended(EarningsPage)
}

const earnings: AffiliateEarnings = {
  total_kobo: 630000,
  paid_kobo: 405000,
  pending_kobo: 225000,
  records: [
    {
      customer_name: 'Tunde Bakare',
      principal_kobo: 15000000,
      amount_kobo: 225000,
      rate_bps: 150,
      status: 'pending',
      earned_at: '2026-09-20T10:00:00+01:00',
    },
    {
      customer_name: 'Chidinma Okafor',
      principal_kobo: 27000000,
      amount_kobo: 405000,
      rate_bps: 150,
      status: 'paid',
      earned_at: '2026-09-02T10:00:00+01:00',
      paid_at: '2026-09-03T10:00:00+01:00',
    },
  ],
}

describe('earnings tab', () => {
  it('shows dashes and placeholder rows, not ₦0.00 and "No Earnings Yet", before the first response', async () => {
    const wrapper = await mountSuspended(EarningsPage)
    expect(wrapper.get('section').text()).toContain('Total Earnings—')
    expect(wrapper.text()).not.toContain('₦0.00')
    expect(wrapper.find('[aria-label="Loading earnings"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('No Earnings Yet')
  })

  it('shows totals, the session rate, and every record in API order', async () => {
    neocore.on('GET', '/affiliate/earnings', () => ok(earnings))
    const wrapper = await mountLoaded()
    const hero = wrapper.get('section').text()
    expect(hero).toContain('₦6,300.00')
    expect(hero).toContain('₦4,050.00Paid')
    expect(hero).toContain('₦2,250.00Pending')
    expect(hero).toContain('You earn 1.5% whenever an eligible referred loan is disbursed.')
    expect(wrapper.text()).toContain('Commission Records')
    expect(wrapper.findAll('article').map((row) => row.text())).toEqual([
      'Tunde Bakare₦150,000.00 disbursed • 20 Sep₦2,250.00Pending',
      'Chidinma Okafor₦270,000.00 disbursed • 2 Sep₦4,050.00Paid',
    ])
  })

  it('falls back to generic footnote copy without a rate', async () => {
    useFreshStores()
    await signIn({ commission_rate_bps: undefined })
    const wrapper = await mountLoaded()
    expect(wrapper.text()).toContain('You earn commission whenever an eligible referred loan is disbursed.')
  })

  it('shows the empty state when there are no records', async () => {
    const wrapper = await mountLoaded()
    expect(wrapper.get('section').text()).toContain('₦0.00')
    expect(wrapper.text()).toContain('No Earnings Yet')
    expect(wrapper.text()).toContain('Commission history will appear here after referred loans are disbursed.')
  })

  it('shows the server message and dashes when earnings fail to load', async () => {
    neocore.on('GET', '/affiliate/earnings', () => fail(403, 'only available on an affiliate account'))
    const wrapper = await mountLoaded()
    expect(wrapper.get('section').text()).toContain('Total Earnings—')
    expect(wrapper.text()).toContain("Couldn't load earnings")
    expect(wrapper.text()).toContain('only available on an affiliate account')
  })

  it('pull-to-refresh reloads earnings only', async () => {
    const affiliate = useAffiliateStore()
    await affiliate.ensureLoaded()
    neocore.calls.length = 0
    await affiliate.refreshEarnings()
    expect(neocore.calls.map((c) => c.path)).toEqual(['/affiliate/earnings'])
  })
})
