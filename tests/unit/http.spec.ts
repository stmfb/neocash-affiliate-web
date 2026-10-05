import { afterEach, describe, expect, it } from 'vitest'
import { ApiFailure } from '~/utils/api-failure'
import { apiRequest } from '~/utils/http'
import { createFakeNeocore, fail, ok } from '../support/fake-neocore'

const neocore = createFakeNeocore()
afterEach(() => neocore.dispose())

describe('apiRequest', () => {
  it('unwraps the {message, data} envelope', async () => {
    neocore.on('GET', '/promos', () => ok([{ id: 'p1' }]))
    await expect(apiRequest('/promos')).resolves.toEqual([{ id: 'p1' }])
  })

  it('sends Authorization only when given a token', async () => {
    neocore.on('GET', '/promos', () => ok([]))
    await apiRequest('/promos', { token: 'abc' })
    await apiRequest('/promos')
    expect(neocore.calls.map((c) => c.authorization)).toEqual(['Bearer abc', null])
  })

  it('passes query params through', async () => {
    neocore.on('GET', '/affiliate/summary', () => ok({}))
    await apiRequest('/affiliate/summary', { query: { from: '2026-09-01', to: '2026-09-25' } })
    expect(neocore.calls[0]?.query).toEqual({ from: '2026-09-01', to: '2026-09-25' })
  })

  it('retries 5xx up to 3 attempts, then fails with the server message', async () => {
    neocore.on('GET', '/affiliate/referrals', () => fail(500, 'could not load your referrals'))
    const error = await apiRequest('/affiliate/referrals').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiFailure)
    expect(error).toMatchObject({ kind: 'server', status: 500, message: 'could not load your referrals' })
    expect(neocore.calls).toHaveLength(3)
  })

  it('recovers when a retry succeeds', async () => {
    let attempt = 0
    neocore.on('GET', '/promos', () => (++attempt < 2 ? fail(503, 'busy') : ok(['recovered'])))
    await expect(apiRequest('/promos')).resolves.toEqual(['recovered'])
    expect(neocore.calls).toHaveLength(2)
  })

  it('never retries 4xx', async () => {
    neocore.on('POST', '/auth/login', () => fail(401, 'invalid credentials'))
    const error = await apiRequest('/auth/login', { method: 'POST', body: {} }).catch((e: unknown) => e)
    expect(error).toMatchObject({ kind: 'auth', status: 401, message: 'invalid credentials' })
    expect(neocore.calls).toHaveLength(1)
  })

  it('rejects a 200 that is not an envelope', async () => {
    neocore.on('GET', '/promos', () => ({ status: 200, body: { hello: 'world' } }))
    await expect(apiRequest('/promos')).rejects.toMatchObject({ kind: 'unknown' })
  })
})
