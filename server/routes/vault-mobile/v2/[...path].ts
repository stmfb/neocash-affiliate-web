import type { H3Event } from 'h3'

/**
 * Same-origin proxy to neocore's VM2 API (API_MAP.md §0.1). The browser calls
 * /vault-mobile/v2/** on this server, which forwards the method, path, query,
 * headers (including Authorization) and body unchanged. Endpoints and payloads
 * stay exactly as documented, and neocore's missing CORS headers never matter.
 *
 * Target host: `runtimeConfig.apiBase` in nuxt.config.ts.
 *
 * In dev (`nuxt dev`) every call is logged to the terminal, whichever device
 * made it: one line for a normal `{message, data}` reply, the full body for
 * logins, errors and anything unexpected. Passwords are never logged and
 * tokens are masked.
 */
const API_PREFIX = '/vault-mobile/v2'

export default defineEventHandler(async (event) => {
  const { apiBase } = useRuntimeConfig(event)
  const target = `${apiBase.replace(/\/+$/, '')}${event.path}`
  if (!import.meta.dev) return proxyRequest(event, target)

  const route = `${event.method} ${event.path.slice(API_PREFIX.length)}`
  const isLogin = event.method === 'POST' && event.path.startsWith(`${API_PREFIX}/auth/login`)
  const email = isLogin ? await attemptedEmail(event) : null
  const started = Date.now()
  try {
    return await proxyRequest(event, target, {
      onResponse: async (_event, response) => {
        logCall({
          route,
          email,
          outcome: `${response.status} ${response.statusText}`,
          ms: Date.now() - started,
          headers: response.headers,
          body: await response.clone().text(),
          forceBody: isLogin || response.status >= 300,
        })
      },
    })
  } catch (error) {
    logCall({ route, email, outcome: 'no response', ms: Date.now() - started, headers: null, body: causeChain(error), forceBody: true })
    throw error
  }
})

/** The email from the login body. h3 caches the body, so the proxy can still forward it. */
async function attemptedEmail(event: H3Event): Promise<string> {
  const body = await readBody<{ email?: unknown }>(event).catch(() => null)
  return typeof body?.email === 'string' ? body.email : '(none)'
}

/** "Bad Gateway ← fetch failed ← connect ECONNREFUSED …": h3 wraps the real network error. */
function causeChain(error: unknown): string {
  const parts: string[] = []
  for (let current: unknown = error; current && parts.length < 5; current = (current as { cause?: unknown }).cause) {
    if (!(current instanceof Error)) {
      parts.push(String(current))
      continue
    }
    // Node reports a refused connection as an AggregateError with no message.
    const code = (current as { code?: unknown }).code
    const first = current instanceof AggregateError ? current.errors[0] : undefined
    parts.push(current.message || (first instanceof Error ? first.message : '') || String(code ?? current.name))
  }
  return parts.join(' ← ')
}

const TOKEN_KEYS = new Set(['token', 'refresh_token'])

function maskTokens(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(maskTokens)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value).map(([key, inner]) => [
      key,
      TOKEN_KEYS.has(key) && typeof inner === 'string' ? `«masked, ${inner.length} chars»` : maskTokens(inner),
    ]),
  )
}

const isEnvelope = (value: unknown) => !!value && typeof value === 'object' && !Array.isArray(value) && 'data' in value

interface Call {
  route: string
  email: string | null
  outcome: string
  ms: number
  headers: Headers | null
  body: string
  /** Print the body even when it's a normal envelope. */
  forceBody: boolean
}

function logCall({ route, email, outcome, ms, headers, body, forceBody }: Call): void {
  let parsed: unknown
  let isJson = true
  try {
    parsed = JSON.parse(body)
  } catch {
    isJson = false
  }
  const unexpected = !isJson || !isEnvelope(parsed)

  const facts = [`${body.length} chars`, headers?.get('content-type') ?? 'no content-type']
  for (const name of ['content-encoding', 'location']) {
    const value = headers?.get(name)
    if (value) facts.push(`${name}: ${value}`)
  }
  if (outcome.startsWith('2') && unexpected) facts.push('NOT a {message, data} envelope')

  const lines = [`[api] ${route} → ${outcome} in ${ms}ms · ${facts.join(' · ')}`]
  if (email) lines.push(`  email: ${email}`)
  if (forceBody || unexpected) {
    // Not JSON (an HTML error page, a tunnel interstitial…): show the start of it.
    const shown = isJson
      ? JSON.stringify(maskTokens(parsed), null, 2)
      : body.length > 800
        ? `${body.slice(0, 800)}… (${body.length} chars)`
        : body || '(empty body)'
    lines.push(...shown.split('\n').map((line) => `  ${line}`))
  }
  console.log(lines.join('\n'))
}
