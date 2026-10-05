import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DateRangePage from '~/pages/date-range.vue'
import { serveDashboard } from '../support/dashboard'
import { authSession, createFakeNeocore, ok } from '../support/fake-neocore'
import { useFreshStores } from '../support/stores'

const neocore = createFakeNeocore()

beforeEach(async () => {
  // 10:00 in Lagos on Sunday 27 September 2026. Only Date is faked, so fetches still run.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-27T09:00:00Z'))
  useFreshStores()
  localStorage.clear()
  neocore.on('POST', '/auth/login', () => ok(authSession()))
  await useAuthStore().login('aisha@example.com', 'secret')
  serveDashboard(neocore)
})
afterEach(() => {
  vi.useRealTimers()
  neocore.dispose()
  document.body.innerHTML = ''
})

const mountPicker = () => mountSuspended(DateRangePage, { route: '/date-range', attachTo: document.body })

const day = (wrapper: VueWrapper, iso: string) => wrapper.get(`[data-day="${iso}"]`)
const hint = (wrapper: VueWrapper) => wrapper.get('[aria-live="polite"]').text()
const fromTo = (wrapper: VueWrapper) => wrapper.findAll('dd').map((dd) => dd.text())
const confirmButton = (wrapper: VueWrapper) => wrapper.findAll('button').find((b) => b.text() === 'Confirm Dates')!

describe('select date range', () => {
  it('opens on this month with nothing picked', async () => {
    const wrapper = await mountPicker()
    expect(wrapper.get('h1').text()).toBe('Select Date Range')
    expect(hint(wrapper)).toBe('Tap a start date')
    expect(wrapper.get('[role="group"]').attributes('aria-labelledby')).toBeTruthy()
    expect(wrapper.text()).toContain('September 2026')
    expect(fromTo(wrapper)).toEqual(['___', '___'])
    expect(confirmButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('allows 1 January two years back through today', async () => {
    const wrapper = await mountPicker()
    expect(day(wrapper, '2026-09-27').attributes('aria-current')).toBe('date')
    expect(day(wrapper, '2026-09-27').attributes('disabled')).toBeUndefined()
    expect(day(wrapper, '2026-09-28').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[aria-label="Next month"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[aria-label="Previous month"]').attributes('disabled')).toBeUndefined()
  })

  it('stops paging back at January two years ago', async () => {
    useAffiliateStore().summaryWindow = { from: '2024-01-05', to: '2024-01-09' }
    const wrapper = await mountPicker()
    expect(wrapper.text()).toContain('January 2024')
    expect(wrapper.get('[aria-label="Previous month"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[aria-label="Next month"]').trigger('click')
    expect(wrapper.text()).toContain('February 2024')
  })

  it('takes a start and an end, swapping them when the end is earlier', async () => {
    const wrapper = await mountPicker()
    await day(wrapper, '2026-09-25').trigger('click')
    expect(hint(wrapper)).toBe('Now tap your end date')
    expect(fromTo(wrapper)).toEqual(['Sep 25, 2026', '___'])

    await day(wrapper, '2026-09-03').trigger('click')
    expect(hint(wrapper)).toBe('Date range selected')
    expect(fromTo(wrapper)).toEqual(['Sep 3, 2026', 'Sep 25, 2026'])
    expect(day(wrapper, '2026-09-03').attributes('aria-label')).toBe('Thursday, 3 September 2026, start date')
    expect(day(wrapper, '2026-09-10').attributes('aria-label')).toBe('Thursday, 10 September 2026, in selected range')
    expect(day(wrapper, '2026-09-25').attributes('aria-label')).toBe('Friday, 25 September 2026, end date')
    expect(confirmButton(wrapper).attributes('disabled')).toBeUndefined()

    // A third tap starts over.
    await day(wrapper, '2026-09-12').trigger('click')
    expect(fromTo(wrapper)).toEqual(['Sep 12, 2026', '___'])
  })

  it('opens on the current range when one is set', async () => {
    useAffiliateStore().summaryWindow = { from: '2026-08-03', to: '2026-08-20' }
    const wrapper = await mountPicker()
    expect(wrapper.text()).toContain('August 2026')
    expect(hint(wrapper)).toBe('Date range selected')
    expect(fromTo(wrapper)).toEqual(['Aug 3, 2026', 'Aug 20, 2026'])
  })

  it('Confirm Dates sets the summary window, refetches the summary and goes back', async () => {
    const wrapper = await mountPicker()
    await day(wrapper, '2026-09-03').trigger('click')
    await day(wrapper, '2026-09-25').trigger('click')
    neocore.calls.length = 0
    await confirmButton(wrapper).trigger('click')

    expect(useAffiliateStore().summaryWindow).toEqual({ from: '2026-09-03', to: '2026-09-25' })
    await vi.waitFor(() => expect(neocore.callsTo('GET', '/affiliate/summary')).toHaveLength(1))
    expect(neocore.calls[0]?.query).toEqual({ from: '2026-09-03', to: '2026-09-25' })
    await vi.waitFor(() => expect(useRouter().currentRoute.value.path).toBe('/'))
  })

  it('Back leaves the range untouched', async () => {
    const wrapper = await mountPicker()
    await day(wrapper, '2026-09-03').trigger('click')
    await wrapper.get('[aria-label="Back"]').trigger('click')
    await vi.waitFor(() => expect(useRouter().currentRoute.value.path).toBe('/'))
    expect(useAffiliateStore().summaryWindow).toBeNull()
  })

  it('moves between days with the keyboard, one tab stop, crossing months', async () => {
    const wrapper = await mountPicker()
    // Today is the tab stop when nothing is picked.
    expect(wrapper.findAll('[data-day][tabindex="0"]').map((b) => b.attributes('data-day'))).toEqual(['2026-09-27'])

    const press = async (key: string) => {
      const focused = document.activeElement as HTMLElement
      focused.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
      await vi.waitFor(() => expect(document.activeElement).not.toBe(focused))
    }

    ;(day(wrapper, '2026-09-27').element as HTMLElement).focus()
    await press('ArrowLeft')
    expect(document.activeElement?.getAttribute('data-day')).toBe('2026-09-26')
    await press('ArrowUp')
    expect(document.activeElement?.getAttribute('data-day')).toBe('2026-09-19')
    await press('PageUp')
    expect(document.activeElement?.getAttribute('data-day')).toBe('2026-08-19')
    expect(wrapper.text()).toContain('August 2026')

    // Days past today are out of reach.
    ;(document.activeElement as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }))
    await vi.waitFor(() => expect(document.activeElement?.getAttribute('data-day')).toBe('2026-09-19'))
    ;(document.activeElement as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }))
    await vi.waitFor(() => expect(document.activeElement?.getAttribute('data-day')).toBe('2026-09-27'))
  })
})
