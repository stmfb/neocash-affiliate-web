import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ChangePasswordPage from '~/pages/auth/change-password.vue'
import { authSession, createFakeNeocore, fail, ok } from '../support/fake-neocore'
import { useFreshStores } from '../support/stores'

const neocore = createFakeNeocore()

beforeEach(() => {
  useFreshStores()
  localStorage.clear()
})
afterEach(() => neocore.dispose())

/** Signed in on a temporary password, page mounted in the given mode. */
async function mountPage(forced = true) {
  neocore.on('POST', '/auth/login', () => ok(authSession({}, { must_change_password: forced })))
  await useAuthStore().login('aisha@example.com', 'TEMPpass23')
  return mountSuspended(ChangePasswordPage, {
    route: forced ? '/auth/change-password?forced=true' : '/auth/change-password',
  })
}

async function fill(wrapper: VueWrapper, current: string, next: string, confirm: string) {
  const inputs = wrapper.findAll('input[type="password"]')
  await inputs[0]!.setValue(current)
  await inputs[1]!.setValue(next)
  await inputs[2]!.setValue(confirm)
}

async function submit(wrapper: VueWrapper) {
  await wrapper.get('button[type="submit"]').trigger('submit')
  await vi.waitFor(() => expect(wrapper.get('button[type="submit"]').attributes('aria-busy')).toBeUndefined())
}

const fieldErrors = (wrapper: VueWrapper) =>
  wrapper.findAll('input[type="password"]').map((input) => {
    const id = input.attributes('aria-describedby')
    return id ? wrapper.get(`#${id}`).text() : null
  })

describe('forced mode', () => {
  it('has no back button, only the Set password and Sign out actions', async () => {
    const wrapper = await mountPage()
    expect(wrapper.get('h1').text()).toBe('Set your password')
    expect(wrapper.find('button[aria-label="Back"]').exists()).toBe(false)
    expect(wrapper.text()).toContain("You're signed in with a temporary password. Choose a new one to continue.")
    expect(wrapper.get('button[type="submit"]').text()).toBe('Set password')
    expect(wrapper.text()).toContain('Sign out')
  })

  it('validates all three fields before calling the server', async () => {
    const wrapper = await mountPage()
    await fill(wrapper, '', 'short', 'different')
    await submit(wrapper)
    expect(fieldErrors(wrapper)).toEqual(['Enter your current password', 'Use at least 8 characters', 'Passwords do not match'])
    expect(neocore.callsTo('POST', '/auth/password/change')).toHaveLength(0)
  })

  it('leaves the forced state on success', async () => {
    neocore.on('POST', '/auth/password/change', () => ok(authSession({ token: 'access-9', refresh_token: 'refresh-9' })))
    const wrapper = await mountPage()
    expect(useAuthStore().status).toBe('mustChangePassword')
    await fill(wrapper, 'TEMPpass23', 'a-strong-password', 'a-strong-password')
    await submit(wrapper)
    expect(useAuthStore().status).toBe('signedIn')
    expect(neocore.callsTo('POST', '/auth/password/change')[0]?.body).toEqual({
      current_password: 'TEMPpass23',
      new_password: 'a-strong-password',
    })
    expect(useToastStore().current).toBeNull()
  })

  it('puts a wrong current password under that field, with no banner and no refresh', async () => {
    neocore.on('POST', '/auth/password/change', () => fail(401, 'current password is incorrect'))
    neocore.on('POST', '/auth/refresh', () => ok(authSession()))
    const wrapper = await mountPage()
    await fill(wrapper, 'wrong', 'a-strong-password', 'a-strong-password')
    await submit(wrapper)
    expect(fieldErrors(wrapper)[0]).toBe('current password is incorrect')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(neocore.callsTo('POST', '/auth/refresh')).toHaveLength(0)
  })

  it('shows other server errors in the banner', async () => {
    neocore.on('POST', '/auth/password/change', () => fail(400, 'new password must be different from the current password'))
    const wrapper = await mountPage()
    await fill(wrapper, 'TEMPpass23', 'TEMPpass23', 'TEMPpass23')
    await submit(wrapper)
    expect(wrapper.get('[role="alert"]').text()).toBe('new password must be different from the current password')
  })

  it('signs out', async () => {
    const wrapper = await mountPage()
    const signOut = wrapper.findAll('button').find((b) => b.text() === 'Sign out')!
    await signOut.trigger('click')
    expect(useAuthStore().status).toBe('signedOut')
  })
})

describe('voluntary mode', () => {
  it('has a back button and confirms with a toast', async () => {
    neocore.on('POST', '/auth/password/change', () => ok(authSession()))
    const wrapper = await mountPage(false)
    expect(wrapper.get('h1').text()).toBe('Change password')
    expect(wrapper.find('button[aria-label="Back"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Sign out')

    await fill(wrapper, 'old-password', 'a-strong-password', 'a-strong-password')
    await submit(wrapper)
    expect(useToastStore().current?.message).toBe('Password changed.')
  })
})
