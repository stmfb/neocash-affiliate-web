<script setup lang="ts">
import type { ApiFailure } from '~/utils/api-failure'

/**
 * S3 Set your password (DESIGN_AUDIT.md §3, API_MAP.md §3.2), mobile's
 * `ChangePasswordScreen`. Two modes:
 * - Forced (`?forced=true`): the guard pins a temporary-password session here.
 *   No back button, and Sign out is the only way out. On success the guard
 *   takes over (→ Home).
 * - Voluntary (no flag): back button. On success, "Password changed." and back.
 *   Mobile only links it from the agent Profile. Here it's reachable by URL.
 */
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const forced = computed(() => route.query.forced === 'true')

useHead(() => ({ title: forced.value ? 'Set your password' : 'Change password' }))

type Field = { focus: () => void; blur: () => void }
const newField = ref<Field>()
const confirmField = ref<Field>()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const submitting = ref(false)

const currentError = ref<string | null>(null)
const newError = ref<string | null>(null)
const confirmError = ref<string | null>(null)
const generalError = ref<string | null>(null)

/** Mobile's `_applyFailure`: server field errors first, "current password" 401s under that field, else a banner. */
function applyFailure(failure: ApiFailure): void {
  if (failure.kind === 'validation') {
    currentError.value = failure.fieldErrors.current_password?.[0] ?? null
    newError.value = failure.fieldErrors.new_password?.[0] ?? null
    generalError.value = currentError.value || newError.value ? null : failure.message
  } else if (failure.kind === 'auth' && /current password/i.test(failure.message)) {
    currentError.value = failure.message
    generalError.value = null
  } else {
    generalError.value = failure.message
  }
}

function goBack(): void {
  // Back if the app has history of its own, otherwise Home.
  if (window.history.state?.back) router.back()
  else void router.replace('/')
}

async function submit(): Promise<void> {
  if (submitting.value) return
  ;(document.activeElement as HTMLElement | null)?.blur()

  generalError.value = null
  currentError.value = currentPassword.value ? null : 'Enter your current password'
  newError.value = newPassword.value.length < 8 ? 'Use at least 8 characters' : null
  confirmError.value = confirmPassword.value !== newPassword.value ? 'Passwords do not match' : null
  if (currentError.value || newError.value || confirmError.value) return

  submitting.value = true
  const result = await auth.changePassword(currentPassword.value, newPassword.value)
  submitting.value = false

  if (!result.ok) {
    applyFailure(result.failure)
    return
  }
  // Forced: the guard sends the now-signed-in session Home.
  if (!forced.value) {
    toast.show('Password changed.')
    goBack()
  }
}

function signOut(): void {
  if (!submitting.value) auth.signOut()
}
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-white">
    <header v-if="forced" class="px-6 pb-6 pt-[calc(env(safe-area-inset-top)+24px)]">
      <h1 class="text-title-sm text-ink">Set your password</h1>
    </header>
    <BaseStepHeader v-else class="pt-[calc(env(safe-area-inset-top)+24px)]" title="Change password" @back="goBack" />

    <form class="flex flex-1 flex-col" novalidate @submit.prevent="submit">
      <div class="flex-1 p-6">
        <p class="text-body text-ink-muted">
          {{
            forced
              ? "You're signed in with a temporary password. Choose a new one to continue."
              : 'Enter your current password, then choose a new one.'
          }}
        </p>

        <BaseInfoCard v-if="generalError" class="mt-6" :message="generalError" />

        <!-- Lets password managers tie the new password to this account. -->
        <input type="text" name="username" autocomplete="username" :value="auth.agent?.email ?? ''" hidden readonly />

        <BaseTextField
          v-model="currentPassword"
          :class="generalError ? 'mt-5' : 'mt-6'"
          label="Current password"
          :placeholder="forced ? 'Your temporary password' : 'Enter your current password'"
          type="password"
          autocomplete="current-password"
          :error="currentError"
          @enter="newField?.focus()"
        />
        <BaseTextField
          ref="newField"
          v-model="newPassword"
          class="mt-5"
          label="New password"
          placeholder="At least 8 characters"
          type="password"
          autocomplete="new-password"
          :error="newError"
          @enter="confirmField?.focus()"
        />
        <BaseTextField
          ref="confirmField"
          v-model="confirmPassword"
          class="mt-5"
          label="Confirm new password"
          placeholder="Re-enter your new password"
          type="password"
          autocomplete="new-password"
          :error="confirmError"
          @enter="confirmField?.blur()"
        />
      </div>

      <div class="p-6 pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <BaseButton type="submit" block :loading="submitting">
          {{ forced ? 'Set password' : 'Change password' }}
        </BaseButton>
        <BaseButton v-if="forced" class="mt-3" variant="text" block @click="signOut">Sign out</BaseButton>
      </div>
    </form>
  </div>
</template>
