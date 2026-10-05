/**
 * Same-origin proxy to neocore's VM2 API (API_MAP.md §0.1). The browser calls
 * /vault-mobile/v2/** on this server, which forwards the method, path, query,
 * headers (including Authorization) and body unchanged. Endpoints and payloads
 * stay exactly as documented, and neocore's missing CORS headers never matter.
 *
 * Target host: `runtimeConfig.apiBase` in nuxt.config.ts.
 */
export default defineEventHandler((event) => {
  const { apiBase } = useRuntimeConfig(event)
  return proxyRequest(event, `${apiBase.replace(/\/+$/, '')}${event.path}`)
})
