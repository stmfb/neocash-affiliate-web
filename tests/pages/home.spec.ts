import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HomePage from '~/pages/index.vue'
import { serveDashboard, summaryFixture } from '../support/dashboard'
import { authSession, createFakeNeocore, fail, ok } from '../support/fake-neocore'
import { useFreshStores } from '../support/stores'

const neocore = createFakeNeocore()

beforeEach(async () => {
  useFreshStores()
  localStorage.clear()
  neocore.on('POST', '/auth/login', () => ok(authSession()))
  await useAuthStore().login('aisha@example.com', 'secret')
})
afterEach(() => neocore.dispose())

/** Mounts Home after the shell's fan-out has loaded (the layout does this in the app). */
async function mountLoaded() {
  await useAffiliateStore().ensureLoaded()
  return mountSuspended(HomePage)
}

const tileValues = (wrapper: VueWrapper) =>
  wrapper.findAll('.grid > div').map((tile) => tile.findAll('p, button').map((el) => el.text()).filter(Boolean).join(' / '))

describe('before data arrives', () => {
  it('shows the promo loading card and dashes in every tile, with no Recent Referrals', async () => {
    const wrapper = await mountSuspended(HomePage)
    expect(wrapper.find('[aria-label="Loading promos"]').exists()).toBe(true)
    expect(wrapper.findAll('.grid > div').map((tile) => tile.text())).toEqual([
      '—Referrals',
      '—Applications',
      '—Disbursed',
      '—Earnings',
    ])
    expect(wrapper.text()).not.toContain('Recent Referrals')
  })
})

describe('loaded', () => {
  beforeEach(() => serveDashboard(neocore))

  it('shows the referral code, promos, summary tiles and the three most recent referrals', async () => {
    const wrapper = await mountLoaded()
    expect(wrapper.text()).toContain('Your Referral Code')
    expect(wrapper.text()).toContain('AISHA2026')
    expect(wrapper.find('[aria-roledescription="carousel"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Loading promos"]').exists()).toBe(false)
    expect(tileValues(wrapper)).toEqual([
      '4 / Referrals',
      '2 / Applications',
      '₦3B / Disbursed • 1 loan',
      '₦4,500.00 / Earnings',
    ])
    expect(wrapper.findAll('article h3').map((h) => h.text())).toEqual(['Newest', 'Second', 'Middle'])
  })

  it('pluralizes the disbursed label', async () => {
    neocore.on('GET', '/affiliate/summary', () => ok(summaryFixture({ disbursed_count: 0, disbursed_kobo: 0 })))
    const wrapper = await mountLoaded()
    expect(wrapper.text()).toContain('Disbursed • 0 loans')
  })

  it('hides the referral code card when the account has none', async () => {
    useFreshStores()
    neocore.on('POST', '/auth/login', () => ok(authSession({}, { referral_code: undefined })))
    await useAuthStore().login('aisha@example.com', 'secret')
    const wrapper = await mountLoaded()
    expect(wrapper.text()).not.toContain('Your Referral Code')
  })

  it('shows no carousel and no reserved space when there are no promos', async () => {
    neocore.on('GET', '/promos', () => ok([]))
    const wrapper = await mountLoaded()
    expect(wrapper.find('[aria-roledescription="carousel"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Loading promos"]').exists()).toBe(false)
  })

  it('omits Recent Referrals when there are none', async () => {
    neocore.on('GET', '/affiliate/referrals', () => ok([]))
    const wrapper = await mountLoaded()
    expect(wrapper.text()).not.toContain('Recent Referrals')
  })
})

describe('failures', () => {
  beforeEach(() => serveDashboard(neocore))

  it('notes a summary failure above dashed tiles', async () => {
    neocore.on('GET', '/affiliate/summary', () => fail(403, 'only available on an affiliate account'))
    const wrapper = await mountLoaded()
    expect(wrapper.get('[role="alert"]').text()).toBe('only available on an affiliate account')
    expect(tileValues(wrapper)[0]).toBe('— / Referrals')
  })

  it('keeps the Recent Referrals heading and shows the error under it', async () => {
    neocore.on('GET', '/affiliate/referrals', () => fail(403, 'could not load your referrals'))
    const wrapper = await mountLoaded()
    expect(wrapper.text()).toContain('Recent Referrals')
    expect(wrapper.get('[role="alert"]').text()).toBe('could not load your referrals')
  })
})

describe('summary period', () => {
  beforeEach(() => serveDashboard(neocore))

  it('labels the default "This Month" and links to the picker', async () => {
    const wrapper = await mountLoaded()
    const link = wrapper.get('a[href="/date-range"]')
    expect(link.text()).toBe('This Month')
    expect(wrapper.find('[aria-label="Clear date range"]').exists()).toBe(false)
  })

  it('shows a picked range and clears it back to month-to-date', async () => {
    const affiliate = useAffiliateStore()
    await affiliate.setSummaryWindow({ from: '2026-09-03', to: '2026-09-25' })
    const wrapper = await mountLoaded()
    expect(wrapper.get('a[href="/date-range"]').text()).toBe('3 Sep – 25 Sep')

    neocore.calls.length = 0
    await wrapper.get('[aria-label="Clear date range"]').trigger('click')
    await vi.waitFor(() => expect(neocore.callsTo('GET', '/affiliate/summary')).toHaveLength(1))
    expect(neocore.calls[0]?.query).toEqual({})
    expect(wrapper.get('a[href="/date-range"]').text()).toBe('This Month')
  })
})

describe('View all', () => {
  it('goes to the Referrals tab', async () => {
    serveDashboard(neocore)
    const wrapper = await mountLoaded()
    const viewAll = wrapper.findAll('button').find((b) => b.text() === 'View all')!
    await viewAll.trigger('click')
    await vi.waitFor(() => expect(useRouter().currentRoute.value.path).toBe('/referrals'))
  })
})
