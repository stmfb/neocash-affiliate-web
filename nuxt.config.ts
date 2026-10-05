// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-09-25',

  // Client-only SPA: the mobile app has no server rendering, and every screen
  // sits behind a Bearer token held on the client (API_MAP.md §2).
  ssr: false,

  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],

  runtimeConfig: {
    // Server-only neocore host that /vault-mobile/v2/** is proxied to
    // (server/routes/vault-mobile/v2/[...path].ts). Host only, no path. A
    // NUXT_API_BASE environment variable overrides it at runtime if set.
    // https://4a1efe7e86e8-8302610227555236033.ngrok-free.app
    // https://zgqqt32k-8087.euw.devtunnels.ms
    apiBase: 'https://4a1efe7e86e8-8302610227555236033.ngrok-free.app',
  },

  devServer: { port: 4000, host: '0.0.0.0' },

  tailwindcss: {
    cssPath: '~/assets/css/tailwind.css',
    configPath: 'tailwind.config.ts',
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'NeoCash Affiliate',
      meta: [
        // viewport-fit=cover exposes env(safe-area-inset-*) for the floating nav.
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#FFFFFF' },
      ],
      link: [
        // Only the weights the affiliate UI uses (DESIGN_AUDIT.md §5.2).
        { rel: 'preload', href: '/fonts/ClashGrotesk-Regular.otf', as: 'font', type: 'font/otf', crossorigin: '' },
        { rel: 'preload', href: '/fonts/ClashGrotesk-Semibold.otf', as: 'font', type: 'font/otf', crossorigin: '' },
      ],
    },
  },

  typescript: {
    strict: true,
  },
})
