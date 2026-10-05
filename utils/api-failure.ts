import type { FetchError } from 'ofetch'

/**
 * Typed API failure, the web equivalent of mobile's `Failure` hierarchy
 * (`core/network/dio_failure.dart`). HTTP status picks the kind. The
 * server's `message` wins over the default copy whenever it sent one
 * (API_MAP.md §5).
 */
export type FailureKind =
  | 'network'
  | 'validation'
  | 'auth'
  | 'forbidden'
  | 'locked'
  | 'conflict'
  | 'server'
  | 'unknown'

const DEFAULT_MESSAGES: Record<FailureKind, string> = {
  network: 'No internet connection.',
  validation: 'Please check the highlighted fields.',
  auth: 'Your session has expired. Please sign in again.',
  forbidden: 'You do not have access to this.',
  locked: 'Account temporarily locked. Try again later.',
  conflict: 'This record was updated elsewhere.',
  server: 'Something went wrong on our end.',
  unknown: 'Something went wrong.',
}

export class ApiFailure extends Error {
  readonly kind: FailureKind
  /** HTTP status, or null when no response arrived. */
  readonly status: number | null
  /** 400 field errors as `{ field: [messages] }`. VM2 auth never sends any. */
  readonly fieldErrors: Record<string, string[]>

  constructor(
    kind: FailureKind,
    message?: string | null,
    options: { status?: number | null; fieldErrors?: Record<string, string[]> } = {},
  ) {
    super(message || DEFAULT_MESSAGES[kind])
    this.name = 'ApiFailure'
    this.kind = kind
    this.status = options.status ?? null
    this.fieldErrors = options.fieldErrors ?? {}
  }
}

/** Success-or-failure for actions whose caller renders the failure (mobile's `Result`). */
export type Result<T> = { ok: true; value: T } | { ok: false; failure: ApiFailure }

function kindForStatus(status: number): FailureKind {
  switch (status) {
    case 400:
      return 'validation'
    case 401:
      return 'auth'
    case 403:
      return 'forbidden'
    case 409:
      return 'conflict'
    case 423:
    case 429:
      return 'locked'
    default:
      return status >= 500 ? 'server' : 'unknown'
  }
}

/** Builds a failure from an HTTP error status and its (possibly non-JSON) body. */
export function failureFromResponse(status: number, body: unknown): ApiFailure {
  const map = body && typeof body === 'object' ? (body as Record<string, unknown>) : null
  const message = typeof map?.message === 'string' ? map.message : null
  const kind = kindForStatus(status)
  return new ApiFailure(kind, message, {
    status,
    fieldErrors: kind === 'validation' ? coerceFieldErrors(map?.data) : {},
  })
}

/** Name check rather than `instanceof`, which breaks if two ofetch copies are bundled. */
function isFetchError(error: unknown): error is FetchError {
  return error instanceof Error && error.name === 'FetchError'
}

/** Normalises anything thrown by the HTTP layer into an `ApiFailure`. */
export function toApiFailure(error: unknown): ApiFailure {
  if (error instanceof ApiFailure) return error
  if (isFetchError(error)) {
    const status = error.response?.status
    if (status) return failureFromResponse(status, error.data)
    // No response: DNS, offline, CORS or timeout. All transport problems.
    return new ApiFailure('network')
  }
  return new ApiFailure('unknown')
}

/**
 * neocore's canonical 400 body is `{errors: [{field, message}]}`. A flat
 * `{field: "msg" | ["msg"]}` map is accepted as a fallback, like mobile.
 */
function coerceFieldErrors(data: unknown): Record<string, string[]> {
  if (!data || typeof data !== 'object') return {}
  const out: Record<string, string[]> = {}
  const errors = (data as Record<string, unknown>).errors
  if (Array.isArray(errors)) {
    for (const entry of errors) {
      if (!entry || typeof entry !== 'object') continue
      const { field, message } = entry as Record<string, unknown>
      const key = field == null ? '_' : String(field)
      ;(out[key] ??= []).push(message == null ? '' : String(message))
    }
    if (Object.keys(out).length > 0) return out
  }
  for (const [key, value] of Object.entries(data)) {
    if (key === 'errors' || value == null) continue
    out[key] = Array.isArray(value) ? value.map(String) : [String(value)]
  }
  return out
}
