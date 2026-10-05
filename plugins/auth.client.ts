/**
 * Boots auth like mobile's AuthController:
 * - Starts restoring the session right away (not awaited: /login shows
 *   "Authenticating…" meanwhile).
 * - Re-runs the guard whenever the auth status changes without a navigation
 *   (hydrate finishing, login, password change, sign-out), as go_router's
 *   `refreshListenable` does.
 */
export default defineNuxtPlugin(() => {
  const auth = useAuthStore()
  const router = useRouter()

  watch(
    () => auth.status,
    (status) => {
      const route = router.currentRoute.value
      const target = authRedirect(status, route, { signedOutByUser: auth.signedOutByUser })
      if (target && target !== route.fullPath) void router.replace(target)
    },
  )

  void auth.hydrate()
})
