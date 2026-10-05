<script setup lang="ts">
import { Eye, EyeOff } from 'lucide-vue-next'

/**
 * `VaultTextField` (DESIGN_AUDIT.md §4.13): label above a pill-shaped input,
 * optional show/hide toggle for passwords, error text below. Enter never
 * submits the surrounding form (mobile keeps login and password change as an
 * explicit tap). It emits `enter` so the parent can move focus instead.
 */
const model = defineModel<string>({ required: true })

const props = withDefaults(
  defineProps<{
    label: string
    placeholder?: string
    type?: 'text' | 'email' | 'password'
    error?: string | null
    autocomplete?: string
  }>(),
  { placeholder: undefined, type: 'text', error: null, autocomplete: undefined },
)

const emit = defineEmits<{ enter: [] }>()

const id = useId()
const input = ref<HTMLInputElement>()
const revealed = ref(false)

const inputType = computed(() => (props.type === 'password' && revealed.value ? 'text' : props.type))

defineExpose({
  focus: () => input.value?.focus(),
  blur: () => input.value?.blur(),
})
</script>

<template>
  <div>
    <label :for="id" class="block text-body font-medium text-ink">{{ label }}</label>
    <div class="relative mt-2">
      <input
        :id="id"
        ref="input"
        v-model="model"
        :type="inputType"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? `${id}-error` : undefined"
        class="block w-full rounded-24 border bg-white p-3 text-body text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1"
        :class="[
          error ? 'border-danger focus:border-danger focus:ring-danger' : 'border-line-input focus:border-primary focus:ring-primary',
          { 'pr-11': type === 'password' },
        ]"
        @keydown.enter.prevent="emit('enter')"
      />
      <button
        v-if="type === 'password'"
        type="button"
        class="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-24 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        :aria-label="revealed ? 'Hide password' : 'Show password'"
        :aria-pressed="revealed"
        @click="revealed = !revealed"
      >
        <Eye v-if="revealed" :size="20" aria-hidden="true" />
        <EyeOff v-else :size="20" aria-hidden="true" />
      </button>
    </div>
    <p v-if="error" :id="`${id}-error`" class="mt-2 font-segoe text-label text-danger">{{ error }}</p>
  </div>
</template>
