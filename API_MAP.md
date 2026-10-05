# Affiliate Flows: API Map

Every backend call the Vault Mobile 2 affiliate experience makes: request and response shapes, auth handling, and where the UI triggers it. Shapes are verified against both the **Flutter client** and the **neocore Go handlers**.

| Source | Location | Revision |
|---|---|---|
| Mobile client | `STMFB/vm_new/vault-mobile-2` | `main` @ `7eba2f2` |
| Backend (neocore VM2) | `STMFB/vm-test` (git worktree of `neocore`, branch `vm2-test`) | `75d5f1dc` **+ uncommitted working-tree changes** (see §0.2) |
| Backend's own contract doc | `vm-test/api/vaultMobile2/postman/affiliate-marketers.postman_collection.json`: folders **3 (Sign in)** and **4 (Dashboard)**. The mobile code comments call this "doc folder 3/4". | |

Client paths are relative to `vault-mobile-2/lib/`. Server paths are relative to `vm-test/`.

---

## 0. What matters most for the web port

### 0.1 Browsers can't call this API today (CORS)
| Problem | Evidence |
|---|---|
| No per-route `OPTIONS` handlers for `/vault-mobile/v2/*`, so preflights fall to the router's `GlobalOPTIONS`. It allows only `Content-Type, device-id, tenant-id, nb-user-token, user-id-token, nc-user-token, x-app-version`. **`Authorization` and `Idempotency-Key` are not allowed**, so every authenticated request fails preflight. | `api/sharedHandlers/middleware.go:33-57`, `main.go:65` |
| The public `POST /auth/login` and `POST /auth/refresh` handlers **never set `Access-Control-Allow-Origin`**. Only the `Authenticate` middleware does (`*`). Even a passing login preflight yields an unreadable response. | `api/vaultMobile2/auth.go:175-295` vs `middleware.go:222` |
| Other neocore surfaces already solved this with explicit `router.OPTIONS(".../*rest", preflight)` handlers. | `api/bnplWidget/routes.go:36-49`, `api/merchantsAPI/routes.go:109-120` |

**Recommendation:** route the web app through a **same-origin proxy (BFF)**. It removes CORS entirely and lets tokens live in `httpOnly` cookies instead of JS-readable storage (§2.9). If calling neocore directly instead, the backend needs to:
- add `OPTIONS /vault-mobile/v2` and `/vault-mobile/v2/*rest` returning `Access-Control-Allow-Headers: Authorization, Content-Type` (plus `Idempotency-Key` if sent);
- set `Access-Control-Allow-Origin` on the Login and Refresh responses.

### 0.2 The affiliate backend is not committed anywhere visible locally
In the `vm-test` worktree:
- `api/vaultMobile2/affiliate.go`, `promos.go`, `presenters/affiliate.go`, `app/vaultMobile/service-affiliate.go`, `service-commission.go` and `entities/affiliate-commission.go` are **untracked**.
- `auth.go`, `middleware.go`, `routes.go` and `presenters/presenters.go` have **uncommitted modifications** (the role/referral-code claims and the affiliate allowlist).
- `git log --all` finds no commit containing these files.
- `origin/vm2-test` (last fetched) is at `d6cca15d` (Jul 8).

Before building, confirm which deployed environment actually serves these endpoints. The client's default base URL is a placeholder (`https://vault-mobile.dev.neocash.local`).

### 0.3 Other material facts
- **Logout is client-only.** There is no revoke endpoint, so tokens stay valid server-side until expiry (access 1h, refresh 30d) (§2.7).
- **Error `message`s are raw server strings**, lower-case and developer-worded ("could not load your referrals", "invalid or expired token"). The mobile app shows them verbatim (§5).
- **Date query params are interpreted in Lagos time** (`Africa/Lagos`, UTC+1, no DST). The mobile client sends the *device-local* calendar date (§3.5).
- The web app needs **8 endpoints total**: 4 auth + 4 affiliate reads.

---

## 1. Transport and conventions

