import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { getQuery, getRequestHeaders, readBody, setResponseStatus, type H3Event } from 'h3'
import type { Agent, AuthSession } from '~/types/api'
import { API_PREFIX } from '~/utils/http'

export interface RecordedRequest {
  method: string
  path: string
  authorization: string | null
  query: Record<string, unknown>
  body: unknown
}

export interface Reply {
  status?: number
  body: unknown
}

type Responder = (request: RecordedRequest) => Reply | Promise<Reply>

/** `{message, data}` success envelope. */
export const ok = (data: unknown): Reply => ({ status: 200, body: { message: 'ok', data } })

/** neocore error body: `{message}` only. */
export const fail = (status: number, message: string): Reply => ({ status, body: { message } })

/**
 * The test harness's mock request keeps header names as sent (`Authorization`)
 * instead of lowercasing them like Node, so `getHeader(event, 'authorization')`
 * misses. Match case-insensitively.
 */
function authorizationHeader(event: H3Event): string | null {
  const entry = Object.entries(getRequestHeaders(event)).find(([name]) => name.toLowerCase() === 'authorization')
  return entry?.[1] ?? null
}

/**
 * A scriptable stand-in for neocore's /vault-mobile/v2 routes, served to the
 * real `$fetch` through @nuxt/test-utils' `registerEndpoint`.
 */
export function createFakeNeocore() {
  const calls: RecordedRequest[] = []
  const responders = new Map<string, Responder>()
  const unregisters = new Map<string, () => void>()

  function on(method: 'GET' | 'POST', path: string, responder: Responder): void {
    responders.set(`${method} ${path}`, responder)
    if (unregisters.has(path)) return
    unregisters.set(
      path,
      registerEndpoint(`${API_PREFIX}${path}`, async (event) => {
        const request: RecordedRequest = {
          method: event.method,
          path,
          authorization: authorizationHeader(event),
          query: getQuery(event),
          body: event.method === 'POST' ? await readBody(event) : undefined,
        }
        calls.push(request)
        const respond = responders.get(`${event.method} ${path}`)
        const reply = respond ? await respond(request) : fail(404, 'not found')
        setResponseStatus(event, reply.status ?? 200)
        return reply.body
      }),
    )
  }

  function callsTo(method: string, path: string): RecordedRequest[] {
    return calls.filter((c) => c.method === method && c.path === path)
  }

  function dispose(): void {
    for (const unregister of unregisters.values()) unregister()
    unregisters.clear()
    responders.clear()
    calls.length = 0
  }

  return { on, calls, callsTo, dispose }
}

// ── Fixtures (shapes from API_MAP.md §3) ──────────────────────────────────

export function affiliateAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'vagt_1',
    name: 'Aisha Bello',
    email: 'aisha@example.com',
    phone: '+2348100000000',
    role: 'affiliate',
    referral_code: 'AISHA2026',
    commission_rate_bps: 150,
    active: false,
    must_change_password: false,
    ...overrides,
  }
}

export function authSession(overrides: Partial<AuthSession> = {}, agent: Partial<Agent> = {}): AuthSession {
  return {
    token: 'access-1',
    refresh_token: 'refresh-1',
    token_expires_at: '2026-09-25T11:00:00+01:00',
    agent: affiliateAgent(agent),
    permissions: [],
    server_time: '2026-09-25T10:00:00+01:00',
    ...overrides,
  }
}
