/**
 * `localStorage` that never throws. It can be unavailable or full (private
 * browsing, blocked site data). A failed write only costs persistence across
 * reloads.
 */
export const safeStorage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value)
    } catch {
      // Ignore: the in-memory state still works for this page load.
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch {
      // Ignore.
    }
  },
}