| Concern | Value | Source |
|---|---|---|
| Base URL | `VM2_API_BASE_URL` (`.env` or `--dart-define`). Default `https://vault-mobile.dev.neocash.local`. Trailing `/` stripped. | `core/network/api_config.dart:22-37` |
| Path prefix | `/vault-mobile/v2` | `api_config.dart:40` |
| Content type | `application/json` both ways | `core/network/dio_client.dart:17-24` |
| Success envelope | `{ "message": string, "data": T }`. The client unwraps it to `data`. | `interceptors/envelope_interceptor.dart` |
| Error envelope | `{ "message": string }` only, with **no `data` key** (`apiHelpers.WriteErrorJSONResponse`). The client falls back to reading `message` off any map. | `~/go/pkg/mod/github.com/0sax/api!helpers@v1.0.5/api-helpers.go:22-28` |
| Money | Integer **kobo** (`100` = ₦1.00). Never floats. | Postman collection description |
| Rates | Basis points (`150` = 1.5%). Display as `bps / 100`. | ditto |
| Timestamps (responses) | RFC 3339 with Lagos offset, e.g. `2026-09-16T10:00:00+01:00` | presenters (`time.Time`) |
| Dates (query) | `YYYY-MM-DD`, Lagos time; `to` covers the whole day | `api/vaultMobile2/affiliate.go:35-70` |
| Lists | Always arrays, `[]` when empty, never `null` | handlers use `make([]T, 0)` |
| Timeouts | connect 8s, send 30s, receive 30s | `api_config.dart:81-83` |
| Retry | `RetryInterceptor`: **3 attempts total**, backoff 250ms then 500ms. Retries connect/send/receive timeouts, connection errors, and **5xx**. Never retries 4xx. | `interceptors/retry_interceptor.dart` |
| Idempotency | `IdempotencyInterceptor` adds `Idempotency-Key: <ULID>` to every POST/PUT/PATCH. **None of the 8 endpoints below consume it**: login, refresh and password/change are not wrapped in `Idempotent` server-side, and the rest are GETs. The web client can omit it. | `interceptors/idempotency_interceptor.dart`, `api/vaultMobile2/routes.go:28-32, 137-140` |
| Interceptor order | `[mock?] → Retry → Auth (app Dio only) → Idempotency → Logging → Envelope` | `dio_client.dart:43-89` |
| Two HTTP clients | **public Dio** (no auth header; login and refresh) and **app Dio** (Bearer plus 401 handling; everything else) | `dio_client.dart`, `network_providers.dart:54-86` |

---

## 2. Auth handling

### 2.1 Account lifecycle (server)
1. A NeoCash customer applies to become an affiliate in the customer app.
2. Back-office approves. That creates a VM2 agent with `role: "affiliate"` and fixes the referral code.
3. The affiliate receives an emailed **temporary password**: 10 characters, unambiguous charset.
4. First login returns `must_change_password: true`. The token is then scoped to `/auth/me` and `/auth/password/change` only.
5. After the password change, the affiliate gets full access to the affiliate allowlist.
6. There is **no self-service reset**. Resets are admin-only (`/cbr/agents/:id/reset-password`).

### 2.2 Tokens
| | Access | Refresh |
|---|---|---|
| Format | HS256 JWT, issuer `neocore-vault-mobile-v2` | HS256 JWT, `typ: "refresh"` |
| TTL | **1 hour** | **30 days** |
| Claims | `sub` (agent id), `typ:"access"`, `email`, `name`, `phone`, `agent_id`, `roles:[]`, `ver`, **`role`**, **`referral_code`**, `must_change`, `iat`, `exp` | `sub`, `typ`, `ver` |
| Revocation | `ver` (token version) is bumped on password change. Refresh with a stale `ver` → `401 session revoked, please log in`. Access tokens are verified statelessly, so they live out their hour. | |

`role` and `referral_code` are baked into the access token. A back-office role or code change takes effect **≤1h later** (at the next refresh).

### 2.3 Storage (mobile)
| Item | Where | Key |
|---|---|---|
| Access token | `flutter_secure_storage` (Keychain / Keystore) | `vm2_access_token` |
| Refresh token | `flutter_secure_storage` | `vm2_refresh_token` |
| Profile (non-secret: agent fields, `server_time`, `token_expires_at`, role, referral code/link, rate) | Drift SQLite single-row `auth_session` table | – |
| Device id (ULID, minted once, audit-only) | `flutter_secure_storage` | `vm2_device_id` |

Sources: `core/network/token_store.dart`, `core/network/session_persistence.dart`, `features/auth/controllers/auth_controller.dart:99-108`. Tokens never touch the database. `server_time` is adopted to correct client clock skew.

### 2.4 Attaching the token
- `Authorization: Bearer <access>` goes on every request whose path does **not** end with `/auth/login` or `/auth/refresh` (`ApiConfig.isPublic`).
- `/auth/me` and `/auth/password/change` **are** authenticated.
- Source: `interceptors/auth_interceptor.dart:41-54`, `api_config.dart:219, 244`.

