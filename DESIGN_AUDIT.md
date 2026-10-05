# Affiliate Flows: Design Audit

Source of truth for porting the **affiliate marketer** experience of Vault Mobile 2 (Flutter) to web.
Nothing here is aspirational. Every value is read from code.

| Source | Location | Revision |
|---|---|---|
| Mobile app | `STMFB/vm_new/vault-mobile-2` | `main` @ `7eba2f2` |
| Design system (`neocash_core_ui`) | `STMFB/neocash/packages/neocash_core_ui` (resolved via `.dart_tool/package_config.json` / `pubspec.lock` path dep) | `3056c56` |
| Affiliate UI | `lib/features/affiliate/presentation/affiliate_shell*.dart` (one library split into 7 `part` files) | |

File references below are relative to the mobile repo unless prefixed `core_ui/` (the design-system package's `lib/src/`).

---

## 0. What matters most for the web port

1. **The whole affiliate app is one screen with four in-memory tabs.** `AffiliateShell` holds the tab in `setState`. Tabs have no routes or URLs, and there is no back-stack between them. Only three things are "real" navigation: login → (forced password change) → shell, a pushed date-range picker, and two dialogs.
2. **Two different "primary" purples exist.** Affiliate widgets use `neocash_core_ui` `AppColors.primary` = `#8C70FF`. The app's Material theme (snackbar, pull-to-refresh spinner, ripple overlays) uses the app-local `AppColors.primary` = `#917CFF`. Pick one for web; `#8C70FF` is what the affiliate UI actually paints.
3. **Two type families.** Clash Grotesk is used for almost everything, always at **line-height 1.0**. Segoe UI is used for 12px labels and button text (line-height 1.5 / 1.25). Segoe UI is a Microsoft font, and the package ships a single regular-weight `.ttf`. Licensing for web embedding needs a decision (§5.2).
4. **Loading states render as empty states.** Referrals and Earnings show "No Referrals Yet" / "No Earnings Yet" and `₦0.00` while their fetch is in flight (§7). Decide whether the web port reproduces this or fixes it.
5. **The design is phone-only.** No breakpoints, no hover states, no desktop layout exist. Web needs a layout decision (§7).

---

## 1. Flow map and screen inventory

```
cold start
   │
   ▼
/login ──(AuthAuthenticating)──► S1 Auth settling ("Authenticating…", ≤6s then falls back to login)
   │ signed out
   ▼
S2 Login ──Continue──► POST auth/login
   │                        │
   │   must_change_password │ role = affiliate ('affiliate' | 'affiliate_marketer' | 'marketer', case-insensitive)
   ▼                        ▼
S3 Set your password ──► "/" ─► S4 AffiliateShell  (any shell route renders it: "/", "/loans", "/notifications", "/profile")
   (Sign out → /login)          ├── T1 Home ──────┬─ tap range label ──► S5 Date range selector (pushed route)
                                │                  ├─ tap promo card ───► D1 Promo dialog
                                │                  ├─ copy code ─────────► snackbar
                                │                  └─ "View all" ────────► switches to T2
                                ├── T2 Referrals ─── tap promo card ───► D1 Promo dialog
                                ├── T3 Earnings
                                └── T4 Profile ───┬─ tap promo card ───► D1 Promo dialog
                                                   └─ Log Out ──────────► D2 Log out? ──► signOut → /login
```

| ID | Screen / surface | Kind | Source |
|---|---|---|---|
| S1 | Auth settling | Route body (placeholder) | `lib/app/router.dart:434-563` |
| S2 | Login ("Welcome Back!") | Route `/login` | `lib/features/auth/presentation/login_screen.dart` |
| S3 | Set your password (forced) | Route `/auth/change-password?forced=true` | `lib/features/auth/presentation/change_password_screen.dart` |
| S4 | Affiliate shell (header + sheet + floating nav) | Shell for `/` | `affiliate_shell.dart:57-132`, `affiliate_shell_layout.dart` |
| T1 | Home tab | Tab (IndexedStack child 0) | `affiliate_shell_tabs.dart:3-243` |
| T2 | Referrals tab | Tab 1 | `affiliate_shell_tabs.dart:245-412` |
| T3 | Earnings tab | Tab 2 | `affiliate_shell_tabs.dart:414-465` |
| T4 | Profile tab | Tab 3 | `affiliate_shell_tabs.dart:467-592` |
| S5 | Select Date Range | Pushed `MaterialPageRoute` | `core_ui/screens/date_range_selector_screen.dart` |
| D1 | Official promo dialog | `showDialog` (root navigator) | `affiliate_shell_actions.dart:14-78` |
| D2 | Log out? confirm | `showDialog` (root navigator) | `lib/shared/layout/log_out_confirm_dialog.dart` |
| – | Copy snackbar | `SnackBar` (floating) | `affiliate_shell_actions.dart:3-12` |
| – | Full-amount tooltip | `Tooltip` (tap-triggered) | `affiliate_shell_widgets.dart:101-107, 521-525` |

**Not reachable by affiliates:**
- The voluntary "Change password" screen. It is only linked from the *agent* Profile.
- Profile editing. The backend returns 403 to affiliates anyway.
- `ForgotPasswordSheet` (`forgot_password_sheet.dart`). It exists but nothing references it, and there is no reset endpoint.

---

## 2. Navigation patterns

| Pattern | Behaviour | Source |
|---|---|---|
| Auth guard | go_router `redirect`. `AuthAuthenticating` → `/login` (shows S1). `AuthMustChangePassword` → pinned to `/auth/change-password?forced=true`. Signed-out → `/login`. `AuthSignedIn` on `/login` → `/`. A **stale** session may stay on `/login` to re-auth. Forced change success → `/`. | `router.dart:386-432` |
| Role switch | The shell route builder reads `vaultUserRoleProvider` and returns `AffiliateShell` for affiliates. It ignores go_router's `navigationShell`, so every shell URL shows the same affiliate UI. | `router.dart:91-101` |
| Tabs | Local `setState` enum `{home, referrals, earnings, profile}` driving an `IndexedStack`. All four tabs are built at mount and keep their state (scroll position, date range). Switching is instant, with no transition. The header title/subtitle swaps per tab. | `affiliate_shell.dart:32, 64-131` |
| Programmatic tab switch | Home "View all" → Referrals tab (`onViewAllReferrals`). | `affiliate_shell.dart:105-108` |
| Floating tab bar | Custom draggable pill bar (§4.2), positioned 20px from left/right/bottom of the sheet. It overlays content, so scroll views pad 116px at the bottom. | `affiliate_shell_bottom_navigation.dart` |
| Pushed screen | `Navigator.push(MaterialPageRoute)` → S5. It returns `(from, to)` on confirm and `null` on back. Transition is the platform default (Cupertino slide / Android zoom). | `affiliate_shell_tabs.dart:19-38` |
| Modal dialogs | `showDialog(useRootNavigator: true)` so they paint over the floating nav. Default Material barrier (black 54%), dismiss on barrier tap or back. | `affiliate_shell_actions.dart:14-20`, `log_out_confirm_dialog.dart:22-28` |
| Pull-to-refresh | `RefreshIndicator` on Home, Referrals and Earnings. None on Profile. | `affiliate_shell_layout.dart:41-67`, `affiliate_shell_tabs.dart:375` |
| Sign-out | Confirm dialog → `authController.signOut()` → `context.go('/login')`. | `affiliate_shell_tabs.dart:587-592` |
| System back | No handling in the shell. Tabs aren't a stack, so Android back leaves the app. On S3 (forced) back is blocked with `PopScope(canPop:false)`. | `change_password_screen.dart:260` |

---

## 3. Screens

Shared text styles are defined once at `affiliate_shell.dart:34-55`. They are referred to below by these names:

| Name | Definition |
|---|---|
| `titleStyle` | Clash Grotesk 24 / w600 / lh 1.0 / `#333366` |
| `sectionTitleStyle` | Clash Grotesk 18 / w600 / lh 1.0 / `#333366` |
| `bodyStyle` | Clash Grotesk 14 / w400 / lh 1.0 / `#333366` (often recoloured `#626290`) |
| `labelStyle` | Segoe UI 12 / w400 / lh 1.5 / `#626290` |

> All Clash Grotesk styles derive from `AppTypography2.heading5` (`core_ui/tokens/typography2.dart:47`), whose **line-height is 1.0**. Multi-line body copy (empty-state messages, follow-up hints, dialog copy) is therefore set solid. Match this deliberately on web, since the browser default is ~1.2.

### S1 Auth settling
- White background with `signup-sprite.png` (decorative pale-lavender ring arc) pinned top-left at full width.
- Centered column: Lucide `cloud` 40px `#333366`, 12px gap, then "Authenticating" plus 0–3 animated dots. Dots step every 400ms, each in an 8px-wide slot. Text is Segoe UI 16 / lh 1.5 / `#333366`.
- Shown while auth state resolves. After **6s** it falls back to the login form.

### S2 Login
Layout: `ScreenLayoutWithBackButton` (`core_ui/widgets/layouts/screen_layout_with_back_button.dart`).
- White background with the same sprite. SafeArea scroll with 32px top padding and 14px side padding. No back button, just a 24px spacer.
- Heading **"Welcome Back!"**: Clash Grotesk 32 / w500 / lh 1.0 / `#333366`. 8px gap.
- Subtitle **"Sign in to continue managing your customers."**: Segoe UI 12 / `#333366`. The copy is agent-oriented, and affiliates see it too.
- Form block: 24px top padding, 6px extra side padding (20px total from the screen edge).
  1. Error banner, if any. `AppInfoCard` (§4.14) on white with red icon and text. Two variants:
     - *titledFull* (server-documented errors): title = server message; subtitle "Please, check your input and try again." or, for 423/429, "Please wait a few minutes before trying again."
     - *simple* (network/unknown): message only.
     - 24px gap after.
  2. `VaultTextField` (§4.13): label "What's your work email address?", placeholder "You@Neocash.com", email keyboard. 24px gap.
  3. `VaultTextField`: label "What's your password?", placeholder "Password", obscured with an eye toggle. 24px gap.
  4. Right-aligned **Continue**: primary / small button with Lucide `arrow-right` 18 white.
     - Disabled until the email matches `^[^@\s]+@[^@\s]+\.[^@\s]+$` and the password is non-empty.
     - Shows a spinner while submitting.
     - Keyboard "done" on the password field only dismisses the keyboard and does **not** submit ("a stray submit shouldn't spend a login attempt").
- Field-level errors come from a 400 `data.errors[]` (`email`, `password`). Any edit clears all errors.
- There is no "Forgot password" link.

### S3 Set your password (forced)
- White background, SafeArea.
- Header: "Set your password" in Clash Grotesk 20 / w500, 24px padding. No back button.
- Scroll body, 24px padding:
  - Copy "You're signed in with a temporary password. Choose a new one to continue." (`bodyStyle`, grey). 24px gap.
  - Optional error `AppInfoCard.simple`, then 20px.
  - Three `VaultTextField`s (all obscured), 20px apart:
    - "Current password": placeholder "Your temporary password"
    - "New password": placeholder "At least 8 characters"
    - "Confirm new password": placeholder "Re-enter your new password"
- Footer, 24px padding:
  - Full-width primary / medium **Set password**.
  - 12px gap.
  - Full-width *text*-variant **Sign out** (Segoe UI 16 / w600 `#626290`).
- Client validation runs before any request:
  - "Enter your current password"
  - "Use at least 8 characters"
  - "Passwords do not match"
- Server errors:
  - 401 "current password is incorrect" → shown under the Current field.
  - Other messages → banner.

### S4 Affiliate shell (frame for T1–T4)
```
┌──────────────────────────────┐  Scaffold bg #FFFFFF, SafeArea(top only)
│  Title (titleStyle, 1 line)  │  header padding L24 T24 R20 B24
│  4px                          │
│  Subtitle (body, grey, ≤2 ln)│
├──────────────────────────────┤
│╭────────────────────────────╮│  sheet: #F1F1F1, top corners r32, fills rest of screen
││  tab content (IndexedStack) ││  scroll padding L20 T24 R20 B116
││                             ││
││ ╭────────────────────────╮  ││  floating nav: 20px from sheet left/right/bottom
││ │ Home Referrals Earn Prof│  ││  (bottom SafeArea is NOT applied: sits 20px above the
││ ╰────────────────────────╯  ││   physical bottom edge, not above the home indicator)
```
| Tab | Title | Subtitle |
|---|---|---|
| Home | Home | Track referred customers and earnings. |
| Referrals | Referrals | Customers who used your referral code. |
| Earnings | Earnings | Commission from disbursed loans. |
| Profile | Profile | *(the affiliate's referral code; blank if none)* |

### T1 Home
Top to bottom, inside the standard tab scroll (padding 20/24/20/116):

1. **Referral code card** (§4.4). Only when `referral_code` is non-empty. 16px gap after.
2. **Promo carousel** (§4.8), full-bleed to the screen edges:
   - Loading: 150px loading card (§4.10).
   - Loaded with ≥1 card: strip of 150px (1 card) or 166px (≥2 cards, adds dots).
   - Error or empty: nothing, and no reserved space.
   - 20px gap after, if loading or showing cards.
3. **Range selector row**: a tappable label in `sectionTitleStyle` (InkWell, radius 8) reading **"This Month"** (default) or **"3 Sep – 25 Sep"** (`d Mon – d Mon`, en dash).
   - When a custom range is set, a Lucide `x` 16px `#626290` (2px padding, circular ink) clears it.
   - There is no chevron or other affordance that the label is tappable.
   - 12px gap.
4. **Inline error note** (§4.6) if the summary fetch failed, then 12px.
5. **2×2 metric grid** (§4.5): aspect ratio 1.42 (w/h), 12px main/cross spacing.
   | Tile | Label | Value | Icon (Lucide) | Colour |
   |---|---|---|---|---|
   | 1 | Referrals | count | `user-search` | `#8C70FF` |
   | 2 | Applications | count | `hand-coins` | `#2F7DF6` |
   | 3 | `Disbursed • N loan(s)` (plain "Disbursed" while loading) | compact ₦ + tap tooltip with the full ₦ | `badge-check` | `#0E8F66` |
   | 4 | Earnings | compact ₦ + tap tooltip with the full ₦ | `wallet` | `#173EAE` |
   - While loading or on error, every value is "—" (em dash).
6. **Recent Referrals**:
   - On error: 20px gap, section heading (§4.7) "Recent Referrals" / "View all", 12px gap, inline error note.
   - With data: 20px gap, heading, 12px gap, then the **top 3 referrals sorted by `stage_updated_at` desc**. Each is a collapsed referral card (§4.11) with 12px bottom padding.
   - While loading or empty: the section is omitted entirely.
- Pull-to-refresh refetches summary (current window), referrals and promos.

### T2 Referrals
A two-layer composition, not a single scroll column:
- **Background layer (fixed):** if promos exist, the *first* promo card sits at the top of the sheet. It is 150px tall with 8px side padding, the shimmer is on, and it opens D1 on tap.
- **Foreground (scrolls):** a `ListView`:
  - Transparent spacer of 170px (150 promo + 20 gap), or 0 with no promos.
  - Then a **white sheet** with top corners r28, min-height = viewport height − spacer, padding 20/24/20/116.
  - Scrolling slides the white sheet up over the fixed promo.
- Sheet content:
  - **"Customers"** heading (`sectionTitleStyle`). It **fades out** over the final 40px before reaching the viewport top: `opacity = clamp((headingOffset − scrollOffset) / 40, 0, 1)`, where `headingOffset = spacer + 24`.
  - 12px gap.
  - **Every referral** as an *expanded* referral card (§4.11), 12px apart, **in API order (not sorted)**.
  - Empty / loading: empty-state card (§4.9). Lucide `user-search`, "No Referrals Yet", "Share your referral code. Customers will show here once they sign up through NeoCash."
  - Error: Lucide `triangle-alert`, "Couldn't load referrals", with the server message as the body.
- Pull-to-refresh refetches referrals and promos.

### T3 Earnings
Standard tab scroll:
1. **Earnings hero** (§4.12): total, paid, pending. Values are `0` while loading or on error. 20px gap.
2. "Commission Records" (`sectionTitleStyle`). 12px gap.
3. Records (API order, newest first) as earning rows (§4.12b), 12px apart.
   - Empty / loading: empty-state card, Lucide `wallet`, "No Earnings Yet", "Commission history will appear here after referred loans are disbursed."
   - Error: `triangle-alert`, "Couldn't load earnings", with the server message.
- There is no date filter. The screen is always all-time.
- Pull-to-refresh refetches earnings.

### T4 Profile
Standard tab scroll, **no pull-to-refresh**:
1. **Profile card**: `AppCard` r28, border 1px `#E9EAF0`, padding 20, white.
   - Row:
     - Avatar: 56px circle, `#EAE6FB` fill, Lucide `circle-user` 26 `#333366`.
     - 16px gap.
     - Column:
       - Name (`sectionTitleStyle`).
       - If `phone` is non-null: 6px gap, phone (`bodyStyle` grey, 1 line).
       - 6px gap, email (`bodyStyle` grey, 1 line).
   - 20px gap.
   - Info rows (§4.15):
     - "Role" → "Affiliate Marketer" (hard-coded)
     - "Referral Code" → code (only if non-empty)
     - "Commission Rate" → "1.5% per disbursed loan", or "—"
2. If promos exist: 16px gap, then the **last** promo card, full-bleed, 150px, shimmer on, tappable.
3. 32px gap. Right-aligned **Log Out**: danger / medium button with Lucide `arrow-right` 18 white → D2.

### S5 Select Date Range (pushed, from `neocash_core_ui`)
- Scaffold `#FFFFFF`, SafeArea.
- Header row (padding h24 v8):
  - 32px circular back button: bg `#F4F2FF`, Material `arrow_back_ios` 18 black, 4px padding.
  - Centered title "Select Date Range": Segoe UI 20 / w600 / lh 1.5 / `#333366`.
  - 32px right spacer.
- 8px gap. **Hint pill**, centered:
  - Style: bg `#8C70FF` @12%, padding h16 v6, r999, Segoe UI 12 / w600 `#8C70FF`.
  - Copy by state: "Tap a start date" → "Now tap your end date" → "Date range selected".
- 16px gap. **Calendar box**: fixed height 350, outer side padding 14, inner padding 16, white, r16.
  - Month header: "September 2026" (Segoe UI 16 / w600 black) plus an inline chevron-right 20 `#8C70FF`. Prev/next chevrons are 24px, `#8C70FF`, or `#626290` when disabled, 8px apart.
  - 12px gap. Weekday row **SUN…SAT** (week starts Sunday): Segoe UI 12 / w700 `#C5C5C7`.
  - 6px gap. 7-column grid, 2px row spacing. Each day is a 36px circle.
    | State | Fill | Text |
    |---|---|---|
    | default | none | black, w400 |
    | disabled (outside `firstDate`–`lastDate`) | none | `#626290` |
    | today (not selected) | none | `#8C70FF`, w600 |
    | inside range | `#8C70FF` @12% | `#8C70FF`, w600 |
    | start / end | `#8C70FF` | white, w600 |
- 16px gap. **FROM / TO row**:
  - Container: side padding 14; white; padding h32 v14; r12.
  - "FROM" / "TO" labels: Segoe UI 16 `#757575`.
  - Values: `Sep 3, 2026` in Segoe UI 16 / w600 `#333366`, or `___` when unset.
  - Separator: chevron-right 20 `#626290`.
- Spacer, then the full-width primary / medium **Confirm Dates** button with Material `arrow_forward_ios` 14 white. Side padding 24, bottom gap 24. Disabled until both dates are set.
- Selection logic:
  - 1st tap sets start.
  - 2nd tap sets end. If the tapped day is earlier than the start, the two swap.
  - 3rd tap restarts.
  - Same-day ranges are allowed.
- Bounds from Home: `firstDate` = Jan 1 two years ago; `lastDate` = now.

### D1 Official promo dialog
- `Dialog`: inset 24, r28, white, padding 20, no elevation.
- Header row: `neocash-logo.png` at 84×28 (contain), spacer, "Official promo" (`labelStyle`, `#8C70FF`, w600).
- 16px gap. Mini promo card (§4.8, no shimmer). 20px gap.
- Promo `title` (`sectionTitleStyle`). 8px gap.
- Fixed copy (`bodyStyle` grey): "Share this promo with your network. Customers who sign up with your referral code can be tracked from your dashboard."
- 20px gap. Right-aligned **Share Promo**: primary / small button with Lucide `share-2` 18 white.
- Share Promo **copies `share_text` to the clipboard** and shows the snackbar "Copied <entire share text>". It does not open a native share sheet, and the dialog stays open.

### D2 Log out?
- `Dialog`: white, inset 24, r20, padding 24.
- "Log out?": Clash Grotesk 18 / w600, centered. 8px gap.
- "You'll need to sign in again to continue.": Segoe UI 16 / lh 1.5 `#626290`, centered. 24px gap.
- Row of two equal buttons, 8px apart:
  - **Cancel**: outlined / medium, resolves `false`.
  - **Log Out**: danger / medium with Lucide `log-out` 16 white, resolves `true`.

### Transient surfaces
| Surface | Spec |
|---|---|
| Copy snackbar | Material `SnackBar`, floating. Content "Copied {value}". From the app theme: bg `#2D3261`, white text, system font (the theme's `ClashGrotesk` family isn't registered at app level, so it falls back). Default 4s. |
| Tooltip | Material default (dark grey, white text), `triggerMode: tap`. Shows the unabbreviated `₦1,234,567,890.12`. |
| Pull-to-refresh | Material `RefreshIndicator`. Spinner is the theme primary `#917CFF`. |

---

## 4. Component catalog

Components are listed in dependency order. All `AppCard`s in the affiliate UI pass `elevation: 0`, so **none have shadows** unless noted.

### 4.1 Shell header: `_AffiliateHeader` (`affiliate_shell_layout.dart:3-39`)
- Padding L24 T24 R20 B24 (asymmetric).
- Title: `titleStyle`, 1 line ellipsis. 4px gap.
- Subtitle: `bodyStyle` in `#626290`, max 2 lines ellipsis.

### 4.2 Floating tab bar: `_AffiliateBottomNavigation` (`affiliate_shell_bottom_navigation.dart`)
| Part | Spec |
|---|---|
| Container | h56; padding h6 v4; bg white @85% (no backdrop blur); 1px white border; r32; shadow `0 10px 30px rgba(51,51,102,.08)` |
| Items | 4 equal columns. Icon 18px, 4px gap, label Clash Grotesk 11 / w500 (scale-down to fit, 1 line) |
| Items (order) | Home: Material `home_outlined` (**not Lucide**). Referrals: Lucide `user-search`. Earnings: `wallet`. Profile: `circle-user` |
| Selection pill | Full item width × inner height (48px); `#8C70FF` @14%; r28; sits behind the icons |
| Item colour | Linear interpolation from `#333366` to `#8C70FF` by the pill's **overlap fraction** with the item (0→1). Colour tracks the pill continuously while it moves |
| Tap | Pill animates from its current x to the target, **230ms easeOutBack**, with a selection haptic. The tab switches immediately at tap |
| Drag | Pan anywhere on the bar. The pill centres under the finger (clamped), and a haptic fires on each hovered-index change. On release or cancel it snaps to the hovered index, **260ms easeOutBack** |

### 4.3 Tab scroll: `_AffiliateScrollView` (`affiliate_shell_layout.dart:41-68`)
`ListView` padding L20 T24 R20 **B116** (56 bar + 20 offset + 40 clearance). Optionally wrapped in `RefreshIndicator`.

### 4.4 Referral code card: `_ReferralCodeCard` (`affiliate_shell_widgets.dart:3-47`)
- `AppCard`: white, r28, border 1px `#E0D9FF`, padding 20.
- "Your Referral Code" (`labelStyle`). 8px gap.
- Row:
  - Code: Clash Grotesk **28 / w700** `#333366`, expanded.
  - **Round action button** (§4.16) with Lucide `copy` → clipboard copy plus snackbar.
- The widget takes a `promoCards` parameter it never uses. It's a leftover from a removed "campaign button".

### 4.5 Metric tile: `_MetricCard` (`affiliate_shell_widgets.dart:49-115`)
- `AppCard`: white, r24, padding 16, **no border**.
- Column `spaceBetween`:
  - Top: icon disc, 32px circle, fill = tile colour @10%, icon 17px in the tile colour.
  - Bottom:
    - Value: Clash Grotesk 18 / w700 `#333366`, 1 line ellipsis. Wrapped in a tap tooltip when `fullValue` is present, which is always the case for money tiles once loaded.
    - Label: `labelStyle`.

### 4.6 Inline error note: `_InlineErrorNote` (`affiliate_shell_widgets.dart:123-155`)
- Padding h12 v10. Fill `#FF383C` @6%, border 1px `#FF383C` @20%, r14.
- Row: Lucide `triangle-alert` 16 `#FF383C`, 8px gap, message in `labelStyle` `#FF383C`.
- Used for *partial* failures that sit beside other content (Home summary, Home recent referrals).

### 4.7 Section heading with action: `_SectionHeading` (`affiliate_shell_widgets.dart:205-239`)
- Title (`sectionTitleStyle`, expanded).
- `TextButton` on the right: foreground `#8C70FF`, padding h8 v4, text Clash Grotesk 13 / w500. The theme also imposes min-height 44, r16, and a ripple overlay of theme primary @6%.

### 4.8 Promo card family (`affiliate_shell_promo.dart`)
| Piece | Spec |
|---|---|
| **Mini promo card** `_MiniPromoCard` (202-325) | 150px tall, full width, r28, clipped. Background is the campaign linear gradient, **top-left → bottom-right**. Shadow `0 14px 28px rgba(140,112,255,.22)`, applied twice in code (outer and inner), so it renders darker than a single shadow. |
| Content | Padding 20. Left column, vertically centred: accent badge, 8px, **title** (Clash Grotesk 21 / w700 white, 1 line), 4px, **subtitle** (Clash Grotesk 14 / w400 white @88%, line-height 1.18, max 2 lines). 12px gap. Right: **logo disc**. |
| Accent badge `_PromoAccentBadge` | Pill r999; fill white @18%; border 1px white @22%; padding h10 v5. Campaign primary icon 13 white, 6px gap, **"NeoCash Promo"** (Segoe UI 11 / w600 white). Decorative, since the wire has no category. |
| Logo disc | 52px circle, white @92%, shadow `0 8px 18px rgba(51,51,102,.14)`. `neocash-logo.png` at 34×24, contain. |
| Doodle layer `_PromoDoodleLayer` (414-469) | Pointer-transparent. Positions are relative to the card:<br>• ring 116px, 16px stroke, white @16%, at right −24 / top −28<br>• ring 94px, white @10%, at right 70 / bottom −42<br>• stroke pill 92×28, 7px stroke, white @14%, rotated −0.16 rad, at left −18 / bottom −26<br>• secondary icon 34px, white @16%, −0.18 rad, at right 88 / top 24<br>• tertiary icon 28px, white @14%, +0.2 rad, at right 26 / bottom 26<br>• "spark" plus-shape (26×4 and 4×26 bars), white @18%, at left 18 / top 16 |
| Shimmer `_PromoShimmerSweep` (563-616) | Overlay gradient white 0 → 18% → 0 at stops .34/.5/.66. Slanted: begin `(x−.45, −1)`, end `(x+.45, 1)` with `x = −1.6 + 3.2t`. **Continuous 5s linear loop** (`repeat(period: 5s)` overrides the 1800ms duration). |
| Campaign themes `_PromoCampaignTheme` (327-374) | Chosen by `promo.id.hashCode.abs() % 4`:<br>0. `#8F73FF → #1F55D9`, icons users-round / coins / share-2<br>1. `#8F73FF → #2F7DF6`, briefcase-business / calendar-clock / wallet-cards<br>2. `#18A47A → #1746B8`, store / trending-up / package-check<br>3. `#162E8E → #8F73FF`, vault / lock-keyhole / percent<br>Dart `String.hashCode` isn't reproducible in JS, so web needs its own stable hash. The theme per promo **won't match mobile**. |
| Tappable wrapper `_TappablePromoCard` | InkWell r28 → D1 |
| Full-bleed wrapper `_FullBleedPromo` | Escapes the 20px list padding to the full screen width. Callers add 8px side padding. |
| Carousel `_AnimatedPromoStrip` (3-102) | Horizontal pager, one card per page (8px side padding). **Autoplay every 5s** → next page (wrapping to 0), **460ms easeOutCubic**. The timer does not pause or reset on manual swipe. Only the current page shows the shimmer. With ≥2 cards: 10px gap, then dots, each 6px tall with 3px side margin, r999. Active dot is 18px wide `#8C70FF`; inactive is 6px `#8C70FF` @22%. Width and colour animate over 220ms. |

### 4.9 Empty-state card: `_AffiliateEmptyStateCard` (`affiliate_shell_widgets.dart:157-203`)
- `AppCard`: white, r28, border 1px `#E9EAF0`, padding h20 v24. Column centred:
  - Icon disc: 48px, `#F9F9F9` fill, 1px `#E9EAF0` border, icon 22 `#333366`.
  - 16px gap. Title (`sectionTitleStyle`, centred).
  - 8px gap. Message (`bodyStyle` grey, centred).
- Also used for full-screen *error* states, swapping the icon to `triangle-alert`.

### 4.10 Promo loading card: `_PromoLoadingCard` (`affiliate_shell_promo.dart:159-200`)
Theme-0 gradient, doodle layer, centred 26px spinner (stroke 2.4, white @70%), and the shimmer. No text.

### 4.11 Referral card: `_ReferralCard` (`affiliate_shell_widgets.dart:241-353`)
- `AppCard`: white, r24, border 1px `#E0D9FF`, padding 16.
- **Row:**
  - Avatar: 40px circle, `#F9F9F9`, 1px `#E9EAF0` border, Lucide `circle-user` 18 `#333366`.
  - 12px gap.
  - Column:
    - `name` (`bodyStyle` w600).
    - 4px gap.
    - `"{status text} • {d Mon}"` (`labelStyle`).
  - 8px gap.
  - **Stage badge**: padding h10 v6, r18, fill = stage colour @10%, text Clash Grotesk 11 / w600 in the stage colour.
- **Stage table:**
  | wire `stage` | Badge | Colour | Status text |
  |---|---|---|---|
  | `signed_up` (and any unknown value) | Signed up | `#333366` | Signup complete |
  | `applied` | Applied | `#8C70FF` | Application in review |
  | `approved` | Approved | `#2F7DF6` | Loan approved |
  | `disbursed` | Disbursed | `#0E8F66` | Loan disbursed |
  | `rejected` | Rejected | `#FF383C` | Application rejected |
  | `declined` | Declined | `#FF383C` | Application declined |
  | `cancelled` | Cancelled | `#626290` | Application cancelled |
- **Expanded** (Referrals tab only):
  - Divider: 32px tall space, 1px `#E9EAF0`.
  - Info rows (§4.15):
    - "Phone Number" → `phone`
    - "Loan Amount" → `₦x,xxx.xx`, or "No loan yet"
    - "Commission" → `₦x,xxx.xx • Estimated|Pending|Paid`, or "Not applicable"
  - 8px gap, then the **follow-up hint** (`bodyStyle` grey, left-aligned):
    | Stage | Hint |
    |---|---|
    | rejected | `rejection.summary + " " + rejection.next_step`, else "This application was rejected." |
    | declined | `decline_message`, else "This application was declined." |
    | signed_up | Encourage customer to start a loan application. |
    | disbursed | paid → "Commission has been paid." · pending → "Commission is pending — released 24h after disbursement." · else "Loan disbursed." |
    | cancelled | This application was cancelled. |
    | applied / approved | No pending actions → "Application is being reviewed." Otherwise the first action: `"{Humanized item} is {status}."`, e.g. "Bank statement is pending." |

### 4.12 Earnings hero: `_EarningsHero` (`affiliate_shell_widgets.dart:355-491`)
- Container: padding 20, **`#1F55D9`**, r28, clips children. Shadow `0 12px 24px rgba(31,85,217,.25)`.
- Decorative circles, white @7%, clipped by the card:
  - 100px at top −70 / right −60
  - 110px at bottom −90 / left −70
  - These are offsets from the *padded* content box.
- Content:
  - "Total Earnings" (`bodyStyle` white). 8px gap.
  - **Amount**: Clash Grotesk **34 / w700** white, via fit-or-compact (§4.12c). 16px gap.
  - Row of two equal **mini metrics**, 12px apart:
    - Each: padding 12, white @12%, r20.
    - Amount: Clash Grotesk 14 / w600 white, fit-or-compact.
    - 4px gap. Label "Paid" / "Pending" (`labelStyle` white).
  - 16px gap.
  - Footnote (`labelStyle` white @84%): "You earn {rate}% whenever an eligible referred loan is disbursed." Without a rate: "You earn commission whenever an eligible referred loan is disbursed."

**4.12b Earning row** `_EarningRow` (531-583):
- `AppCard`: white, r22, padding 16, no border.
- Left column:
  - `customer_name` (`bodyStyle` w600).
  - 4px gap.
  - `"{₦principal} disbursed • {d Mon}"` (`labelStyle`).
- Right column, end-aligned:
  - `₦amount` (`bodyStyle` w700).
  - 4px gap.
  - Capitalised status (`labelStyle` w600): `#0E8F66` when paid, otherwise `#8C70FF`.

**4.12c Fit-or-compact amount** `_FitOrCompactAmount` (495-529):
- Measures the full `₦1,234,567.89` string at the current style and text scale.
- If it fits the available width, it shows the full string.
- Otherwise it shows the compact form (`₦1.2M`) with a tap tooltip holding the full value.

### 4.13 Text field: `VaultTextField` (`lib/shared/inputs/vault_text_field.dart`)
- Label: Clash Grotesk 14 / w500 `#333366`. 8px gap.
- Input:
  - Background white. Content padding 12/12.
  - Border: **r24**, 1px `#E0E0E0` at rest, **2px `#8C70FF`** focused. Error state is `#FF383C` (2px when focused).
  - Value: Clash Grotesk 14 / w400 `#333366`. Placeholder: same, in `#626290`.
- Password fields: Iconsax Plus Linear `eye-slash` / `eye` 20 `#333366` suffix toggle.
- Error: 8px gap, then Segoe UI 12 `#FF383C` below the field.
- Tapping outside the field unfocuses it.

### 4.14 Info card: `AppInfoCard` (`core_ui/widgets/cards/app_info_card.dart`)
- Full width, r12. Padding h14 v10 by default; the login titled variant uses h12 v16.
- Iconsax `info-circle` 20, 8px gap.
- Text:
  - *simple*: message (Segoe UI 12).
  - *titledFull*: icon plus title (Segoe UI 12 / w600) on the first row, then 8px, then message (Segoe UI 12).
- On auth screens: white background with red icon and text, so effectively no visible container.

### 4.15 Info row: `_ProfileInfoRow` (`affiliate_shell_widgets.dart:585-610`)
- 12px bottom padding.
- Title (`labelStyle`, expanded), 12px gap, value (`bodyStyle` w500, right-aligned, wraps).

### 4.16 Round action button: `_RoundActionButton` (`affiliate_shell_widgets.dart:612-635`)
- 40px circle: `#F9F9F9` fill, 1px `#E9EAF0` border, icon 18 `#333366`, circular ripple.
- **No accessible label.**

### 4.17 Buttons: `AppButton` (`core_ui/widgets/buttons/`)
Content is `[text][gap][icon]`, with the icon *after* the text. Loading replaces the content with a spinner (stroke 2). The shape is **r32**.

| Variant | Fill | Border | Text / icon | Disabled |
|---|---|---|---|---|
| primary | `#8C70FF` | 1px `#B5A3FF` | white | fill and border @30% |
| danger | `#FF383C` | 1px `#FF5252` | white | fill and border @30% |
| outlined | transparent | 1px `#8C70FF` | `#8C70FF` | border and text @30% |
| text | transparent | none | `#626290` | – |

| Size | Padding | Text | Icon gap | Spinner |
|---|---|---|---|---|
| small | h20 v12 | Segoe UI 14 / w600 / lh 1.25 / ls 0.5 | 8 | 14 |
| medium | h24 v16 | Segoe UI 16 / w600 / lh 1.25 / ls 0.5 | 8 | 16 |
| large *(unused)* | h40 v24 | 18px | 12 | 20 |

Used: Continue (primary S), Set password (primary M, full width), Sign out (text M, full width), Share Promo (primary S), Log Out (danger M), Cancel (outlined M), Log Out in dialog (danger M), Confirm Dates (primary M, full width).

---

## 5. Design tokens

### 5.1 Colour

**Design-system tokens used by the affiliate UI** (`core_ui/tokens/colors.dart`):

| Token | Hex | RGB | Used for |
|---|---|---|---|
| `primary` | `#8C70FF` | 140 112 255 | Brand. Primary button, "Applied" stage, pending status, links, nav active, calendar selection, dots, Referrals tile |
| `primaryAccent` | `#B5A3FF` | 181 163 255 | Primary button border |
| `primaryDark` | `#333366` | 51 51 102 | Default text, icons, nav inactive, "Signed up" stage |
| `grayText` / `primaryGray` | `#626290` | 98 98 144 | Secondary text, labels, placeholders, "Cancelled", disabled calendar days, text-button text |
| `grayActive` | `#F1F1F1` | 241 241 241 | Shell content sheet |
| `backgroundGray` | `#F9F9F9` | 249 249 249 | Avatar and icon discs |
| `white` | `#FFFFFF` | | Surfaces, cards |
| `black` | `#000000` | | Calendar day numbers, month label, back arrow |
| `red` | `#FF383C` | 255 56 60 | Errors, Rejected/Declined stages, danger button, field error |
| `redAccent` (Material) | `#FF5252` | | Danger button border |
| `purpleBorderLight` | `#E0D9FF` | 224 217 255 | Referral code card border, referral card border |
| `inputBorder` | `#E0E0E0` | | Text field resting border |
| `textSecondary` | `#757575` | | "FROM" / "TO" labels |
| `backIconBackground` | `#F4F2FF` | | Date-range back button |

**Hard-coded in affiliate widgets** (not tokenised):

| Hex | RGB | Used for |
|---|---|---|
| `#E9EAF0` | 233 234 240 | Profile and empty-state card borders, avatar borders, divider (same value as app-local `input`) |
| `#EAE6FB` | 234 230 251 | Profile avatar fill |
| `#2F7DF6` | 47 125 246 | Applications tile, "Approved" stage, promo gradient #1 end |
| `#0E8F66` | 14 143 102 | Disbursed tile, "Disbursed" stage, "Paid" status |
| `#173EAE` | 23 62 174 | Earnings tile |
| `#1F55D9` | 31 85 217 | Earnings hero, promo gradient #0 end |
| `#8F73FF` | 143 115 255 | Promo gradient start (#0, #1), end (#3) |
| `#18A47A` → `#1746B8` | | Promo gradient #2 |
| `#162E8E` | 22 46 142 | Promo gradient #3 start |
| `#C5C5C7` | | Calendar weekday labels |

**App-theme colours that leak into affiliate surfaces** (`lib/core/theme/app_colors.dart`, via `ThemeData`):

| Hex | Where it shows up |
|---|---|
| `#917CFF` (app `primary`) | Pull-to-refresh spinner, ripple overlays (@6%) on themed buttons |
| `#2D3261` (app `foreground`) | Snackbar background |
| black @54% | Dialog barrier (Material default) |

**Alpha tints in use** (write as `rgba()` on web):

| Base | Alphas |
|---|---|
| `#8C70FF` | .10 (tile icon disc, Applied badge), .12 (hint pill, in-range day), .14 (nav pill), .22 (inactive dot; promo shadow) |
| `#333366` | .08 (nav shadow), .14 (logo-disc shadow) |
| `#FF383C` | .06 (inline error fill), .10 (badge), .20 (inline error border) |
| `#FFFFFF` | .07 (hero circles), .10/.14/.16/.18 (doodles), .12 (mini metric), .18 (promo badge fill, shimmer peak), .22 (badge border), .70 (loading spinner), .84 (hero footnote), .85 (nav bar), .88 (promo subtitle), .92 (logo disc) |
| stage / tile colour | .10 (badge and icon disc fills) |
| `#1F55D9` | .25 (hero shadow) |

### 5.2 Typography

| Family | Files available (in `neocash_core_ui/lib/fonts`) | Fallback | Web note |
|---|---|---|---|
| **Clash Grotesk** | `ClashGrotesk-{Extralight,Light,Regular,Medium,Semibold,Bold}.otf` (200–700) + variable `ClashGrotesk.ttf` | Arial, Helvetica | Indian Type Foundry face (distributed via Fontshare). Confirm the licence covers web embedding. |
| **Segoe UI** | `SegoeUI.ttf`: **regular only**, so w600/w700 are synthesised | Arial, Helvetica | Microsoft proprietary. Not freely web-embeddable. Needs a substitute or a local-font stack. |

Every style used in the affiliate flows (letter-spacing 0 unless noted):

| Role | Family | Size | Weight | Line height | Colour |
|---|---|---|---|---|---|
| Login heading "Welcome Back!" | Clash | 32 | 500 | 1.0 | `#333366` |
| Hero total earnings | Clash | 34 | 700 | 1.0 | white |
| Referral code | Clash | 28 | 700 | 1.0 | `#333366` |
| Shell title | Clash | 24 | 600 | 1.0 | `#333366` |
| Promo title | Clash | 21 | 700 | 1.0 | white |
| Forced change-password title | Clash | 20 | 500 | 1.0 | `#333366` |
| Section title, empty-state title, profile name, dialog titles, range label | Clash | 18 | 600 | 1.0 | `#333366` |
| Metric value | Clash | 18 | 700 | 1.0 | `#333366` |
| Body, subtitles, info values (w500), card names (w600), row amounts (w700), mini-metric amounts (w600) | Clash | 14 | 400–700 | 1.0 | `#333366` / `#626290` / white |
| Promo subtitle | Clash | 14 | 400 | 1.18 | white 88% |
| Field label / value / placeholder | Clash | 14 | 500 / 400 / 400 | 1.0 | `#333366` / `#333366` / `#626290` |
| "View all" | Clash | 13 | 500 | 1.0 | `#8C70FF` |
| Nav label | Clash | 11 | 500 | 1.0 | interpolated |
| Stage badge | Clash | 11 | 600 | 1.0 | stage colour |
| Date-range title | Segoe | 20 | 600 | 1.5 | `#333366` |
| Button text | Segoe | 16 (M) / 14 (S) | 600 | 1.25, ls 0.5 | per variant |
| Calendar month, day numbers, FROM/TO values | Segoe | 16 | 600 (days 400 default) | 1.5 | black / `#333366` |
| FROM/TO labels | Segoe | 16 | 400 | 1.5 | `#757575` |
| Logout body, settling text | Segoe | 16 | 400 | 1.5 | `#626290` / `#333366` |
| **Label** (`labelStyle`): tile labels, meta lines, info-row titles | Segoe | 12 | 400 | 1.5 | `#626290` |
| Login subtitle | Segoe | 12 | 400 | 1.5 | `#333366` |
| Hint pill, info-card title | Segoe | 12 | 600 | 1.5 | `#8C70FF` / red |
| Weekday labels | Segoe | 12 | 700 | 1.5 | `#C5C5C7` |
| Field error, info-card message | Segoe | 12 | 400 | 1.5 | `#FF383C` |
| Promo "NeoCash Promo" badge | Segoe | 11 | 600 | 1.5 | white |

### 5.3 Spacing

Design-system scale (`core_ui/tokens/spacing.dart`): **4, 6, 7, 8, 10, 12, 16, 20, 24, 32, 40, 44**. The affiliate UI uses 4 / 6 / 8 / 10 / 12 / 16 / 20 / 24 / 32, plus the raw values below.

| Constant | Value | Where |
|---|---|---|
| Shell header padding | L24 T24 R20 B24 | §4.1 |
| Tab content padding | L20 T24 R20 **B116** | §4.3 |
| Floating nav inset | 20 (left / right / bottom) | S4 |
| Full-bleed promo side padding | 8 | promo cards and carousel pages |
| Referrals promo layer | 150 tall + 20 rest gap | T2 |
| Heading fade distance | 40 | T2 |
| Login side padding | 14 + 6 | S2 |
| Date-range screen side padding | 14 (calendar, from/to), 24 (header, button) | S5 |
| Dot margin / badge padding | 3 / h10 v5 | carousel / promo badge |
| Section rhythm | 12 (heading→content, between cards), 16 (card→card on Home), 20 (between sections) | T1–T4 |

### 5.4 Radii

| Radius | Used by |
|---|---|
| 999 (pill) | Carousel dots, promo badge, hint pill, stroke doodle |
| 32 | Shell sheet top corners, nav bar, all `AppButton`s |
| 28 | Referral code card, profile card, empty-state card, promo cards, promo dialog, Referrals white sheet top, nav pill, hero |
| 24 | Metric tile, referral card, text fields |
| 22 | Earning row |
| 20 | Mini metric, logout dialog |
| 18 | Stage badge |
| 16 | Calendar box, theme `TextButton` shape |
| 14 | Inline error note |
| 12 | Info card, FROM/TO row |
| 8 | Range-label ink |
| circle | Avatars, icon discs, round button, calendar day cells, hero circles |

### 5.5 Elevation / shadow

Flutter's `blurRadius` r is a Skia radius (σ = 0.57735r + 0.5), while CSS blur is 2σ. So **CSS blur ≈ 1.1547r + 1**, not 1:1.

| Element | Flutter (offset / blurRadius / colour) | CSS `box-shadow` |
|---|---|---|
| Floating nav bar | 0,10 / 30 / `#333366` @8% | `0 10px 36px rgba(51,51,102,.08)` |
| Promo card | 0,14 / 28 / `#8C70FF` @22%, applied twice in Flutter | `0 14px 33px rgba(140,112,255,.22)` ×2 layers |
| Promo logo disc | 0,8 / 18 / `#333366` @14% | `0 8px 22px rgba(51,51,102,.14)` |
| Earnings hero | 0,12 / 24 / `#1F55D9` @25% | `0 12px 29px rgba(31,85,217,.25)` |
| All `AppCard`s, dialogs | none (elevation 0) | none |

### 5.6 Motion

| Animation | Duration | Easing (CSS) |
|---|---|---|
| Nav pill on tap | 230ms | easeOutBack `cubic-bezier(.175,.885,.32,1.275)` |
| Nav pill snap after drag | 260ms | easeOutBack |
| Nav item colour | continuous, driven by the pill position | – |
| Carousel autoplay | every 5000ms, 460ms slide | easeOutCubic `cubic-bezier(.215,.61,.355,1)` |
| Carousel dot width / colour | 220ms | linear |
| Promo shimmer sweep | 5000ms loop | linear |
| Referrals "Customers" fade | scroll-linked over 40px | – |
| Settling dots | 400ms steps | – |
| Date-range push | platform default | – |
| Haptics | selection click on nav tap and hover change | (web: none / optional `navigator.vibrate`) |

### 5.7 Iconography

| Library | Icons (Flutter name → web name) |
|---|---|
| **Lucide** (`lucide_icons_flutter` 3.x → `lucide` / `lucide-react`) | `userSearch`→`user-search`, `wallet`, `circleUser`→`circle-user`, `handCoins`→`hand-coins`, `badgeCheck`→`badge-check`, `triangleAlert`→`triangle-alert`, `copy`, `share2`→`share-2`, `x`, `arrowRight`→`arrow-right`, `logOut`→`log-out`, `cloud`, `usersRound`→`users-round`, `coins`, `briefcaseBusiness`→`briefcase-business`, `calendarClock`→`calendar-clock`, `walletCards`→`wallet-cards`, `store`, `trendingUp`→`trending-up`, `packageCheck`→`package-check`, `vault`, `lockKeyhole`→`lock-keyhole`, `percent` |
| **Material Icons** | `home_outlined` (Home tab), `arrow_back_ios`, `arrow_forward_ios`, `chevron_left_rounded`, `chevron_right_rounded` (date-range screen) |
| **Iconsax Plus (Linear)** | `eye`, `eye_slash` (password toggle), `info_circle` (info card) |

Sizes in use: 13, 16, 17, 18, 20, 22, 24, 26, 28, 34, 40.

### 5.8 Assets

| File | Pixels | Displayed | Where |
|---|---|---|---|
| `assets/images/neocash-logo.png` | 174×105 | 84×28 (contain), 34×24 (contain) | Promo dialog header, promo logo disc |
| `assets/images/signup-sprite.png` | 375×610 | Full width, top-left, aspect kept | Login and settling backgrounds (pale lavender arc) |
| `assets/images/neocash-logo-white.png` | 956×580 | – | Not used in affiliate flows |

---

## 6. Display formatting rules

| Rule | Implementation | Examples |
|---|---|---|
| Money (full) | `formatKobo`: kobo → `₦` + grouped naira + `.` + 2-digit kobo; negative prefix `-` | `150000` → `₦1,500.00` |
| Money (compact) | `formatKoboCompact`: ≥ ₦1B → `B`, ≥ ₦1M → `M`, 1 decimal, drop `.0`; below ₦1M → full | `650000000` → `₦6.5M`, `300000000000` → `₦3B`. Edge: ₦999,999,999 → `₦1000M` |
| Percent | `commission_rate_bps / 100` printed with Dart `double.toString()` | 150 → `1.5`, 125 → `1.25`, **200 → `2.0`** |
| Short date | Local time, `d Mon`, no year, no zero-pad | `3 Sep` |
| Range label | `d Mon – d Mon` (en dash, spaced) | `3 Sep – 25 Sep` |
| Picker date | `Mon d, yyyy` | `Sep 3, 2026` |
| Unparseable ISO date | Raw string shown as-is; sorts as oldest | – |
| Pluralisation | `loan` / `loans` (`count == 1` only) | `Disbursed • 0 loans` |
| Status capitalisation | First letter upper-cased | `estimated` → `Estimated` |
| Pending-action key | snake_case → spaced, first letter capitalised | `bank_statement` → `Bank statement` |
| Placeholder | `—` (em dash) | loading tiles, missing commission rate |
| Glyphs | `•` (U+2022) as separator, `–` (U+2013) in ranges, `—` (U+2014) as placeholder | |

---

## 7. Inconsistencies and gaps to decide before building

| # | Finding | Evidence | Decision needed |
|---|---|---|---|
| 1 | Loading shows the empty state: "No Referrals Yet", "No Earnings Yet", hero `₦0.00`. Only Home tiles ("—") and the promo carousel have real loading states. | `affiliate_shell_tabs.dart:313-324, 434-454` | Replicate, or add skeletons |
| 2 | Two primaries: `#8C70FF` (widgets) vs `#917CFF` (theme spinner and ripples). Snackbar `#2D3261` comes from the app theme, not the design system. | §5.1 | Unify on `#8C70FF`? |
| 3 | Segoe UI is proprietary and ships regular-only (bold is synthesised). | §5.2 | Substitute font |
| 4 | Clash Grotesk line-height 1.0 everywhere, including multi-line paragraphs. | §3 note | Keep solid leading or loosen |
| 5 | "Share Promo" only copies to the clipboard, and the snackbar echoes the whole share text. | `affiliate_shell_actions.dart:60-71` | Web Share API with clipboard fallback? |
| 6 | Tabs have no URLs, and browser back/refresh would lose the tab. | §2 | Route per tab on web? |
| 7 | Promo theme is picked by `String.hashCode`, which is not portable. | §4.8 | Any stable hash; accept a mismatch with mobile |
| 8 | Percent renders `2.0%` for whole-number rates. | §6 | Format as `2%`? |
| 9 | Home sorts referrals by `stage_updated_at`, but the Referrals tab shows API order (unspecified server order). | `affiliate_shell_tabs.dart:88-99` vs `344` | Sort on web? |
| 10 | Profile subtitle is the bare referral code (blank if none). The phone line renders even when the server sends `""` (it is always a string server-side). | `affiliate_shell.dart:90`, `affiliate_shell_tabs.dart:511` | Treat `""` as absent |
| 11 | No stale-session UI in the shell. After a failed refresh, sections show the raw server message ("invalid or expired token"). | `affiliate_shell.dart` (no `AuthStale` handling) | Re-auth prompt on web? |
| 12 | Login copy is agent-oriented ("…managing your customers."). There is no forgot-password path (none exists server-side either). | S2 | Affiliate copy? Contact-support link? |
| 13 | Promo `image_url` and `link` are never rendered. | `affiliate_promo.dart` | Use the promo image on web? |
| 14 | Accessibility: icon-only copy button and nav have no labels. Tooltips are tap-only. There are no focus or hover states. | §4.2, §4.16 | Add for web |
| 15 | Phone-only layout: no breakpoints or max-width. The nav ignores the bottom safe-area inset. | S4 | Desktop / tablet layout |
| 16 | Unused `promoCards` parameter and a stale comment in `_ReferralCodeCard`. | `affiliate_shell_widgets.dart:8-10` | None (don't port) |
