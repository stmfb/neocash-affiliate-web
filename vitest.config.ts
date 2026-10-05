import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    include: ['tests/**/*.spec.ts'],
    // Node 25 ships a global `localStorage` that shadows happy-dom's and does
    // nothing without --localstorage-file. Turn it off so tests get the DOM one.
    execArgv: ['--no-webstorage'],
  },
})