### 2.5 401 → refresh → replay once
```
protected request ──► 401
   │ (not public, not already retried)
   ▼
SessionRefresher.refresh()   ── single-flight: concurrent 401s share one call
   │  POST /auth/refresh {refresh_token}   (public Dio)
   ├─ 200 → persist new session (both tokens + profile), mark FRESH,
   │        replay original request once with new Bearer
   ├─ 401/403 → mark STALE, surface original 401 to caller
   └─ network/5xx → NOT stale (offline ≠ stale), surface original 401
```
Sources: `auth_interceptor.dart:56-102`, `core/network/session_refresher.dart`.

### 2.6 Session states (client) and routing
| State | Condition | Where the affiliate lands |
|---|---|---|
| `AuthAuthenticating` | Drift session row not yet read (cold start) | `/login` showing "Authenticating…" (≤6s) |
| `AuthSignedOut` | No session row | `/login` |
| `AuthMustChangePassword` | Row has `must_change_password: true` | `/auth/change-password?forced=true` (pinned) |
| `AuthSignedIn` | Row present, fresh | `/` → `AffiliateShell` if `role` ∈ {`affiliate`, `affiliate_marketer`, `marketer`} (trimmed, case-insensitive); anything else, including the server's `staff`, → agent shell |
| `AuthStale` | Row present and a refresh was rejected, **or** a cold start offline with an expired `token_expires_at` | Stays in the shell. **No banner in the affiliate shell.** Subsequent calls show the server's 401 message inline. May visit `/login` to re-auth without losing the cached session. |

Sources: `features/auth/domain/auth_state.dart`, `features/auth/controllers/auth_controller.dart:31-65`, `app/router.dart:386-432`, `features/auth/domain/vault_user_role.dart`.

### 2.7 Sign-out
`AuthRepository.signOut()` clears both tokens and the Drift row, then marks the session fresh, then `go('/login')`. **No network call.** Server-side, the access token stays valid ≤1h and the refresh token ≤30d. Nothing bumps `ver` on logout. Source: `features/auth/data/auth_repository.dart:170-176`.

### 2.8 Server-side gates (enforced in `Authenticate`, `api/vaultMobile2/middleware.go:219-275`)
| Gate | Rule | Response |
|---|---|---|
| Missing or bad header | not `Bearer …` | `401 missing or malformed Authorization header` |
| Bad token | signature, expiry or parse failure | `401 invalid or expired token` |
| Wrong token type | refresh token used as access | `401 invalid token type` |
| Temp password | `must_change` claim and path not in {`/auth/password/change`, `/auth/me`} | `403 password change required — please set a new password to continue` |
| Affiliate allowlist | role `affiliate` may only call `GET /auth/me`, `POST /auth/password/change`, `GET /promos`, `GET /affiliate/*` | `403 not available on an affiliate account` (includes `PATCH /auth/me`, `/sync/*`) |
| Affiliate-only reads | `/affiliate/*` requires role `affiliate` **and** a non-empty referral code | `403 only available on an affiliate account` |

### 2.9 Web-port implications for auth
- **Token storage:** there is no Keychain equivalent. The recommendation is a BFF holding tokens in `httpOnly; Secure; SameSite` cookies. The alternative (access token in memory, refresh token in `localStorage`) exposes a 30-day credential to XSS.
- **Refresh:** keep single-flight and replay-once semantics.
- **Stale vs offline:** keep the mobile distinction. Only a 401/403 from `/auth/refresh` means "sign in again".
- **Device id:** optional. Mint one per browser if you want parity (audit-only server-side).
- **Logout:** clear client state. Consider asking backend for a revoke endpoint if shared browsers are a concern.
- **Connectivity gate:** mobile refuses login when offline ("You must be online to sign in."). Web can use `navigator.onLine`.

---

## 3. Endpoint reference

Shapes are in TypeScript notation for readability. The `?` marks a key that can be **absent**; `| null` marks a key that is present as `null`.

### Shared types
```ts
type AuthSession = {
  token: string;                 // access JWT. "" on GET /auth/me
  refresh_token?: string;        // absent on GET /auth/me
  token_expires_at: string;      // RFC3339 (on /me: expiry of the token you called with)
  agent: Agent;
  permissions: string[];         // always [] for VM2 agents
  server_time: string;           // RFC3339, used for clock-skew correction
};

type Agent = {
  id: string;
  name: string;
  email: string;
  phone: string;                 // always present; may be ""
  role: "affiliate" | "staff";   // server emits "staff" when unset
  referral_code?: string;        // affiliates only (4–16 upper-case alphanumerics)
  referral_link?: string;        // only when server env AFFILIATE_SIGNUP_URL is set: `${url}?ref=${code}`
  commission_rate_bps?: number;  // affiliates only; default 150 (1.5%)
  active: boolean;               // ALWAYS false for affiliates: gates till ops, NOT account status
  till_gl_id?: string;           // staff only
  max_till_balance?: number;     // staff only, kobo
  must_change_password: boolean; // always emitted
};
```

