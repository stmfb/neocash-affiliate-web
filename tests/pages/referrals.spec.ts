import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ReferralsPage from '~/pages/referrals.vue'
import { promoFixture, referralFixture, serveDashboard } from '../support/dashboard'
import { authSession, createFakeNeocore, fail, ok } from '../support/fake-neocore'
import { useFreshStores } from '../support/stores'

const neocore = createFakeNeocore()

beforeEach(async () => {
  useFreshStores()
  localStorage.clear()
  usePromoDialog().open.value = false
  neocore.on('POST', '/auth/login', () => ok(authSession()))
  await useAuthStore().login('aisha@example.com', 'secret')
  serveDashboard(neocore)
})
afterEach(() => neocore.dispose())

/** Mounts after the shell's fan-out has loaded (the layout does this in the app). */
async function mountLoaded() {
  await useAffiliateStore().ensureLoaded()
  return mountSuspended(ReferralsPage)
}

const cardNames = (wrapper: Awaited<ReturnType<typeof mountLoaded>>) => wrapper.findAll('article h3').map((h) => h.text())

describe('referrals tab', () => {
  it('shows placeholder cards, not "No Referrals Yet", before the first response', async () => {
    const wrapper = await mountSuspended(ReferralsPage)
    expect(wrapper.find('[aria-label="Loading referrals"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('No Referrals Yet')
  })

  it('lists every referral expanded, in API order', async () => {
    const wrapper = await mountLoaded()
    expect(wrapper.get('h2').text()).toBe('Customers')
    expect(cardNames(wrapper)).toEqual(['Oldest', 'Newest', 'Middle', 'Second'])
    expect(wrapper.findAll('article dl')).toHaveLength(4)
    expect(wrapper.find('[aria-label="Loading referrals"]').exists()).toBe(false)
  })

  it('pins the first promo above the sheet, and it opens the promo dialog', async () => {
    const wrapper = await mountLoaded()
    const promo = wrapper.get('[role="button"]')
    expect(promo.attributes('aria-label')).toBe('Fast Payday Loans. Open promo')
    expect(promo.element.parentElement!.classList).toContain('sticky')
    await promo.trigger('click')
    const dialog = usePromoDialog()
    expect(dialog.open.value).toBe(true)
    expect(dialog.promo.value?.id).toBe('p1')
  })

  it('has no promo layer when there are no promos', async () => {
    neocore.on('GET', '/promos', () => ok([]))
    const wrapper = await mountLoaded()
    expect(wrapper.find('[role="button"]').exists()).toBe(false)
  })

  it('shows the empty state when there are no referrals', async () => {
    neocore.on('GET', '/affiliate/referrals', () => ok([]))
    const wrapper = await mountLoaded()
    expect(wrapper.text()).toContain('No Referrals Yet')
    expect(wrapper.text()).toContain('Share your referral code. Customers will show here once they sign up through NeoCash.')
    expect(wrapper.find('h2').exists()).toBe(false)
  })

  it('shows the server message when referrals fail to load', async () => {
    neocore.on('GET', '/affiliate/referrals', () => fail(403, 'only available on an affiliate account'))
    const wrapper = await mountLoaded()
    expect(wrapper.text()).toContain("Couldn't load referrals")
    expect(wrapper.text()).toContain('only available on an affiliate account')
    expect(wrapper.text()).not.toContain('No Referrals Yet')
  })

  it('fades "Customers" over the 40px before it reaches the top', async () => {
    const wrapper = await mountLoaded()
    const heading = wrapper.get('h2')
    const scroller = wrapper.get('.overflow-y-auto').element as HTMLElement
    const scrollTo = async (top: number) => {
      scroller.scrollTop = top
      scroller.dispatchEvent(new Event('scroll'))
      await nextTick()
    }
    // With a promo the heading starts 170 + 24 = 194px down.
    expect(heading.attributes('style')).toContain('opacity: 1')
    await scrollTo(154)
    expect(heading.attributes('style')).toContain('opacity: 1')
    await scrollTo(174)
    expect(heading.attributes('style')).toContain('opacity: 0.5')
    await scrollTo(250)
    expect(heading.attributes('style')).toContain('opacity: 0')
  })

  it('starts fully opaque without a promo (mobile rests at 60%)', async () => {
    neocore.on('GET', '/promos', () => ok([]))
    const wrapper = await mountLoaded()
    expect(wrapper.get('h2').attributes('style')).toContain('opacity: 1')
  })

  it('pull-to-refresh reloads referrals and promos only', async () => {
    const affiliate = useAffiliateStore()
    await affiliate.ensureLoaded()
    neocore.calls.length = 0
    neocore.on('GET', '/affiliate/referrals', () => ok([referralFixture('Fresh', '2026-09-26T10:00:00+01:00')]))
    neocore.on('GET', '/promos', () => ok([promoFixture('p9', 'New promo')]))
    await affiliate.refreshReferrals()
    expect(neocore.calls.map((c) => c.path).sort()).toEqual(['/affiliate/referrals', '/promos'])
    const wrapper = await mountSuspended(ReferralsPage)
    await vi.waitFor(() => expect(cardNames(wrapper)).toEqual(['Fresh']))
  })
})
