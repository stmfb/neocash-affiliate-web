/**
 * VM2 wire shapes, verbatim from API_MAP.md §3: snake_case keys, money in
 * integer kobo, rates in basis points, timestamps as RFC 3339 strings.
 * Deliberately not mapped to camelCase models, so the data shapes stay as-is.
 */

/** Success body. Error bodies carry only `message` (API_MAP.md §1). */
export interface Envelope<T> {
  message: string
  data: T
}

// ── Auth ──────────────────────────────────────────────────────────────────

export interface Agent {
  id: string
  name: string
  email: string
  /** Always present server-side; may be "". */
  phone: string
  /** `affiliate` or `staff` from neocore. Read it through `roleFromWire`. */
  role: string
  /** Affiliates only. */
  referral_code?: string
  /** Only when the server has AFFILIATE_SIGNUP_URL configured. */
  referral_link?: string
  /** Affiliates only (default 150 = 1.5%). */
  commission_rate_bps?: number
  /** Always false for affiliates: gates till ops, NOT account status. */
  active: boolean
  till_gl_id?: string
  max_till_balance?: number
  must_change_password: boolean
}

export interface AuthSession {
  /** Access JWT (1h). */
  token: string
  /** Refresh JWT (30d). Absent on GET /auth/me. */
  refresh_token?: string
  token_expires_at: string
  agent: Agent
  permissions: string[]
  server_time: string
}

export interface LoginRequest {
  email: string
  password: string
  device_id?: string
}

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
}

// ── Affiliate reads ───────────────────────────────────────────────────────

export interface AffiliateSummary {
  from: string
  to: string
  referrals: number
  applications: number
  disbursed_count: number
  disbursed_kobo: number
  earnings_kobo: number
}

export type ReferralStage =
  | 'signed_up'
  | 'applied'
  | 'approved'
  | 'disbursed'
  | 'rejected'
  | 'declined'
  | 'cancelled'

export interface ReferralPendingAction {
  item: string
  status: string
}

export interface ReferralRejection {
  reason: string
  summary: string
  next_step: string
  resolved: boolean
  affordability_threshold?: number
  minimum_required_months?: number
}

export interface ReferralLoan {
  application_id: string
  amount_kobo: number
  pending_actions: ReferralPendingAction[]
  /** Only when stage is `rejected`. */
  rejection?: ReferralRejection
  /** Only when stage is `declined`. */
  decline_message?: string
}

export type CommissionStatus = 'estimated' | 'pending' | 'paid'

export interface ReferralCommission {
  amount_kobo: number
  status: CommissionStatus
}

export interface Referral {
  customer_id: string
  name: string
  phone: string
  signed_up_at: string
  /** Unknown values are treated as `signed_up`, as on mobile. */
  stage: ReferralStage
  stage_updated_at: string
  loan: ReferralLoan | null
  commission: ReferralCommission | null
}

export interface EarningRecord {
  customer_name: string
  principal_kobo: number
  amount_kobo: number
  rate_bps: number
  status: 'pending' | 'paid'
  earned_at: string
  paid_at?: string
}

export interface AffiliateEarnings {
  total_kobo: number
  paid_kobo: number
  pending_kobo: number
  /** Newest first. */
  records: EarningRecord[]
}

export interface Promo {
  id: string
  title: string
  subtitle: string
  /** Always a string; "" when unset. */
  image_url: string
  /** Referral link (or bare code) already filled in: share as-is. */
  share_text: string
  /** Always a string; "" when unset. */
  link: string
}

/** A `from`/`to` query window as Lagos calendar dates (`YYYY-MM-DD`). */
export interface DateWindow {
  from: string
  to: string
}