### 3.1 `POST /vault-mobile/v2/auth/login`
| | |
|---|---|
| Auth | None (public Dio). Mobile also sends an `Idempotency-Key` ULID, which the server ignores. |
| Server | `api/vaultMobile2/auth.go:175-238` |
| Client | `features/auth/data/auth_api.dart:35-51` ← `auth_repository.dart:58-81` ← `auth_controller.dart:69-80` |
| Triggered by | **S2 Login → "Continue"**. Only when the email matches the regex and the password is non-empty. Blocked client-side when offline. |

Request:
```json
{ "email": "aisha@example.com", "password": "…", "device_id": "01J…ULID" }
```
The client trims `email`. The server also lower-cases it. `device_id` is optional.

Response `data`: `AuthSession` with both tokens.

Errors:
| Status | `message` | Client mapping → UI |
|---|---|---|
| 400 | `invalid request body` / `email and password are required` | `ValidationFailure` → banner titled with message + "Please, check your input and try again." |
| 401 | `invalid credentials` | `AuthFailure` → same titled banner |
| 403 | `this account has been disabled` / `no Vault Mobile password set for this account — contact your superadmin to be issued a temporary password` | `AuthFailure(forbidden)` → titled banner + "check your input" subtitle (misleading) |
| 423 | `account temporarily locked, try again later` (after **5** failed attempts, for **15 min**) | `AuthFailure(locked)` → titled banner + "Please wait a few minutes before trying again." |
| 500 | `internal error` / `could not issue token` | `ServerFailure` (after 3 attempts) → simple banner |
| – | transport | `NetworkFailure` → "No internet connection." |

On success the client:
1. Writes the tokens to secure storage.
2. Writes the profile row.
3. Syncs the clock to `server_time`.
4. Marks the session fresh.

The router guard then redirects: `must_change_password` → S3, otherwise → `/` (affiliate shell).

### 3.2 `POST /vault-mobile/v2/auth/password/change`
| | |
|---|---|
| Auth | Bearer. Allowed while `must_change`. Mobile also attaches an `Idempotency-Key`, which the server ignores. |
| Server | `auth.go:304-364` |
| Client | `auth_api.dart:58-70` ← `auth_repository.dart:92-113` ← `auth_controller.dart:86-94` |
| Triggered by | **S3 "Set password"**, after client validation (current non-empty, new ≥ 8 characters, confirm matches). Blocked client-side when offline ("You must be online to change your password."). |

Request:
```json
{ "current_password": "TEMPpass23", "new_password": "a-strong-password" }
```
Response `data`: a **fresh `AuthSession`** (new tokens, `must_change_password: false`). The server bumps `ver`, so the old refresh token is dead. **Both stored tokens must be replaced.**

Errors:
| Status | `message` | UI |
|---|---|---|
| 400 | `invalid request body` / `password must be at least 8 characters` / `new password must be different from the current password` | Banner (the server sends no field map) |
| 401 | `current password is incorrect` (does **not** count toward lockout) | Error under the "Current password" field (matched on substring `current password`). **Side effect:** the auth interceptor can't tell this 401 from an expired token. It first runs `POST /auth/refresh` and replays the change once, so a wrong password costs a refresh plus a second attempt before the error shows. On web, either skip refresh-on-401 for this route or ask backend to return 400/403 here. |
| 401 | token errors | Refresh-and-replay path |
| 403 | `this account has been disabled` | Banner |
| 500 | `could not change password` / `could not issue token` | Banner |

S3's **"Sign out"** calls no endpoint (§2.7).

### 3.3 `GET /vault-mobile/v2/auth/me`
| | |
|---|---|
| Auth | Bearer (app Dio). Allowed while `must_change` and for affiliates. |
| Server | `auth.go:241-257` |
| Client | `auth_api.dart:83-86` ← `auth_repository.dart:142-168` (`hydrate`) |
| Triggered by | **Cold start**, once, as a microtask on the first build of `AuthController`, and only if an access token is stored. No UI element triggers it. The affiliate Profile tab reads the cached profile and does **not** refetch. |

Response `data`: `AuthSession` with `token: ""`, no `refresh_token`, and `token_expires_at` = the calling token's expiry. Persisted with `storeTokens: false`.

