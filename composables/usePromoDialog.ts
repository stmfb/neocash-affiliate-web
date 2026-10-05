import type { Promo } from '~/types/api'

/**
 * The one "Official promo" dialog the shell layout renders. Home's carousel,
 * the Referrals backdrop card and Profile's card all open it through here.
 */
export function usePromoDialog() {
  const promo = useState<Promo | null>('promo-dialog:promo', () => null)
  const open = useState('promo-dialog:open', () => false)

  function show(next: Promo): void {
    promo.value = next
    open.value = true
  }

  return { promo, open, show }
}
