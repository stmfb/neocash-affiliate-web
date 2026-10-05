import { setActivePinia, type Pinia } from 'pinia'

/**
 * Gives each test fresh stores on the Nuxt app's own Pinia. Components mounted
 * with `mountSuspended` inject that instance, so a separate `createPinia()`
 * would leave tests and components looking at different stores. Setup stores
 * hold private state (auth's in-flight refresh, hydration), so they're
 * disposed and rebuilt, not patched.
 */
export function useFreshStores(): Pinia {
  const pinia = useNuxtApp().$pinia as Pinia
  setActivePinia(pinia)
  // `_s` is Pinia's registry of live stores. Internal, but the only way to drop them.
  const registry = (pinia as unknown as { _s: Map<string, { $dispose: () => void }> })._s
  for (const store of [...registry.values()]) store.$dispose()
  pinia.state.value = {}
  return pinia
}