Errors: `401 not authenticated` (agent deleted) or token errors, which go to refresh and replay. All failures are swallowed and the cached session is kept. An offline cold start with an expired cached `token_expires_at` → `AuthStale`.

### 3.4 `POST /vault-mobile/v2/auth/refresh`
| | |
|---|---|
| Auth | None (public Dio) |
| Server | `auth.go:262-295` |
| Client | `core/network/session_refresher.dart:62-96` |
| Triggered by | **Any 401 from a protected endpoint** (§2.5). Never directly from UI. |

Request: `{ "refresh_token": "<jwt>" }`. Response `data`: `AuthSession` with a new access token and a **new refresh token**. The client stores both. Rotation is not enforced server-side: an older refresh token stays usable until `ver` changes or it expires.

Errors:
| Status | `message` | Client effect |
|---|---|---|
| 400 | `refresh_token is required` | throws → caller gets original 401 (not stale) |
| 401 | `invalid or expired refresh token` / `invalid refresh token` / `session revoked, please log in` | **marks stale** |
| 500 | `could not issue token` | not stale |

### 3.5 `GET /vault-mobile/v2/affiliate/summary`
| | |
|---|---|
| Auth | Bearer, role `affiliate` |
| Server | `api/vaultMobile2/affiliate.go:197-247` |
| Client | `features/affiliate/data/affiliate_api.dart:26-45` ← `controllers/affiliate_home_summary_controller.dart` (`affiliateHomeSummaryProvider(from:, to:)`, a family keyed by window) |
| Consumed by | **T1 Home** metric grid (+ inline error note) |

Query (both optional, `YYYY-MM-DD`):
| Param | Semantics |
|---|---|
| *(none)* | **Calendar month to date** (Lagos): `from` = 1st 00:00, `to` = now |
| `from` | inclusive start of day, Lagos |
| `to` | inclusive through 23:59:59.999999999, Lagos |
| one only | the missing bound keeps its month-to-date default |

The client sends both or neither. It sends the **device-local** y/m/d of the dates picked in S5 (`_dateOnly`, `affiliate_api.dart:111-114`). For web, compute these in `Africa/Lagos` so "today" matches the server's window.

Response `data`:
```ts
type AffiliateSummary = {
  from: string;            // RFC3339 resolved window start (Lagos offset)
  to: string;              // RFC3339 resolved window end
  referrals: number;       // customers whose signup (RegDate) is inside the window
  applications: number;    // their loan applications SUBMITTED inside the window
  disbursed_count: number; // commission records earned inside the window
  disbursed_kobo: number;  // Σ principal of those
  earnings_kobo: number;   // Σ commission of those (paid + pending)
};
```

| Field | UI |
|---|---|
| `referrals` | Tile "Referrals" |
| `applications` | Tile "Applications" |
| `disbursed_count` | Tile label "Disbursed • N loan(s)" |
| `disbursed_kobo` | Tile value (compact ₦, with full-₦ tooltip) |
| `earnings_kobo` | Tile "Earnings" (compact ₦ with tooltip) |
| `from`, `to` | Parsed but **not displayed**. The label comes from local state ("This Month" or the picked range). |

Errors:
- `400 from and to must be YYYY-MM-DD` (also returned when `from` > `to`).
- `403 only available on an affiliate account`.
- `500 could not load your referrals` / `could not load your earnings` / `could not load your referrals' loans`.
- All render as the inline error note above the tiles, with tiles showing "—".

### 3.6 `GET /vault-mobile/v2/affiliate/referrals`
| | |
|---|---|
| Auth | Bearer, role `affiliate` |
| Server | `affiliate.go:116-195`; shape in `presenters/affiliate.go:19-160` |
| Client | `affiliate_api.dart:47-65` ← `controllers/affiliate_referrals_controller.dart` (`affiliateReferralsProvider`) |
| Consumed by | **T1 Home** "Recent Referrals" (top 3 by `stage_updated_at` desc) and **T2 Referrals** (all, API order) |

No query params and no pagination. The server returns **every** customer who signed up with the code.

Response `data`:
```ts
type ReferralStage =
  "signed_up" | "applied" | "approved" | "disbursed" | "rejected" | "declined" | "cancelled";

type Referral = {
  customer_id: string;
  name: string;
  phone: string;
  signed_up_at: string;          // RFC3339
  stage: ReferralStage;
  stage_updated_at: string;      // RFC3339
  loan: ReferralLoan | null;     // null until the customer applies; always the LATEST application
  commission: { amount_kobo: number; status: "estimated" | "pending" | "paid" } | null;
};

type ReferralLoan = {
  application_id: string;
  amount_kobo: number;           // approved amount if one exists, else requested
  pending_actions: { item: string; status: string }[];   // key + status only, never staff notes
  rejection?: {                  // only when stage === "rejected"
    reason: string;              // e.g. "affordability-issue"
    summary: string;             // fixed affiliate-facing wording
    next_step: string;
    resolved: boolean;
    affordability_threshold?: number;   // policy threshold only (affordability-issue)
    minimum_required_months?: number;   // policy threshold only (business-issue)
  };
  decline_message?: string;      // only when stage === "declined"; always "This application was not approved."
};
```

