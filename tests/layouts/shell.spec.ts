import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import ShellLayout from '~/layouts/shell.vue'
import { serveDashboard } from '../support/dashboard'
import { authSession, createFakeNeocore, ok } from '../support/fake-neocore'
import { useFreshStores } from '../support/stores'

const neocore = createFakeNeocore()

beforeEach(async () => {
  useFreshStores()
  localStorage.clear()
  neocore.on('POST', '/auth/login', () => ok(authSession()))
  await useAuthStore().login('aisha@example.com', 'secret')
  serveDashboard(neocore)
})
afterEach(() => neocore.dispose())

const mountShell = (route: string) =>
  mountSuspended(ShellLayout, { route, slots: { default: () => h('p', { id: 'tab-content' }, 'tab content') } })

describe('shell layout', () => {
  it.each([
    ['/', 'Home', 'Track referred customers and earnings.'],
    ['/referrals', 'Referrals', 'Customers who used your referral code.'],
    ['/earnings', 'Earnings', 'Commission from disbursed loans.'],
    ['/profile', 'Profile', 'AISHA2026'],
  ])('%s shows the %s header and selects that tab', async (route, title, subtitle) => {
    const wrapper = await mountShell(route)
    expect(wrapper.get('header h1').text()).toBe(title)
    expect(wrapper.get('header p').text()).toBe(subtitle)
    expect(wrapper.get('nav [aria-current="page"]').text()).toBe(title)
    expect(wrapper.find('#tab-content').exists()).toBe(true)
  })

  it('loads all four dashboard endpoints once when it appears', async () => {
    await mountShell('/')
    await vi.waitFor(() => expect(neocore.calls.filter((c) => c.method === 'GET')).toHaveLength(4))
    expect(neocore.calls.filter((c) => c.method === 'GET').map((c) => c.path).sort()).toEqual([
      '/affiliate/earnings',
      '/affiliate/referrals',
      '/affiliate/summary',
      '/promos',
    ])
  })

  it('navigates when a tab is chosen', async () => {
    const wrapper = await mountShell('/')
    const earnings = wrapper.findAll('nav button')[2]!
    // Keyboard activation (detail 0). Pointer taps go through the same select path.
    earnings.element.dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true }))
    await vi.waitFor(() => expect(useRouter().currentRoute.value.path).toBe('/earnings'))
  })
})
