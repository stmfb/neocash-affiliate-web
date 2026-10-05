import type { Referral, ReferralStage } from '~/types/api'
import { capitalize, formatKobo, humanizeKey } from './format'

export interface StagePresentation {
  /** Badge text. */
  label: string
  /** Friendlier sentence for the card's meta line. */
  statusText: string
  /** Full Tailwind classes, spelled out so the compiler keeps them. */
  textClass: string
  badgeClass: string
}

/** DESIGN_AUDIT.md §4.11 stage table. */
const STAGES: Record<ReferralStage, StagePresentation> = {
  signed_up: { label: 'Signed up', statusText: 'Signup complete', textClass: 'text-ink', badgeClass: 'bg-ink/10' },
  applied: { label: 'Applied', statusText: 'Application in review', textClass: 'text-primary', badgeClass: 'bg-primary/10' },
  approved: { label: 'Approved', statusText: 'Loan approved', textClass: 'text-data-blue', badgeClass: 'bg-data-blue/10' },
  disbursed: { label: 'Disbursed', statusText: 'Loan disbursed', textClass: 'text-data-green', badgeClass: 'bg-data-green/10' },
  rejected: { label: 'Rejected', statusText: 'Application rejected', textClass: 'text-danger', badgeClass: 'bg-danger/10' },
  declined: { label: 'Declined', statusText: 'Application declined', textClass: 'text-danger', badgeClass: 'bg-danger/10' },
  cancelled: { label: 'Cancelled', statusText: 'Application cancelled', textClass: 'text-ink-muted', badgeClass: 'bg-ink-muted/10' },
}

/** Unknown wire stages read as `signed_up`, like mobile's `ReferralStage.fromWire`. */
export function normalizeStage(stage: string): ReferralStage {
  return stage in STAGES ? (stage as ReferralStage) : 'signed_up'
}

export function stagePresentation(stage: string): StagePresentation {
  return STAGES[normalizeStage(stage)]
}

export function loanAmountText(referral: Referral): string {
  return referral.loan ? formatKobo(referral.loan.amount_kobo) : 'No loan yet'
}

export function commissionText(referral: Referral): string {
  const commission = referral.commission
  return commission ? `${formatKobo(commission.amount_kobo)} • ${capitalize(commission.status)}` : 'Not applicable'
}

/**
 * The expanded card's follow-up line, built only from the privacy allowlist
 * the API sends (DESIGN_AUDIT.md §4.11).
 */
export function followUpHint(referral: Referral): string {
  const loan = referral.loan
  switch (normalizeStage(referral.stage)) {
    case 'rejected': {
      const parts = [loan?.rejection?.summary, loan?.rejection?.next_step].filter((s): s is string => !!s)
      return parts.length ? parts.join(' ') : 'This application was rejected.'
    }
    case 'declined':
      return loan?.decline_message || 'This application was declined.'
    case 'signed_up':
      return 'Encourage customer to start a loan application.'
    case 'disbursed':
      switch (referral.commission?.status) {
        case 'paid':
          return 'Commission has been paid.'
        case 'pending':
          return 'Commission is pending — released 24h after disbursement.'
        default:
          return 'Loan disbursed.'
      }
    case 'cancelled':
      return 'This application was cancelled.'
    case 'applied':
    case 'approved': {
      const first = loan?.pending_actions[0]
      return first ? `${humanizeKey(first.item)} is ${first.status}.` : 'Application is being reviewed.'
    }
  }
}
