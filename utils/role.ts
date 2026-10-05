export type VaultUserRole = 'agent' | 'affiliate'

/**
 * Mirrors mobile's `VaultUserRole.fromWire`: only these values (trimmed,
 * case-insensitive) mean affiliate. Anything else, including neocore's
 * `staff` or a missing role, is a regular agent.
 */
export function roleFromWire(value: string | null | undefined): VaultUserRole {
  switch (value?.trim().toLowerCase()) {
    case 'affiliate':
    case 'affiliate_marketer':
    case 'marketer':
      return 'affiliate'
    default:
      return 'agent'
  }
}
