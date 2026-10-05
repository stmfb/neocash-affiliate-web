import { useFreshStores } from '../support/stores'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authSession, createFakeNeocore, fail, ok } from '../support/fake-neocore'

const neocore = createFakeNeocore()

beforeEach(() => {
  useFreshStores()
  localStorage.clear()
})
afterEach(() => {
  neocore.dispose()
  vi.restoreAllMocks()
})

describe('login', () => {
  it('keeps the access token in memory and persists refresh token + profile', async () => {
    neocore.on('POST', '/auth/login', () => ok(authSession()))
    const auth = useAuthStore()

    const result = await auth.login('  aisha@example.com ', 'secret')

    expect(result.ok).toBe(true)
    expect(auth.status).toBe('signedIn')
    expect(auth.accessToken).toBe('access-1')
    expect(localStorage.getItem('vm2_refresh_token')).toBe('refresh-1')
    const cached = JSON.parse(localStorage.getItem('vm2_session')!)
    expect(cached.agent.referral_code).toBe('AISHA2026')
    expect(cached).not.toHaveProperty('token')
    expect(cached).not.toHaveProperty('refresh_token')
    expect(auth.commissionRatePercent).toBe(1.5)
  })

  it('sends a trimmed email and a stable device id, with no Authorization header', async () => {
    neocore.on('POST', '/auth/login', () => ok(authSession()))
    const auth = useAuthStore()
    await auth.login(' aisha@example.com', 'secret')
    await auth.login('aisha@example.com', 'secret')

    const [first, second] = neocore.callsTo('POST', '/auth/login')
    expect(first?.body).toMatchObject({ email: 'aisha@example.com', password: 'secret' })
    expect((first?.body as { device_id: string }).device_id).toBeTruthy()
    expect((second?.body as { device_id: string }).device_id).toBe((first?.body as { device_id: string }).device_id)
    expect(first?.authorization).toBeNull()
  })

  it('pins a temporary-password session to mustChangePassword', async () => {
    neocore.on('POST', '/auth/login', () => ok(authSession({}, { must_change_password: true })))
    const auth = useAuthStore()
    await auth.login('aisha@example.com', 'TEMPpass23')
    expect(auth.status).toBe('mustChangePassword')
    expect(auth.isAuthenticated).toBe(false)
  })

  it('refuses staff accounts without persisting anything', async () => {
    neocore.on('POST', '/auth/login', () =>
      ok(authSession({}, { role: 'staff', referral_code: undefined, commission_rate_bps: undefined })),
    )
    const auth = useAuthStore()
    const result = await auth.login('agatha@neocash.com', 'secret')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.failure.kind).toBe('forbidden')
    expect(auth.accessToken).toBeNull()
    expect(localStorage.getItem('vm2_refresh_token')).toBeNull()
  })

  it("surfaces the server's message on bad credentials", async () => {
    neocore.on('POST', '/auth/login', () => fail(401, 'invalid credentials'))
    const result = await useAuthStore().login('aisha@example.com', 'nope')
    expect(result).toMatchObject({ ok: false, failure: { kind: 'auth', message: 'invalid credentials' } })
  })

  it('refuses to try while offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    neocore.on('POST', '/auth/login', () => ok(authSession()))
    const result = await useAuthStore().login('aisha@example.com', 'secret')
    expect(result).toMatchObject({ ok: false, failure: { kind: 'network', message: 'You must be online to sign in.' } })
    expect(neocore.calls).toHaveLength(0)
  })
})

