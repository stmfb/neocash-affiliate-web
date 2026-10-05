/**
 * Mobile's `_copyText`: copies to the clipboard, then shows "Copied {value}".
 * Falls back to a hidden textarea where the async Clipboard API is unavailable
 * (non-secure origins, older browsers).
 */
export function useCopy() {
  const toast = useToastStore()

  async function copy(value: string): Promise<boolean> {
    let copied = false
    try {
      await navigator.clipboard.writeText(value)
      copied = true
    } catch {
      copied = legacyCopy(value)
    }
    if (copied) toast.show(`Copied ${value}`)
    return copied
  }

  return { copy }
}

function legacyCopy(value: string): boolean {
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    textarea.remove()
  }
}
