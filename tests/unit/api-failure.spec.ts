import { describe, expect, it } from 'vitest'
import { ApiFailure, failureFromResponse, toApiFailure } from '~/utils/api-failure'

describe('failureFromResponse', () => {
  it.each([
    [400, 'validation'],
    [401, 'auth'],
    [403, 'forbidden'],
    [409, 'conflict'],
    [423, 'locked'],
    [429, 'locked'],
    [500, 'server'],
    [503, 'server'],
    [418, 'unknown'],
  ] as const)('maps HTTP %i to %s', (status, kind) => {
    const failure = failureFromResponse(status, { message: 'x' })
    expect(failure.kind).toBe(kind)
    expect(failure.status).toBe(status)
  })

  it("prefers the server's message", () => {
    expect(failureFromResponse(401, { message: 'invalid credentials' }).message).toBe('invalid credentials')
  })

  it('falls back to the default copy when there is no message', () => {
    expect(failureFromResponse(403, null).message).toBe('You do not have access to this.')
    expect(failureFromResponse(502, '<html>bad gateway</html>').message).toBe('Something went wrong on our end.')
  })

  it('groups canonical {errors: [{field, message}]} by field', () => {
    const failure = failureFromResponse(400, {
      message: 'invalid',
      data: {
        errors: [
          { field: 'email', message: 'required' },
          { field: 'email', message: 'invalid format' },
          { field: 'password', message: 'required' },
        ],
      },
    })
    expect(failure.fieldErrors).toEqual({ email: ['required', 'invalid format'], password: ['required'] })
  })

  it('accepts a flat field map as a fallback', () => {
    const failure = failureFromResponse(400, { message: 'invalid', data: { email: 'bad', password: ['short'] } })
    expect(failure.fieldErrors).toEqual({ email: ['bad'], password: ['short'] })
  })
})

describe('toApiFailure', () => {
  it('passes ApiFailure through unchanged', () => {
    const failure = new ApiFailure('locked')
    expect(toApiFailure(failure)).toBe(failure)
  })

  it('treats anything unrecognised as unknown', () => {
    const failure = toApiFailure(new TypeError('boom'))
    expect(failure.kind).toBe('unknown')
    expect(failure.message).toBe('Something went wrong.')
  })
})
