import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useFreshStores } from '../support/stores'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { House, UserSearch, Wallet } from 'lucide-vue-next'
import BaseButton from '~/components/base/Button.vue'
import BaseTextField from '~/components/base/TextField.vue'
import ReferralCard from '~/components/affiliate/ReferralCard.vue'
import EarningsHero from '~/components/affiliate/EarningsHero.vue'
import PromoDialog from '~/components/promo/Dialog.vue'
import LogOutDialog from '~/components/affiliate/LogOutDialog.vue'
import TabBar from '~/components/shell/TabBar.vue'
import type { Promo, Referral } from '~/types/api'

beforeEach(() => useFreshStores())
afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('BaseButton', () => {
  it('blocks clicks and announces busy while loading', async () => {
    const onClick = vi.fn()
    const wrapper = await mountSuspended(BaseButton, {
      props: { loading: true, onClick },
      slots: { default: () => 'Continue' },
    })
    const button = wrapper.get('button')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('aria-busy')).toBe('true')
    await button.trigger('click')
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('BaseTextField', () => {
  it('toggles password visibility and wires the error for assistive tech', async () => {
    const wrapper = await mountSuspended(BaseTextField, {
      props: { modelValue: 'secret', label: 'Password', type: 'password', error: 'Too short' },
    })
    const input = wrapper.get('input')
    expect(input.attributes('type')).toBe('password')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(wrapper.get(`#${input.attributes('aria-describedby')}`).text()).toBe('Too short')

    await wrapper.get('button[aria-label="Show password"]').trigger('click')
    expect(input.attributes('type')).toBe('text')
    expect(wrapper.find('button[aria-label="Hide password"]').exists()).toBe(true)
  })
})

describe('AffiliateReferralCard', () => {
  const referral: Referral = {
    customer_id: 'c1',
    name: 'Tunde Bakare',
    phone: '+2348022223333',
    signed_up_at: '2026-09-01T00:00:00+01:00',
    stage: 'applied',
    stage_updated_at: '2026-09-20T12:00:00+01:00',
    loan: { application_id: 'l1', amount_kobo: 20000000, pending_actions: [{ item: 'bank_statement', status: 'pending' }] },
    commission: { amount_kobo: 300000, status: 'estimated' },
  }

  it('shows only the summary row when collapsed', async () => {
    const wrapper = await mountSuspended(ReferralCard, { props: { referral } })
    expect(wrapper.text()).toContain('Tunde Bakare')
    expect(wrapper.text()).toContain('Application in review • 20 Sep')
    expect(wrapper.text()).toContain('Applied')
    expect(wrapper.find('dl').exists()).toBe(false)
  })

  it('adds phone, loan, commission and the hint when expanded', async () => {
    const wrapper = await mountSuspended(ReferralCard, { props: { referral, expanded: true } })
    const rows = wrapper.findAll('dl > div').map((row) => [row.get('dt').text(), row.get('dd').text()])
    expect(rows).toEqual([
      ['Phone Number', '+2348022223333'],
      ['Loan Amount', '₦200,000.00'],
      ['Commission', '₦3,000.00 • Estimated'],
    ])
    expect(wrapper.text()).toContain('Bank statement is pending.')
  })
})

describe('AffiliateEarningsHero', () => {
  it('uses the session rate in the footnote, or generic copy without one', async () => {
    const withRate = await mountSuspended(EarningsHero, {
      props: { totalKobo: 630000, paidKobo: 405000, pendingKobo: 225000, ratePercent: 1.5 },
    })
    expect(withRate.text()).toContain('₦6,300.00')
    expect(withRate.text()).toContain('You earn 1.5% whenever an eligible referred loan is disbursed.')

    const withoutRate = await mountSuspended(EarningsHero, {
      props: { totalKobo: 0, paidKobo: 0, pendingKobo: 0, ratePercent: null },
    })
    expect(withoutRate.text()).toContain('You earn commission whenever an eligible referred loan is disbursed.')
  })
})

describe('PromoDialog', () => {
  const promo: Promo = {
    id: 'p1',
    title: 'Fast Payday Loans',
    subtitle: 'Quick offers.',
    image_url: '',
    share_text: 'Get a payday loan in minutes: https://neocash.com/signup?ref=AISHA2026',
    link: '',
  }

  it('copies share_text exactly as sent and toasts it', async () => {
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    await mountSuspended(PromoDialog, { props: { open: true, promo }, attachTo: document.body })

    const dialog = document.querySelector('[role="dialog"]')!
    expect(dialog.textContent).toContain('Official promo')
    const share = Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent?.includes('Share Promo'))!
    share.click()
    await vi.waitFor(() => expect(useToastStore().current?.message).toBe(`Copied ${promo.share_text}`))
    expect(writeText).toHaveBeenCalledWith(promo.share_text)
  })

  it('closes on Escape', async () => {
    const wrapper = await mountSuspended(PromoDialog, { props: { open: true, promo }, attachTo: document.body })
    document.querySelector('[role="dialog"]')!.parentElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await vi.waitFor(() => expect(wrapper.emitted('update:open')?.[0]).toEqual([false]))
  })
})

describe('AffiliateLogOutDialog', () => {
  it('emits confirm and closes on Log Out', async () => {
    const wrapper = await mountSuspended(LogOutDialog, { props: { open: true }, attachTo: document.body })
    const logOut = Array.from(document.querySelectorAll('[role="dialog"] button')).find((b) => b.textContent?.includes('Log Out')) as HTMLButtonElement
    logOut.click()
    await vi.waitFor(() => expect(wrapper.emitted('confirm')).toHaveLength(1))
    expect(wrapper.emitted('update:open')?.[0]).toEqual([false])
  })
})

describe('ShellTabBar', () => {
  const items = [
    { key: 'home', label: 'Home', icon: House },
    { key: 'referrals', label: 'Referrals', icon: UserSearch },
    { key: 'earnings', label: 'Earnings', icon: Wallet },
  ]

  it('marks the selected tab and selects from the keyboard', async () => {
    const wrapper = await mountSuspended(TabBar, { props: { items, selected: 'home' } })
    expect(wrapper.get('[aria-current="page"]').text()).toBe('Home')

    // Keyboard activation arrives as a click with detail 0.
    const earnings = wrapper.findAll('button')[2]!
    await earnings.element.dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true }))
    expect(wrapper.emitted('select')?.[0]).toEqual(['earnings'])
  })

  it('does not re-select the current tab', async () => {
    const wrapper = await mountSuspended(TabBar, { props: { items, selected: 'home' } })
    await wrapper.findAll('button')[0]!.element.dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true }))
    expect(wrapper.emitted('select')).toBeUndefined()
  })
})
