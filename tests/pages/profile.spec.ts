import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProfilePage from '~/pages/profile.vue'
import type { Agent } from '~/types/api'
import { serveDashboard } from '../support/dashboard'
import { authSession, createFakeNeocore, ok } from '../support/fake-neocore'
import { useFreshStores } from '../support/stores'

const neocore = createFakeNeocore()

async function mountAs(agent: Partial<Agent> = {}) {
  useFreshStores()
  neocore.on('POST', '/auth/login', () => ok(authSession({}, agent)))
  await useAuthStore().login('aisha@example.com', 'secret')
  await useAffiliateStore().ensureLoaded()
  return mountSuspended(ProfilePage, { attachTo: document.body })
}

beforeEach(() => {
  localStorage.clear()
  usePromoDialog().open.value = false
  serveDashboard(neocore)
})
afterEach(() => {
  neocore.dispose()
  document.body.innerHTML = ''
})

const infoRows = (wrapper: VueWrapper) =>
  wrapper.findAll('dl > div').map((row) => [row.get('dt').text(), row.get('dd').text()])

describe('profile tab', () => {
  it('shows the account card from the session', async () => {
    const wrapper = await mountAs()
    const card = wrapper.get('section')
    expect(card.get('h2').text()).toBe('Aisha Bello')
    expect(card.findAll('p').map((p) => p.text())).toEqual(['+2348100000000', 'aisha@example.com'])
    expect(infoRows(wrapper)).toEqual([
      ['Role', 'Affiliate Marketer'],
      ['Referral Code', 'AISHA2026'],
      ['Commission Rate', '1.5% per disbursed loan'],
    ])
  })

  it('leaves out a blank phone, a missing code, and shows "—" without a rate', async () => {
    const wrapper = await mountAs({ phone: '', referral_code: undefined, commission_rate_bps: undefined })
    expect(wrapper.get('section').findAll('p').map((p) => p.text())).toEqual(['aisha@example.com'])
    expect(infoRows(wrapper)).toEqual([
      ['Role', 'Affiliate Marketer'],
      ['Commission Rate', '—'],
    ])
  })

  it('prints whole-number rates without ".0"', async () => {
    const wrapper = await mountAs({ commission_rate_bps: 200 })
    expect(infoRows(wrapper).at(-1)).toEqual(['Commission Rate', '2% per disbursed loan'])
  })

  it('shows the last promo, which opens the promo dialog', async () => {
    const wrapper = await mountAs()
    const promo = wrapper.get('[role="button"]')
    expect(promo.attributes('aria-label')).toBe('Business growth. Open promo')
    await promo.trigger('click')
    expect(usePromoDialog().promo.value?.id).toBe('p2')
    expect(usePromoDialog().open.value).toBe(true)
  })

  it('has no promo card when there are no promos', async () => {
    neocore.on('GET', '/promos', () => ok([]))
    const wrapper = await mountAs()
    expect(wrapper.find('[role="button"]').exists()).toBe(false)
  })

  it('asks before logging out, and Cancel keeps the session', async () => {
    const wrapper = await mountAs()
    await wrapper.findAll('button').find((b) => b.text() === 'Log Out')!.trigger('click')
    const dialog = document.querySelector('[role="dialog"]')!
    expect(dialog.textContent).toContain("Log out?You'll need to sign in again to continue.")
    ;(Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Cancel') as HTMLButtonElement).click()
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull())
    expect(useAuthStore().status).toBe('signedIn')
  })

  // The redirect to plain /login is the auth plugin's job (see auth-redirect.spec).
  it('signs out on confirm, as the user\'s own sign-out', async () => {
    const wrapper = await mountAs()
    await wrapper.findAll('button').find((b) => b.text() === 'Log Out')!.trigger('click')
    const dialog = document.querySelector('[role="dialog"]')!
    ;(Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Log Out') as HTMLButtonElement).click()
    await vi.waitFor(() => expect(useAuthStore().status).toBe('signedOut'))
    expect(localStorage.getItem('vm2_refresh_token')).toBeNull()
    expect(useAuthStore().signedOutByUser).toBe(true)
  })
})
