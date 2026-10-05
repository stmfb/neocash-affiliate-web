import type { Envelope } from '~/types/api'
import { ApiFailure, toApiFailure } from './api-failure'

/**
 * Same-origin prefix. The Nuxt server proxies it to neocore unchanged
 * (`server/routes/vault-mobile/v2/[...path].ts`, API_MAP.md §0.1).
 */
export const API_PREFIX = '/vault-mobile/v2'

// Mobile's RetryInterceptor: 3 attempts total, 250ms then 500ms backoff,
// on 5xx and transport errors (ofetch reports those as 500). Never on 4xx.
const MAX_RETRIES = 2
const BASE_RETRY_DELAY_MS = 250
const RETRY_STATUS_CODES = Array.from({ length: 100 }, (_, i) => 500 + i)

/** Mobile uses 30s send/receive timeouts. fetch has one overall timeout. */
const TIMEOUT_MS = 30_000

export interface ApiRequestOptions {
  method?: 'GET' | 'POST'
  query?: Record<string, string>
  body?: object
  /** Access token for `Authorization: Bearer`. Omit for public endpoints. */
  token?: string | null
}

/**
 * One VM2 call: attaches the Bearer token when given, unwraps the
 * `{message, data}` envelope, retries transient failures, and throws
 * `ApiFailure` for everything else. It has no auth-refresh logic. Protected
 * calls go through `useApi()`, which adds 401 → refresh → replay.
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, token } = options
  let envelope: unknown
  try {
    envelope = await $fetch<unknown>(`${API_PREFIX}${path}`, {
      method,
      query,
      body,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      timeout: TIMEOUT_MS,
      retry: MAX_RETRIES,
      retryStatusCodes: RETRY_STATUS_CODES,
      retryDelay: (context) =>
        BASE_RETRY_DELAY_MS * 2 ** (MAX_RETRIES - Number(context.options.retry ?? 0)),
    })
  } catch (error) {
    throw toApiFailure(error)
  }
  if (!envelope || typeof envelope !== 'object' || !('data' in envelope)) {
    throw new ApiFailure('unknown')
  }
  return (envelope as Envelope<T>).data
}
