import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import { useFreshStores } from '../support/stores'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from '~/pages/login.vue'
import { authSession, createFakeNeocore, fail, ok } from '../support/fake-neocore'

const neocore = createFakeNeocore()

beforeEach(() => {
  useFreshStores()
  localStorage.clear()
})
afterEach(() => {
  neocore.dispose()
  vi.useRealTimers()
})

/** Login page with hydrate already settled (signed out). */
async function mountLogin() {
  await useAuthStore().hydrate()
  return mountSuspended(LoginPage)
}

async function fill(wrapper: VueWrapper, email: string, password: string) {
  const [emailInput, passwordInput] = wrapper.findAll('input')
  await emailInput!.setValue(email)
  await passwordInput!.setValue(password)
}

const continueButton = (wrapper: VueWrapper) => wrapper.get('button[type="submit"]')

async function submit(wrapper: VueWrapper) {
  await continueButton(wrapper).trigger('submit')
  await vi.waitFor(() => expect(continueButton(wrapper).attributes('aria-busy')).toBeUndefined())
}

describe('Login form', () => {
  it('enables Continue only for a valid email and a password', async () => {
    const wrapper = await mountLogin()
    expect(continueButton(wrapper).attributes('disabled')).toBeDefined()
    await fill(wrapper, 'not-an-email', 'secret')
    expect(continueButton(wrapper).attributes('disabled')).toBeDefined()
    await fill(wrapper, ' aisha@example.com ', '')
    expect(continueButton(wrapper).attributes('disabled')).toBeDefined()
    await fill(wrapper, ' aisha@example.com ', 'secret')
    expect(continueButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('never submits from the keyboard', async () => {
    neocore.on('POST', '/auth/login', () => ok(authSession()))
    const wrapper = await mountLogin()
    await fill(wrapper, 'aisha@example.com', 'secret')
    const [emailInput, passwordInput] = wrapper.findAll('input')
    await emailInput!.trigger('keydown', { key: 'Enter' })
    await passwordInput!.trigger('keydown', { key: 'Enter' })
    expect(neocore.calls).toHaveLength(0)
  })

  it('signs in on Continue', async () => {
    neocore.on('POST', '/auth/login', () => ok(authSession()))
    const wrapper = await mountLogin()
    await fill(wrapper, 'aisha@example.com', 'secret')
    await submit(wrapper)
    expect(useAuthStore().status).toBe('signedIn')
    expect(neocore.callsTo('POST', '/auth/login')).toHaveLength(1)
  })
})

describe('Login errors', () => {
  it.each([
    [401, 'invalid credentials', 'Please, check your input and try again.'],
    [423, 'account temporarily locked, try again later', 'Please wait a few minutes before trying again.'],
    [400, 'email and password are required', 'Please, check your input and try again.'],
  ])('HTTP %i shows a titled banner', async (status, message, subtitle) => {
    neocore.on('POST', '/auth/login', () => fail(status, message))
    const wrapper = await mountLogin()
    await fill(wrapper, 'aisha@example.com', 'secret')
    await submit(wrapper)
    const banner = wrapper.get('[role="alert"]')
    expect(banner.text()).toContain(message)
    expect(banner.text()).toContain(subtitle)
  })

  it('shows a plain banner for 403s, without "check your input"', async () => {
    neocore.on('POST', '/auth/login', () => fail(403, 'this account has been disabled'))
    const wrapper = await mountLogin()
    await fill(wrapper, 'aisha@example.com', 'secret')
    await submit(wrapper)
    const banner = wrapper.get('[role="alert"]')
    expect(banner.text()).toBe('this account has been disabled')
  })

  it('refuses staff accounts with a plain banner', async () => {
    neocore.on('POST', '/auth/login', () => ok(authSession({}, { role: 'staff' })))
    const wrapper = await mountLogin()
    await fill(wrapper, 'agatha@neocash.com', 'secret')
    await submit(wrapper)
    expect(wrapper.get('[role="alert"]').text()).toContain('This web app is for NeoCash affiliate accounts.')
    expect(useAuthStore().status).toBe('signedOut')
  })

  it('puts 400 field errors under their fields', async () => {
    neocore.on('POST', '/auth/login', () => ({
      status: 400,
      body: { message: 'invalid', data: { errors: [{ field: 'password', message: 'password is required' }] } },
    }))
    const wrapper = await mountLogin()
    await fill(wrapper, 'aisha@example.com', 'secret')
    await submit(wrapper)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('password is required')
    expect(wrapper.findAll('input')[1]!.attributes('aria-invalid')).toBe('true')
  })

  it('clears errors as soon as a field changes', async () => {
    neocore.on('POST', '/auth/login', () => fail(401, 'invalid credentials'))
    const wrapper = await mountLogin()
    await fill(wrapper, 'aisha@example.com', 'secret')
    await submit(wrapper)
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    await wrapper.findAll('input')[1]!.setValue('secret2')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })
})

describe('Authenticating gate', () => {
  it('shows "Authenticating…" while the session restores, then the form after 6s', async () => {
    vi.useFakeTimers()
    const wrapper = await mountSuspended(LoginPage) // hydrate not run: still authenticating
    expect(wrapper.text()).toContain('Authenticating')
    expect(wrapper.find('form').exists()).toBe(false)

    await vi.advanceTimersByTimeAsync(6000)
    expect(wrapper.find('form').exists()).toBe(true)
  })
})
