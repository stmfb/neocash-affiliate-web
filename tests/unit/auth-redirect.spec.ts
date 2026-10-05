import { describe, expect, it } from 'vitest'
import type { AuthStatus } from '~/stores/auth'
import { authRedirect } from '~/utils/auth-redirect'

function route(fullPath: string) {
  const url = new URL(fullPath, 'http://x')
  return { path: url.pathname, fullPath, query: Object.fromEntries(url.searchParams) }
}

const cases: [AuthStatus, string, string | null][] = [
  // Still restoring the session: everything waits on /login (which shows "Authenticating…").
  ['authenticating', '/login', null],
  ['authenticating', '/', '/login'],
  ['authenticating', '/earnings', '/login?redirect=%2Fearnings'],
  // Signed out.
  ['signedOut', '/login', null],
  ['signedOut', '/', '/login'],
  ['signedOut', '/referrals?x=1', '/login?redirect=%2Freferrals%3Fx%3D1'],
  ['signedOut', '/auth/change-password?forced=true', '/login?redirect=%2Fauth%2Fchange-password%3Fforced%3Dtrue'],
  // Temporary password: pinned to the forced change screen.
  ['mustChangePassword', '/', '/auth/change-password?forced=true'],
  ['mustChangePassword', '/login', '/auth/change-password?forced=true'],
  ['mustChangePassword', '/auth/change-password?forced=true', null],
  // Forced change just succeeded → Home.
  ['signedIn', '/auth/change-password?forced=true', '/'],
  // Freshly signed in on /login → onward.
  ['signedIn', '/login', '/'],
  ['signedIn', '/login?redirect=%2Fearnings', '/earnings'],
  ['signedIn', '/', null],
  ['signedIn', '/profile', null],
  // A stale session may stay on /login to re-authenticate, and keeps its screens.
  ['stale', '/login', null],
  ['stale', '/earnings', null],
]

describe('authRedirect', () => {
  it.each(cases)('%s at %s → %s', (status, fullPath, expected) => {
    expect(authRedirect(status, route(fullPath))).toBe(expected)
  })

  it('drops the page after the user logs out, so the next sign-in starts at Home', () => {
    expect(authRedirect('signedOut', route('/profile'), { signedOutByUser: true })).toBe('/login')
    expect(authRedirect('signedOut', route('/login'), { signedOutByUser: true })).toBeNull()
  })

  it.each([
    ['//evil.example.com', '/'],
    ['https://evil.example.com', '/'],
    ['/login', '/'],
    ['/login?redirect=%2Flogin', '/'],
  ])('ignores an unsafe redirect %s', (redirect, expected) => {
    expect(authRedirect('signedIn', route(`/login?redirect=${encodeURIComponent(redirect)}`))).toBe(expected)
  })
})
