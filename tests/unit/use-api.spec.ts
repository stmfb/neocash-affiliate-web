import { useFreshStores } from '../support/stores'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { authSession, createFakeNeocore, fail, ok } from '../support/fake-neocore'

const neocore = createFakeNeocore()

/** Signed in with an access token the server will reject as expired. */
async function signInWithExpiredToken() {
  neocore.on('POST', '/auth/login', () => ok(authSession({ token: 'expired', refresh_token: 'refresh-1' })))
  const auth = useAuthStore()
  await auth.login('aisha@example.com', 'secret')
  return auth
}

/** Rejects the expired token and accepts the fresh one. */
function promosRequireFreshToken() {
  neocore.on('GET', '/promos', (req) =>
    req.authorization === 'Bearer fresh' ? ok([{ id: 'p1' }]) : fail(401, 'invalid or expired token'),
  )
}

beforeEach(() => {
  useFreshStores()
  localStorage.clear()
})
afterEach(() => neocore.dispose())

describe('useApi 401 handling (API_MAP.md §2.5)', () => {
  it('refreshes, then replays the request once with the new token', async () => {
    const auth = await signInWithExpiredToken()
    promosRequireFreshToken()
    neocore.on('POST', '/auth/refresh', () => ok(authSession({ token: 'fresh', refresh_token: 'refresh-2' })))

    await expect(useAffiliateApi().getPromos()).resolves.toEqual([{ id: 'p1' }])

    expect(neocore.callsTo('GET', '/promos').map((c) => c.authorization)).toEqual(['Bearer expired', 'Bearer fresh'])
    expect(neocore.callsTo('POST', '/auth/refresh')[0]?.body).toEqual({ refresh_token: 'refresh-1' })
    expect(auth.accessToken).toBe('fresh')
    expect(auth.status).toBe('signedIn')
  })

  it('shares one refresh between concurrent 401s', async () => {
    await signInWithExpiredToken()
    promosRequireFreshToken()
    neocore.on('GET', '/affiliate/referrals', (req) =>
      req.authorization === 'Bearer fresh' ? ok([]) : fail(401, 'invalid or expired token'),
    )
    neocore.on('POST', '/auth/refresh', () => ok(authSession({ token: 'fresh' })))
    const api = useAffiliateApi()

    await Promise.all([api.getPromos(), api.getReferrals()])

    expect(neocore.callsTo('POST', '/auth/refresh')).toHaveLength(1)
  })

  it('surfaces the original 401 and marks the session stale when the refresh is rejected', async () => {
    const auth = await signInWithExpiredToken()
    promosRequireFreshToken()
    neocore.on('POST', '/auth/refresh', () => fail(401, 'session revoked, please log in'))

    await expect(useAffiliateApi().getPromos()).rejects.toMatchObject({
      kind: 'auth',
      message: 'invalid or expired token',
    })
    expect(auth.status).toBe('stale')
    expect(neocore.callsTo('GET', '/promos')).toHaveLength(1)
  })

  it('replays at most once', async () => {
    await signInWithExpiredToken()
    neocore.on('GET', '/promos', () => fail(401, 'invalid or expired token'))
    neocore.on('POST', '/auth/refresh', () => ok(authSession({ token: 'fresh' })))

    await expect(useAffiliateApi().getPromos()).rejects.toMatchObject({ status: 401 })
    expect(neocore.callsTo('GET', '/promos')).toHaveLength(2)
    expect(neocore.callsTo('POST', '/auth/refresh')).toHaveLength(1)
  })

  it('does not refresh on a 403', async () => {
    await signInWithExpiredToken()
    neocore.on('GET', '/affiliate/summary', () => fail(403, 'only available on an affiliate account'))
    neocore.on('POST', '/auth/refresh', () => ok(authSession({ token: 'fresh' })))

    await expect(useAffiliateApi().getSummary()).rejects.toMatchObject({ kind: 'forbidden' })
    expect(neocore.callsTo('POST', '/auth/refresh')).toHaveLength(0)
  })
})