describe('hydrate', () => {
  it('is signed out when no refresh token is stored', async () => {
    const auth = useAuthStore()
    expect(auth.status).toBe('authenticating')
    await auth.hydrate()
    expect(auth.status).toBe('signedOut')
    expect(neocore.calls).toHaveLength(0)
  })

  it('restores the session through /auth/refresh and runs once', async () => {
    localStorage.setItem('vm2_refresh_token', 'refresh-0')
    neocore.on('POST', '/auth/refresh', () => ok(authSession({ token: 'access-2', refresh_token: 'refresh-2' })))
    const auth = useAuthStore()

    await Promise.all([auth.hydrate(), auth.hydrate()])

    expect(neocore.callsTo('POST', '/auth/refresh')).toHaveLength(1)
    expect(neocore.calls[0]?.body).toEqual({ refresh_token: 'refresh-0' })
    expect(auth.status).toBe('signedIn')
    expect(auth.accessToken).toBe('access-2')
    expect(localStorage.getItem('vm2_refresh_token')).toBe('refresh-2')
  })

  it('goes stale (not signed out) when the refresh is rejected and a profile is cached', async () => {
    localStorage.setItem('vm2_refresh_token', 'revoked')
    const { token: _t, refresh_token: _r, ...profile } = authSession()
    localStorage.setItem('vm2_session', JSON.stringify(profile))
    neocore.on('POST', '/auth/refresh', () => fail(401, 'session revoked, please log in'))
    const auth = useAuthStore()

    await auth.hydrate()

    expect(auth.status).toBe('stale')
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.agent?.name).toBe('Aisha Bello')
  })

  it('stays signed in on a server error: offline or 5xx is not stale', async () => {
    localStorage.setItem('vm2_refresh_token', 'refresh-0')
    const { token: _t, refresh_token: _r, ...profile } = authSession()
    localStorage.setItem('vm2_session', JSON.stringify(profile))
    neocore.on('POST', '/auth/refresh', () => fail(503, 'unavailable'))
    const auth = useAuthStore()

    await auth.hydrate()

    expect(auth.status).toBe('signedIn')
  })

  it('ends the session when a refresh reveals the account is now staff', async () => {
    localStorage.setItem('vm2_refresh_token', 'refresh-0')
    const { token: _t, refresh_token: _r, ...profile } = authSession()
    localStorage.setItem('vm2_session', JSON.stringify(profile))
    neocore.on('POST', '/auth/refresh', () => ok(authSession({}, { role: 'staff' })))
    const auth = useAuthStore()

    await auth.hydrate()

    expect(auth.status).toBe('signedOut')
    expect(localStorage.getItem('vm2_refresh_token')).toBeNull()
  })

  it('signs out when the refresh fails and there is no cached profile', async () => {
    localStorage.setItem('vm2_refresh_token', 'revoked')
    neocore.on('POST', '/auth/refresh', () => fail(401, 'invalid or expired refresh token'))
    const auth = useAuthStore()
    await auth.hydrate()
    expect(auth.status).toBe('signedOut')
    expect(localStorage.getItem('vm2_refresh_token')).toBeNull()
  })
})

describe('changePassword', () => {
  it('adopts the fresh session and leaves the forced state', async () => {
    neocore.on('POST', '/auth/login', () => ok(authSession({}, { must_change_password: true })))
    neocore.on('POST', '/auth/password/change', () => ok(authSession({ token: 'access-9', refresh_token: 'refresh-9' })))
    const auth = useAuthStore()
    await auth.login('aisha@example.com', 'TEMPpass23')

    const result = await auth.changePassword('TEMPpass23', 'a-strong-password')

    expect(result.ok).toBe(true)
    expect(auth.status).toBe('signedIn')
    expect(auth.accessToken).toBe('access-9')
    expect(localStorage.getItem('vm2_refresh_token')).toBe('refresh-9')
    const [call] = neocore.callsTo('POST', '/auth/password/change')
    expect(call?.authorization).toBe('Bearer access-1')
    expect(call?.body).toEqual({ current_password: 'TEMPpass23', new_password: 'a-strong-password' })
  })

  it('does not refresh-and-replay on a wrong current password', async () => {
    neocore.on('POST', '/auth/login', () => ok(authSession({}, { must_change_password: true })))
    neocore.on('POST', '/auth/password/change', () => fail(401, 'current password is incorrect'))
    neocore.on('POST', '/auth/refresh', () => ok(authSession()))
    const auth = useAuthStore()
    await auth.login('aisha@example.com', 'TEMPpass23')

    const result = await auth.changePassword('wrong', 'a-strong-password')

    expect(result).toMatchObject({ ok: false, failure: { kind: 'auth', message: 'current password is incorrect' } })
    expect(neocore.callsTo('POST', '/auth/refresh')).toHaveLength(0)
    expect(neocore.callsTo('POST', '/auth/password/change')).toHaveLength(1)
  })
})

describe('signOut', () => {
  it('clears tokens, the cached profile and affiliate data, without calling the server', async () => {
    neocore.on('POST', '/auth/login', () => ok(authSession()))
    neocore.on('GET', '/promos', () => ok([{ id: 'p1' }]))
    const auth = useAuthStore()
    const affiliate = useAffiliateStore()
    await auth.login('aisha@example.com', 'secret')
    await affiliate.fetchPromos()
    const callsBefore = neocore.calls.length

    auth.signOut()

    expect(auth.status).toBe('signedOut')
    expect(auth.accessToken).toBeNull()
    expect(localStorage.getItem('vm2_refresh_token')).toBeNull()
    expect(localStorage.getItem('vm2_session')).toBeNull()
    expect(affiliate.promos.data).toBeNull()
    expect(neocore.calls).toHaveLength(callsBefore)
  })
})
