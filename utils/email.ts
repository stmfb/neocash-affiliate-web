/** Mobile's `EmailValidation.isValidEmail`: something@something.something, trimmed. No domain lock. */
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/i

export function isValidEmail(value: string): boolean {
  return EMAIL.test(value.trim())
}
