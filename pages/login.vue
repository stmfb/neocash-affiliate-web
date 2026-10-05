<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'
import type { ApiFailure } from '~/utils/api-failure'

/**
 * S2 Login (DESIGN_AUDIT.md §3, API_MAP.md §3.1). While the session is still
 * being restored it shows S1 "Authenticating…" instead, falling back to the
 * form after 6s like mobile's `_AuthSettlingGate`. On success the auth guard
 * moves on: forced password change, the `redirect` page, or Home. This page
 * never navigates itself.
 */
useHead({ title: 'Sign in' })

const CHECK_INPUT = 'Please, check your input and try again.'
const WAIT_A_FEW_MINUTES = 'Please wait a few minutes before trying again.'
const SETTLE_TIMEOUT_MS = 6000

const auth = useAuthStore()

// ── S1 gate ─────────────────────────────────────────────────────────────────

const settleTimedOut = ref(false)
let settleTimer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  settleTimer = setTimeout(() => (settleTimedOut.value = true), SETTLE_TIMEOUT_MS)
})
onBeforeUnmount(() => clearTimeout(settleTimer))

const showSettling = computed(() => auth.status === 'authenticating' && !settleTimedOut.value)

// ── Form ────────────────────────────────────────────────────────────────────

const email = ref('')
const password = ref('')
const passwordField = ref<{ focus: () => void; blur: () => void }>()
const submitting = ref(false)

const emailError = ref<string | null>(null)
const passwordError = ref<string | null>(null)
/** Banner text. With a `bannerSubtitle` it's the titled banner (a documented server error). */
const bannerMessage = ref<string | null>(null)
const bannerSubtitle = ref<string | null>(null)

const canSubmit = computed(() => isValidEmail(email.value) && password.value.length > 0 && !submitting.value)

function clearErrors(): void {
  emailError.value = null
  passwordError.value = null
  bannerMessage.value = null
  bannerSubtitle.value = null
}

// Mobile's `_onFieldChanged`: any edit clears every error.
watch([email, password], clearErrors)

/**
 * Mobile's `_applyFailure`, except a 403 (disabled account, no password set,
 * staff account) gets a plain banner. Mobile's "check your input" advice is
 * wrong for those.
 */
function applyFailure(failure: ApiFailure): void {
  switch (failure.kind) {
    case 'validation': {
      emailError.value = failure.fieldErrors.email?.[0] ?? null
      passwordError.value = failure.fieldErrors.password?.[0] ?? null
      if (!emailError.value && !passwordError.value) {
        bannerMessage.value = failure.message
        bannerSubtitle.value = CHECK_INPUT
      }
      break
    }
    case 'auth':
      bannerMessage.value = failure.message
      bannerSubtitle.value = CHECK_INPUT
      break
    case 'locked':
      bannerMessage.value = failure.message
      bannerSubtitle.value = WAIT_A_FEW_MINUTES
      break
    default:
      bannerMessage.value = failure.message
      bannerSubtitle.value = null
  }
}

async function submit(): Promise<void> {
  if (!canSubmit.value) return
  ;(document.activeElement as HTMLElement | null)?.blur()
  clearErrors()
  submitting.value = true
  const result = await auth.login(email.value, password.value)
  submitting.value = false
  if (!result.ok) applyFailure(result.failure)
}
</script>

<template>
  <AuthSettlingScreen v-if="showSettling" />
  <div v-else class="relative min-h-dvh overflow-hidden bg-white">
    <AuthSpriteBackground />
    <main class="relative px-3.5 pb-10 pt-[calc(env(safe-area-inset-top)+56px)]">
      <h1 class="text-heading-login text-ink">Welcome Back!</h1>
      <p class="mt-2 font-segoe text-label text-ink">Sign in to continue managing your customers.</p>

      <form class="px-1.5 pt-[26px]" novalidate @submit.prevent="submit">
        <BaseInfoCard
          v-if="bannerMessage"
          class="mb-6"
          :title="bannerSubtitle ? bannerMessage : null"
          :message="bannerSubtitle ?? bannerMessage"
        />
        <BaseTextField
          v-model="email"
          label="What's your work email address?"
          placeholder="You@Neocash.com"
          type="email"
          autocomplete="username"
          :error="emailError"
          @enter="passwordField?.focus()"
        />
        <BaseTextField
          ref="passwordField"
          v-model="password"
          class="mt-6"
          label="What's your password?"
          placeholder="Password"
          type="password"
          autocomplete="current-password"
          :error="passwordError"
          @enter="passwordField?.blur()"
        />
        <div class="mt-6 flex justify-end">
          <BaseButton type="submit" size="sm" :disabled="!canSubmit" :loading="submitting">
            Continue
            <template #icon><ArrowRight :size="18" aria-hidden="true" /></template>
          </BaseButton>
        </div>
      </form>
    </main>
  </div>
</template>
