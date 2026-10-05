import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useFreshStores } from '../support/stores'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BaseButton from '~/components/base/Button.vue'
import BaseTextField from '~/components/base/TextField.vue'

beforeEach(() => useFreshStores())
afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('BaseButton', () => {
  it('blocks clicks and announces busy while loading', async () => {
    const onClick = vi.fn()
    const wrapper = await mountSuspended(BaseButton, {
      props: { loading: true, onClick },
      slots: { default: () => 'Continue' },
    })
    const button = wrapper.get('button')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('aria-busy')).toBe('true')
    await button.trigger('click')
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('BaseTextField', () => {
  it('toggles password visibility and wires the error for assistive tech', async () => {
    const wrapper = await mountSuspended(BaseTextField, {
      props: { modelValue: 'secret', label: 'Password', type: 'password', error: 'Too short' },
    })
    const input = wrapper.get('input')
    expect(input.attributes('type')).toBe('password')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(wrapper.get(`#${input.attributes('aria-describedby')}`).text()).toBe('Too short')

    await wrapper.get('button[aria-label="Show password"]').trigger('click')
    expect(input.attributes('type')).toBe('text')
    expect(wrapper.find('button[aria-label="Hide password"]').exists()).toBe(true)
  })
})
