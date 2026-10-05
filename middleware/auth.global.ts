/** Runs the auth guard on every navigation (mobile's go_router `redirect`). */
export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  const target = authRedirect(auth.status, to, { signedOutByUser: auth.signedOutByUser })
  if (target && target !== to.fullPath) return navigateTo(target, { replace: true })
})
