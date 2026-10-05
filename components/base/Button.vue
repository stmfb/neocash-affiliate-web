<script setup lang="ts">
/**
 * `AppButton` from neocash_core_ui (DESIGN_AUDIT.md §4.17). Pill-shaped,
 * trailing icon via the `icon` slot. `disabled` fades it. `loading` keeps the
 * colour but swaps the content for a spinner and blocks clicks. Unlike mobile,
 * the button keeps its width while loading.
 */
type Variant = 'primary' | 'danger' | 'outlined' | 'text'
type Size = 'sm' | 'md'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    loading?: boolean
    disabled?: boolean
    block?: boolean
    type?: 'button' | 'submit'
  }>(),
  { variant: 'primary', size: 'md', loading: false, disabled: false, block: false, type: 'button' },
)

const VARIANTS: Record<Variant, { enabled: string; disabled: string; spinner: string }> = {
  primary: {
    enabled: 'bg-primary border-primary-accent text-white',
    disabled: 'bg-primary/30 border-primary-accent/30 text-white',
    spinner: 'text-white',
  },
  danger: {
    enabled: 'bg-danger border-danger-accent text-white',
    disabled: 'bg-danger/30 border-danger-accent/30 text-white',
    spinner: 'text-white',
  },
  outlined: {
    enabled: 'border-primary text-primary',
    disabled: 'border-primary/30 text-primary/30',
    spinner: 'text-primary',
  },
  text: {
    enabled: 'border-transparent text-ink-muted',
    disabled: 'border-transparent text-ink-muted/30',
    spinner: 'text-ink-muted',
  },
}

const SIZES: Record<Size, { box: string; spinner: number }> = {
  sm: { box: 'px-5 py-3 text-button-sm', spinner: 14 },
  md: { box: 'px-6 py-4 text-button', spinner: 16 },
}

const variant = computed(() => VARIANTS[props.variant])
const size = computed(() => SIZES[props.size])
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    class="relative inline-flex items-center justify-center rounded-32 border font-segoe transition-[filter] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 enabled:hover:brightness-95 enabled:active:brightness-90"
    :class="[
      size.box,
      disabled ? variant.disabled : variant.enabled,
      { 'w-full': block, 'cursor-wait': loading, 'cursor-not-allowed': disabled && !loading },
    ]"
  >
    <span class="inline-flex items-center gap-2" :class="{ invisible: loading }">
      <slot />
      <slot name="icon" />
    </span>
    <span v-if="loading" class="absolute inset-0 flex items-center justify-center">
      <BaseSpinner :size="size.spinner" :class="variant.spinner" />
    </span>
  </button>
</template>