How the server derives fields (`presenters/affiliate.go`, `affiliate.go:104-114`):

| Field | Rule |
|---|---|
| `stage` | no application → `signed_up`; ProvisionallyApproved / OfferAccepted → `approved`; OfferDisbursed → `disbursed`; Rejected → `rejected`; Declined → `declined`; CancelledByUser → `cancelled`; **any other status → `applied`** |
| `stage_updated_at` | no application → signup date; else application `LastUpdate` → `SubmissionDate` → `StartDate` |
| `commission` | If a commission record exists for the loan → `{pending|paid}`. Else if stage ∈ {applied, approved, **rejected**} → `{estimated}` = `round(amount × current_rate_bps / 10000)`. Else `null` (signed_up, declined, cancelled, and disbursed-without-record). |
| `rejection.summary` / `next_step` | Fixed map for `age-issue`, `location-issue`, `bvn`, `business-issue`, `business-type-issue`, `affordability-issue`, `exposure-issue`, `outstanding-credit-issue`, `collateral-issue`, `unreachable-contact-issue`. Unknown → "The application needs attention." / "The customer should check the NeoCash app for next steps." |

Privacy allowlist (server comment and Postman doc): the payload **never** contains income, repayments, credit history, BVN, documents, addresses, staff notes, or decline reasons. Don't add fields.

| Field | UI (see DESIGN_AUDIT §4.11) |
|---|---|
| `name` | Card title |
| `stage` | Badge + status sentence |
| `stage_updated_at` | Card meta date (`d Mon`); Home sort key |
| `phone` | Expanded row "Phone Number" |
| `loan.amount_kobo` | "Loan Amount" (`₦` full), or "No loan yet" |
| `commission` | "Commission" `₦x • Estimated/Pending/Paid`, or "Not applicable" |
| `loan.rejection.summary` + `next_step` | Follow-up hint (rejected) |
| `loan.decline_message` | Follow-up hint (declined) |
| `loan.pending_actions[0]` | Follow-up hint (applied/approved): "Bank statement is pending." |
| `customer_id`, `signed_up_at`, `loan.application_id`, `rejection.reason`, `resolved`, thresholds | **Parsed or sent but unused** in the UI |

Errors:
- `403 only available on an affiliate account`.
- `500 could not load your referrals`.
- Home: inline error note under "Recent Referrals".
- Referrals tab: full empty-state card "Couldn't load referrals" + message.

### 3.7 `GET /vault-mobile/v2/affiliate/earnings`
| | |
|---|---|
| Auth | Bearer, role `affiliate` |
| Server | `affiliate.go:249-307` |
| Client | `affiliate_api.dart:67-90` ← `controllers/affiliate_earnings_controller.dart` (`affiliateEarningsProvider`) |
| Consumed by | **T3 Earnings** |

Query: `from`, `to` (`YYYY-MM-DD`, optional). Omitting both means **all time** (unlike summary). The window filters on `earned_at`. **The client never sends them**, so Earnings is always all-time.

Response `data`:
```ts
type AffiliateEarnings = {
  total_kobo: number;     // paid + pending
  paid_kobo: number;
  pending_kobo: number;
  records: {
    customer_name: string;
    principal_kobo: number;   // disbursed principal
    amount_kobo: number;      // commission
    rate_bps: number;         // rate AT THE TIME it was earned
    status: "pending" | "paid";   // pending = held 24h after disbursement
    earned_at: string;        // RFC3339
    paid_at?: string;         // only once paid
  }[];                        // newest first; only earned commission (no estimates)
};
```

| Field | UI |
|---|---|
| `total_kobo` | Hero "Total Earnings" (full if it fits, else compact + tooltip) |
| `paid_kobo` / `pending_kobo` | Hero mini metrics "Paid" / "Pending" |
| `records[].customer_name` | Row title |
| `records[].principal_kobo`, `earned_at` | Row meta "`₦x disbursed • d Mon`" |
| `records[].amount_kobo` | Row amount |
| `records[].status` | Row status (green if paid, purple otherwise) |
| `rate_bps`, `paid_at` | Parsed, unused |

