import type { Agent, AuthSession } from '~/types/api'
import { ApiFailure, toApiFailure, type Result } from '~/utils/api-failure'

/**
 * Mirrors mobile's `AuthState` (API_MAP.md §2.6). `stale` still counts as
 * authenticated: a rejected refresh keeps the cached profile and asks for
 * re-auth rather than logging out.
 */
export type AuthStatus = 'authenticating' | 'signedOut' | 'mustChangePassword' | 'signedIn' | 'stale'

/** Everything in a session except the tokens, the web equivalent of mobile's Drift `auth_session` row. */
type CachedSession = Omit<AuthSession, 'token' | 'refresh_token'>

const STORAGE_KEYS = {
  refreshToken: 'vm2_refresh_token',
  session: 'vm2_session',
  deviceId: 'vm2_device_id',
} as const

/** A staff login is valid, but this app only has affiliate screens. */
const AGENT_ACCOUNT_MESSAGE =
  'This web app is for NeoCash affiliate accounts. Agents should sign in on Vault Mobile.'

function readCachedSession(): CachedSession | null {
  const raw = safeStorage.get(STORAGE_KEYS.session)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && 'agent' in parsed ? (parsed as CachedSession) : null
  } catch {
    return null
  }
}

/** Audit-only device id, minted once per browser (mobile: `vm2_device_id`). */
function deviceId(): string {
  const existing = safeStorage.get(STORAGE_KEYS.deviceId)
  if (existing) return existing
  const minted =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')
  safeStorage.set(STORAGE_KEYS.deviceId, minted)
  return minted
}

export const useAuthStore = defineStore('auth', () => {
  const authApi = useAuthApi()

  /** Memory only, never persisted. Lost on reload and restored via refresh. */
  const accessToken = ref<string | null>(null)
  const session = ref<CachedSession | null>(null)
  const hydrated = ref(false)
  /** Set when the server rejects a refresh (401/403). Offline is never stale. */
  const stale = ref(false)
  /** The last sign-out was the user's (Log Out / Sign out), not a lost session. */
  const signedOutByUser = ref(false)

  const status = computed<AuthStatus>(() => {
    if (!hydrated.value) return 'authenticating'
    if (!session.value) return 'signedOut'
    if (session.value.agent.must_change_password) return 'mustChangePassword'
    return stale.value ? 'stale' : 'signedIn'
  })
  const isAuthenticated = computed(() => status.value === 'signedIn' || status.value === 'stale')
  const agent = computed<Agent | null>(() => session.value?.agent ?? null)
  const isAffiliate = computed(() => roleFromWire(agent.value?.role) === 'affiliate')
  /** `commission_rate_bps / 100`, or null when the server omits it. */
  const commissionRatePercent = computed(() => {
    const bps = agent.value?.commission_rate_bps
    return bps == null ? null : bps / 100
  })

  // Bumped whenever a session is adopted or dropped, so an older refresh
  // resolving late can neither overwrite it nor flag it stale.
  let generation = 0
  let refreshInFlight: Promise<string> | null = null
  let hydration: Promise<void> | null = null

  function persist(next: AuthSession): void {
    const { token, refresh_token: refreshToken, ...profile } = next
    if (token) accessToken.value = token
    if (refreshToken) safeStorage.set(STORAGE_KEYS.refreshToken, refreshToken)
    session.value = profile
    safeStorage.set(STORAGE_KEYS.session, JSON.stringify(profile))
  }

  /** A brand-new session from login or password change. */
  function adopt(next: AuthSession): void {
    generation++
    persist(next)
    stale.value = false
    signedOutByUser.value = false
    hydrated.value = true
  }

  function clear(): void {
    accessToken.value = null
    session.value = null
    stale.value = false
    safeStorage.remove(STORAGE_KEYS.refreshToken)
    safeStorage.remove(STORAGE_KEYS.session)
  }

  /**
   * Restores the session once per page load (mobile's cold-start hydrate). The
   * access token isn't persisted, so this goes straight to a refresh.
   */
  function hydrate(): Promise<void> {
    hydration ??= (async () => {
      session.value = readCachedSession()
      if (!safeStorage.get(STORAGE_KEYS.refreshToken)) {
        clear()
      } else {
        try {
          await refreshTokens()
        } catch {
          // Rejected: refreshTokens marked it stale. Offline: keep the cached
          // profile. With no cached profile there's nothing to show.
          if (!session.value) clear()
        }
      }
      hydrated.value = true
    })()
    return hydration
  }

  /** Concurrent callers share one in-flight refresh (mobile's single-flight). */
  function refreshTokens(): Promise<string> {
    refreshInFlight ??= runRefresh().finally(() => {
      refreshInFlight = null
    })
    return refreshInFlight
  }

  async function runRefresh(): Promise<string> {
    const startedIn = generation
    const refreshToken = safeStorage.get(STORAGE_KEYS.refreshToken)
    if (!refreshToken) {
      stale.value = true
      throw new ApiFailure('auth', 'No refresh token stored.')
    }
    let next: AuthSession
    try {
      next = await authApi.refresh(refreshToken)
    } catch (error) {
      const failure = toApiFailure(error)
      if (startedIn === generation && (failure.status === 401 || failure.status === 403)) {
        stale.value = true
      }
      throw failure
    }
    if (startedIn !== generation) throw new ApiFailure('auth', 'Session changed during refresh.')
    if (!next.token) {
      stale.value = true
      throw new ApiFailure('auth', 'Refresh response carried no token.')
    }
    // Back-office can turn an affiliate into staff. The role rides in the
    // token, so it only shows up here. This app has no agent screens.
    if (roleFromWire(next.agent.role) !== 'affiliate') {
      clear()
      throw new ApiFailure('forbidden', AGENT_ACCOUNT_MESSAGE, { status: 403 })
    }
    persist(next)
    stale.value = false
    return next.token
  }

  async function login(email: string, password: string): Promise<Result<Agent>> {
    if (!navigator.onLine) {
      return { ok: false, failure: new ApiFailure('network', 'You must be online to sign in.') }
    }
    let next: AuthSession
    try {
      next = await authApi.login({ email: email.trim(), password, device_id: deviceId() })
    } catch (error) {
      return { ok: false, failure: toApiFailure(error) }
    }
    if (roleFromWire(next.agent.role) !== 'affiliate') {
      return { ok: false, failure: new ApiFailure('forbidden', AGENT_ACCOUNT_MESSAGE, { status: 403 }) }
    }
    adopt(next)
    return { ok: true, value: next.agent }
  }

  /** On success the server returns fresh tokens (old ones are revoked) and `must_change_password: false`. */
  async function changePassword(currentPassword: string, newPassword: string): Promise<Result<Agent>> {
    if (!navigator.onLine) {
      return { ok: false, failure: new ApiFailure('network', 'You must be online to change your password.') }
    }
    try {
      const next = await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      })
      adopt(next)
      return { ok: true, value: next.agent }
    } catch (error) {
      return { ok: false, failure: toApiFailure(error) }
    }
  }

  /** Local only: VM2 has no revoke endpoint (API_MAP.md §2.7). */
  function signOut(): void {
    generation++
    signedOutByUser.value = true
    clear()
    useAffiliateStore().reset()
  }

  return {
    accessToken,
    session,
    hydrated,
    stale,
    signedOutByUser,
    status,
    isAuthenticated,
    agent,
    isAffiliate,
    commissionRatePercent,
    hydrate,
    refreshTokens,
    login,
    changePassword,
    signOut,
  }
})
