declare module '#app' {
  interface PageMeta {
    /**
     * A screen pushed over the affiliate shell (S5 date range). The shell
     * hides its header and tab bar and shows the page full-screen, keeping
     * the tabs underneath mounted.
     */
    pushed?: boolean
  }
}

export {}