The hero footnote rate comes from the **session** (`agent.commission_rate_bps`), not this endpoint.

Errors: `400 from and to must be YYYY-MM-DD`, `403 …`, `500 could not load your earnings` → empty-state card "Couldn't load earnings" + message. The hero shows `₦0.00`.

### 3.8 `GET /vault-mobile/v2/promos`
| | |
|---|---|
| Auth | Bearer. **Any** agent (not just affiliates). Staff get the same cards with `{link}` replaced by `""`. |
| Server | `api/vaultMobile2/promos.go`; `presenters/affiliate.go:207-231` |
| Client | `affiliate_api.dart:92-109` ← `controllers/affiliate_promos_controller.dart` (`affiliatePromoCardsProvider`) |
| Consumed by | **T1** carousel (all), **T2** fixed card (`[0]`), **T4** card (`[length-1]`), **D1** dialog |

Response `data`:
```ts
type Promo = {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;   // ALWAYS a string; "" when unset (client models it as nullable)
  share_text: string;  // back-office text with "{link}" replaced by the referral link,
                       // or by the bare referral code when AFFILIATE_SIGNUP_URL is unset
  link: string;        // ALWAYS a string; "" when unset
}[];                   // active promos only, newest first (CreatedAt desc); same set for everyone
```

| Field | UI |
|---|---|
| `id` | Picks the decorative gradient/icon theme (hash mod 4) |
| `title` | Card title, dialog title |
| `subtitle` | Card subtitle |
| `share_text` | Copied to the clipboard by "Share Promo". **Share as-is; never rebuild client-side.** |
| `image_url`, `link` | **Unused** |

Error: `500 could not load promos`. UI: Home hides the carousel; T2 and T4 omit the card. No error is shown anywhere.

---

## 4. UI trigger map

`affiliate*Provider`s are Riverpod `@riverpod` functional providers: auto-dispose, no persistence, no polling. `AffiliateShell` builds all four tabs at once in an `IndexedStack`, so **every tab's providers are watched from the moment the shell mounts**.

| # | UI event | Provider(s) | HTTP |
|---|---|---|---|
| 1 | App cold start with a stored token | `AuthController.build` → `AuthRepository.hydrate` | `GET /auth/me` |
| 2 | S2 "Continue" | `AuthController.login` | `POST /auth/login` |
| 3 | S3 "Set password" | `AuthController.changePassword` | `POST /auth/password/change` |
| 4 | S3 "Sign out" / D2 "Log Out" | `AuthController.signOut` | none |
| 5 | **Shell mounts** (after login, or cold start as affiliate) | `affiliateHomeSummaryProvider(null,null)`, `affiliateReferralsProvider`, `affiliateEarningsProvider`, `affiliatePromoCardsProvider` | **4 parallel GETs**: summary (month to date), referrals, earnings, promos. Referrals and promos are shared across tabs and fetched once. |
| 6 | T1 range picked in S5 → "Confirm Dates" | `affiliateHomeSummaryProvider(from,to)` (new family member; the old one auto-disposes) | `GET /affiliate/summary?from=…&to=…` |
| 7 | T1 range cleared (×) | `affiliateHomeSummaryProvider(null,null)` (disposed earlier, so it refetches) | `GET /affiliate/summary` |
| 8 | T1 pull-to-refresh | refresh summary(current window) + referrals + promos | 3 GETs (also updates T2 and T4, which share the data) |
| 9 | T2 pull-to-refresh | refresh referrals + promos | 2 GETs |
| 10 | T3 pull-to-refresh | refresh earnings | 1 GET |
| 11 | T4 | – (reads the cached session plus the shared promos) | none |
| 12 | Copy referral code / "Share Promo" | – | none (clipboard) |
| 13 | Tab switch, "View all", opening dialogs | – | none |
| 14 | Any 401 on #1, #3, #5–10 | `SessionRefresher` | `POST /auth/refresh` (then replays the request) |
| 15 | *Mobile only, background:* connectivity regained, or stale→fresh | `SyncController` → `OutboxWorker.drain` → `ChangePuller.pull` | `GET /sync/changes` → **403 for affiliates**, silently swallowed. **Do not port.** (`core/sync/sync_controller.dart:211-227`, `core/sync/outbox_worker.dart:381-392`) |

