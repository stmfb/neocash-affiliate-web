import { describe, expect, it } from 'vitest'
import type { Referral } from '~/types/api'
import { CAMPAIGN_THEMES, campaignThemeIndex } from '~/utils/promo-theme'
import { commissionText, followUpHint, loanAmountText, stagePresentation } from '~/utils/referral'

function referral(overrides: Partial<Referral> = {}): Referral {
  return {
    customer_id: 'c1',
    name: 'Tunde Bakare',
    phone: '+2348022223333',
    signed_up_at: '2026-09-01T00:00:00+01:00',
    stage: 'applied',
    stage_updated_at: '2026-09-20T00:00:00+01:00',
    loan: { application_id: 'l1', amount_kobo: 20000000, pending_actions: [] },
    commission: { amount_kobo: 300000, status: 'estimated' },
    ...overrides,
  }
}

describe('stagePresentation (DESIGN_AUDIT.md §4.11)', () => {
  it.each([
    ['signed_up', 'Signed up', 'Signup complete', 'text-ink'],
    ['applied', 'Applied', 'Application in review', 'text-primary'],
    ['approved', 'Approved', 'Loan approved', 'text-data-blue'],
    ['disbursed', 'Disbursed', 'Loan disbursed', 'text-data-green'],
    ['rejected', 'Rejected', 'Application rejected', 'text-danger'],
    ['declined', 'Declined', 'Application declined', 'text-danger'],
    ['cancelled', 'Cancelled', 'Application cancelled', 'text-ink-muted'],
  ])('%s → %s / %s', (stage, label, statusText, textClass) => {
    expect(stagePresentation(stage)).toMatchObject({ label, statusText, textClass })
  })

  it('treats unknown stages as signed up', () => {
    expect(stagePresentation('on_hold').label).toBe('Signed up')
  })
})

describe('row values', () => {
  it('shows loan amount or "No loan yet"', () => {
    expect(loanAmountText(referral())).toBe('₦200,000.00')
    expect(loanAmountText(referral({ loan: null }))).toBe('No loan yet')
  })

  it('shows commission with its status, or "Not applicable"', () => {
    expect(commissionText(referral())).toBe('₦3,000.00 • Estimated')
    expect(commissionText(referral({ commission: null }))).toBe('Not applicable')
  })
})

describe('followUpHint', () => {
  it('joins a rejection summary and next step', () => {
    const hint = followUpHint(
      referral({
        stage: 'rejected',
        loan: {
          application_id: 'l1',
          amount_kobo: 1,
          pending_actions: [],
          rejection: { reason: 'affordability-issue', summary: 'Too much.', next_step: 'Choose less.', resolved: false },
        },
      }),
    )
    expect(hint).toBe('Too much. Choose less.')
  })

  it('falls back for a rejection without wording', () => {
    expect(followUpHint(referral({ stage: 'rejected' }))).toBe('This application was rejected.')
  })

  it("uses the server's decline message", () => {
    const loan = { application_id: 'l1', amount_kobo: 1, pending_actions: [], decline_message: 'This application was not approved.' }
    expect(followUpHint(referral({ stage: 'declined', loan }))).toBe('This application was not approved.')
    expect(followUpHint(referral({ stage: 'declined' }))).toBe('This application was declined.')
  })

  it('describes the first pending action, or review in progress', () => {
    const loan = { application_id: 'l1', amount_kobo: 1, pending_actions: [{ item: 'bank_statement', status: 'pending' }] }
    expect(followUpHint(referral({ stage: 'approved', loan }))).toBe('Bank statement is pending.')
    expect(followUpHint(referral({ stage: 'applied' }))).toBe('Application is being reviewed.')
  })

  it('reports commission state once disbursed', () => {
    expect(followUpHint(referral({ stage: 'disbursed', commission: { amount_kobo: 1, status: 'paid' } }))).toBe('Commission has been paid.')
    expect(followUpHint(referral({ stage: 'disbursed', commission: { amount_kobo: 1, status: 'pending' } }))).toBe(
      'Commission is pending — released 24h after disbursement.',
    )
    expect(followUpHint(referral({ stage: 'disbursed', commission: null }))).toBe('Loan disbursed.')
  })

  it('covers signed up and cancelled', () => {
    expect(followUpHint(referral({ stage: 'signed_up', loan: null }))).toBe('Encourage customer to start a loan application.')
    expect(followUpHint(referral({ stage: 'cancelled' }))).toBe('This application was cancelled.')
  })
})

describe('campaignThemeIndex', () => {
  it('is stable and within range', () => {
    expect(campaignThemeIndex('mock-promo-1')).toBe(campaignThemeIndex('mock-promo-1'))
    for (const id of ['a', 'p-1', 'p-2', 'p_19f', '']) {
      expect(campaignThemeIndex(id)).toBeGreaterThanOrEqual(0)
      expect(campaignThemeIndex(id)).toBeLessThan(CAMPAIGN_THEMES.length)
    }
  })
})