### Loading and error rendering by consumer
| Consumer | Loading | Error | Empty |
|---|---|---|---|
| Home tiles (summary) | "—" | Inline note + "—" | n/a |
| Home carousel (promos) | Loading card | hidden | hidden |
| Home recent referrals | section hidden | Heading + inline note | section hidden |
| T2 list (referrals) | **"No Referrals Yet" card** | "Couldn't load referrals" card | "No Referrals Yet" card |
| T2 / T4 promo card | absent | absent | absent |
| T3 hero (earnings) | **₦0.00** | ₦0.00 | ₦0.00 |
| T3 records | **"No Earnings Yet" card** | "Couldn't load earnings" card | "No Earnings Yet" card |

---

## 5. Error → message mapping (client)

`core/network/dio_failure.dart` turns the parsed `{message}` into a typed `Failure`. The UI shows `failure.message`, which is the **server's string when present**, otherwise the default below.

| HTTP | Failure | Default message (only if the server sent none) |
|---|---|---|
| no response: timeout or connection error | `NetworkFailure` | "No internet connection." |
| cancelled | `NetworkFailure` | "Request cancelled." |
| bad certificate | `NetworkFailure` | "Could not establish a secure connection." |
| 400 | `ValidationFailure` (+ `fieldErrors` from `data.errors[]`; VM2 auth never sends them) | "Please check the highlighted fields." |
| 401 | `AuthFailure` | "Your session has expired. Please sign in again." |
| 403 | `AuthFailure(forbidden)` | "You do not have access to this." |
| 409 | `ConflictFailure` | "This record was updated elsewhere." |
| 423 / 429 | `AuthFailure(locked)` | "Account temporarily locked. Try again later." |
| 5xx (after 3 attempts) | `ServerFailure` | "Something went wrong on our end." |
| other | `UnknownFailure` | "Something went wrong." |

Because neocore always sends `message`, users actually see strings like `could not load your referrals` or `invalid or expired token`. A web copy map keyed on status and endpoint would read better.

---

## 6. Client ↔ server contract drift

| # | Drift | Effect in the mobile app | Web handling |
|---|---|---|---|
| 1 | `image_url` and `link` are always strings (`""` when unset). The client models them as nullable. | None (both unused). | Treat `""` as absent |
| 2 | `agent.phone` is always a string, possibly `""`. The client treats any non-null value as present. | Profile renders an empty phone line. | Treat `""` as absent |
| 3 | `rejected` referrals carry `commission.status: "estimated"`. | Shows "₦x • Estimated" on a rejected card. This is intended per the Postman doc. | Keep, or relabel |
| 4 | `decline_message` is always "This application was not approved.". The client fallback copy "This application was declined." is dead in practice. | – | Use the server string |
| 5 | Summary `from` / `to` are RFC3339 timestamps, not dates. | Unused. | Could drive the "This Month" label |
| 6 | Referral order is whatever `ListCustomersFilteredByII` returns (undocumented). | The Referrals tab shows it unsorted. | Sort explicitly |
| 7 | `rejection.reason`, `resolved` and thresholds are sent. | Ignored. | Optional: show "resolved" state or thresholds |
| 8 | `commission_rate_bps` omitted → the client shows "—" / generic copy. For affiliates the server always sends ≥1 (default 150). | – | – |
| 9 | Mock backend (`VM2_MOCK_BACKEND=true`, debug builds only) differs from real: summary `from`/`to` in UTC; `referral_link` always present; share text "…Use my referral code AFFEY2026."; promo `image_url: null`; huge earnings totals (to exercise compact formatting). | Dev only. | Don't use the mock as the contract |

---

## 7. Dev fixtures

| Account (mock backend only) | Password | Role |
|---|---|---|
| `affey@yahoo.com` | `12345` | affiliate (code `AFFEY2026`, rate 150 bps) |
| `agatha@neocash.com` | `12345` | staff |

Mock fixtures live in `core/network/mock/mock_backend_interceptor.dart:585-765`. Enable with `VM2_MOCK_BACKEND=true` in `.env`; it's forced off in release builds. The Postman collection holds realistic real-backend examples for every endpoint in §3.

---

## 8. Related affiliate endpoints not used by VM2 (context only)

These are from the same Postman collection. They're out of scope for the affiliate web app, but useful for knowing where data comes from.

| Surface | Endpoints |
|---|---|
| Customer app (become an affiliate) | `GET /app/v2/affiliate/enrolment`, `GET /app/v2/affiliate/code-available?code=`, `POST /app/v2/affiliate/enrolment` |
| Back-office | `/cbr/affiliate-enrolments` (list / approve / reject), `/cbr/affiliates` (list / update / referrals / earnings), `/cbr/promos` (list / create / update) |
| System | `GET /wh/affiliate-commissions/release`: cron that moves `pending` → `paid` after the 24h hold |
