import type { Config } from 'tailwindcss'

/**
 * NeoCash affiliate design tokens, ported from the Flutter app.
 * Every value traces to DESIGN_AUDIT.md §5 (section noted per block).
 *
 * `colors`, `fontFamily`, `fontSize`, `borderRadius` and `boxShadow` REPLACE
 * Tailwind's defaults rather than extending them, so only real tokens are
 * available (e.g. `text-sm`, `bg-gray-100`, `rounded-lg` do not exist here).
 * Spacing, opacity, easing and durations EXTEND the defaults: Tailwind's 4px
 * spacing grid already matches the mobile scale 1:1 (p-1 = 4px … p-8 = 32px).
 */
export default <Partial<Config>>{
  future: {
    // Mobile-first: hover styles only apply on devices that can hover.
    hoverOnlyWhenSupported: true,
  },
  theme: {
    // §5.1 Colour
    colors: {
      inherit: 'inherit',
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      black: '#000000',

      /** `AppColors.primary` / `primaryAccent`. The theme's #917CFF is deliberately not ported. */
      primary: {
        DEFAULT: '#8C70FF',
        accent: '#B5A3FF',
      },
      /** Text: `primaryDark`, `grayText`/`primaryGray`, `textSecondary`. */
      ink: {
        DEFAULT: '#333366',
        muted: '#626290',
        secondary: '#757575',
      },
      /** Backgrounds and fills. */
      surface: {
        DEFAULT: '#FFFFFF',
        sheet: '#F1F1F1', // `grayActive`: shell content sheet
        subtle: '#F9F9F9', // `backgroundGray`: avatar and icon discs
        lilac: '#EAE6FB', // profile avatar fill
        back: '#F4F2FF', // `backIconBackground`: date-range back button
      },
      /** Borders and dividers. */
      line: {
        DEFAULT: '#E9EAF0', // card borders, avatar borders, divider
        lilac: '#E0D9FF', // `purpleBorderLight`: referral code and referral cards
        input: '#E0E0E0', // `inputBorder`: text field at rest
      },
      danger: {
        DEFAULT: '#FF383C', // `red`
        accent: '#FF5252', // Material `redAccent`: danger button border
      },
      /** Tile and stage colours (hard-coded in the Flutter widgets). */
      data: {
        blue: '#2F7DF6', // Applications tile, "Approved" stage
        green: '#0E8F66', // Disbursed tile, "Disbursed" stage, "Paid" status
        navy: '#173EAE', // Earnings tile
        royal: '#1F55D9', // Earnings hero
      },
      /** Promo campaign gradient stops (§4.8). */
      campaign: {
        violet: '#8F73FF',
        royal: '#1F55D9',
        azure: '#2F7DF6',
        jade: '#18A47A',
        cobalt: '#1746B8',
        indigo: '#162E8E',
      },
      calendar: {
        weekday: '#C5C5C7',
      },
      /** Snackbar background (the app theme's `foreground`). */
      toast: '#2D3261',
      /** Material's default tooltip fill (grey 700 @ 90%). */
      tooltip: 'rgba(97, 97, 97, 0.9)',
    },

    // §5.2 Typography. `sans` is Clash Grotesk because it is the default face
    // for almost everything. `segoe` is only for 12px labels, buttons and the
    // date-range screen. Segoe UI is proprietary, so it resolves to the
    // device's local copy if one exists and otherwise to the platform UI font.
    fontFamily: {
      sans: ['"Clash Grotesk"', 'Arial', 'Helvetica', 'sans-serif'],
      clash: ['"Clash Grotesk"', 'Arial', 'Helvetica', 'sans-serif'],
      segoe: [
        '"Segoe UI"',
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont',
        'Roboto',
        'Arial',
        'Helvetica',
        'sans-serif',
      ],
    },

    // §5.2 type scale. Each size carries its line height, weight and
    // letter-spacing, so `font-clash text-section` (or `font-segoe text-label`)
    // is the whole style. Clash styles are line-height 1.0 like the app's
    // `heading5` base. Loosen them here if solid leading reads too tight on web.
    fontSize: {
      // Clash Grotesk
      hero: ['34px', { lineHeight: '1', fontWeight: '700' }], // total earnings
      'heading-login': ['32px', { lineHeight: '1', fontWeight: '500' }], // "Welcome Back!"
      code: ['28px', { lineHeight: '1', fontWeight: '700' }], // referral code
      title: ['24px', { lineHeight: '1', fontWeight: '600' }], // shell header title
      'promo-title': ['21px', { lineHeight: '1', fontWeight: '700' }],
      'title-sm': ['20px', { lineHeight: '1', fontWeight: '500' }], // "Set your password"
      section: ['18px', { lineHeight: '1', fontWeight: '600' }], // section/empty-state/dialog titles
      metric: ['18px', { lineHeight: '1', fontWeight: '700' }], // metric tile value
      body: ['14px', { lineHeight: '1', fontWeight: '400' }], // body, subtitles, row values
      action: ['13px', { lineHeight: '1', fontWeight: '500' }], // "View all"
      badge: ['11px', { lineHeight: '1', fontWeight: '600' }], // stage badge
      nav: ['11px', { lineHeight: '1', fontWeight: '500' }], // tab bar label

      // Segoe UI stack
      'ui-title': ['20px', { lineHeight: '1.5', fontWeight: '600' }], // "Select Date Range"
      ui: ['16px', { lineHeight: '1.5', fontWeight: '400' }], // dialog body, calendar, FROM/TO
      button: ['16px', { lineHeight: '1.25', fontWeight: '600', letterSpacing: '0.5px' }],
      'button-sm': ['14px', { lineHeight: '1.25', fontWeight: '600', letterSpacing: '0.5px' }],
      label: ['12px', { lineHeight: '1.5', fontWeight: '400' }], // tile labels, meta lines
      micro: ['11px', { lineHeight: '1.5', fontWeight: '600' }], // "NeoCash Promo" badge
      toast: ['14px', { lineHeight: '20px', fontWeight: '400' }], // snackbar (Material bodyMedium)
    },

    // §5.4 Radii, named by pixel value to match the audit tables.
    borderRadius: {
      none: '0',
      4: '4px', // Material tooltip and snackbar
      8: '8px',
      12: '12px',
      14: '14px',
      16: '16px',
      18: '18px',
      20: '20px',
      22: '22px',
      24: '24px',
      28: '28px',
      32: '32px',
      pill: '999px',
      full: '9999px',
    },

    // §5.5 Shadows. Flutter's `blurRadius` r is a Skia radius
    // (sigma = 0.57735r + 0.5). CSS blur is 2*sigma, so blur ≈ 1.1547r + 1.
    boxShadow: {
      none: 'none',
      nav: '0 10px 36px rgba(51, 51, 102, 0.08)', // r30
      // r28, painted twice in Flutter (outer + inner box), so two layers here.
      promo: '0 14px 33px rgba(140, 112, 255, 0.22), 0 14px 33px rgba(140, 112, 255, 0.22)',
      logo: '0 8px 22px rgba(51, 51, 102, 0.14)', // r18
      hero: '0 12px 29px rgba(31, 85, 217, 0.25)', // r24
    },

    extend: {
      // §5.3 Spacing: fixed layout constants that aren't on the 4px grid.
      spacing: {
        nav: '56px', // tab bar height
        'nav-clearance': '116px', // tab scroll bottom padding (56 + 20 + 40)
        promo: '150px', // promo card height
        'promo-strip': '166px', // carousel with dots (150 + 10 + 6)
      },

      // §5.1 Alpha tints used by the app, so `bg-primary/14` etc. work.
      opacity: {
        6: '0.06',
        7: '0.07',
        8: '0.08',
        12: '0.12',
        14: '0.14',
        16: '0.16',
        18: '0.18',
        22: '0.22',
        54: '0.54',
        84: '0.84',
        85: '0.85',
        88: '0.88',
        92: '0.92',
      },

      lineHeight: {
        promo: '1.18', // promo card subtitle
      },

      maxWidth: {
        app: '480px', // phone-width column on wider screens
        dialog: '432px', // app column minus the dialog's 24px inset each side
      },

      // §4.8 promo shimmer: a slanted white band crossing the card every 5s.
      keyframes: {
        shimmer: {
          from: { transform: 'translateX(-80%)' },
          to: { transform: 'translateX(80%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 5s linear infinite',
      },

      // §5.6 Motion.
      transitionTimingFunction: {
        'out-back': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Flutter easeOutBack
        'out-cubic': 'cubic-bezier(0.215, 0.61, 0.355, 1)', // Flutter easeOutCubic
      },
      transitionDuration: {
        220: '220ms', // carousel dots
        230: '230ms', // tab pill on tap
        260: '260ms', // tab pill snap after drag
        460: '460ms', // carousel slide
      },

      // §4.8 Promo campaign gradients. Flutter paints topLeft → bottomRight,
      // i.e. along the card's diagonal. 113deg is that diagonal for a
      // phone-width 150px-tall card (≈359px wide).
      backgroundImage: {
        'campaign-0': 'linear-gradient(113deg, #8F73FF, #1F55D9)',
        'campaign-1': 'linear-gradient(113deg, #8F73FF, #2F7DF6)',
        'campaign-2': 'linear-gradient(113deg, #18A47A, #1746B8)',
        'campaign-3': 'linear-gradient(113deg, #162E8E, #8F73FF)',
      },

      // Preflight falls back to these once the default palette is removed.
      borderColor: {
        DEFAULT: '#E9EAF0',
      },
      ringColor: {
        DEFAULT: '#8C70FF',
      },
    },
  },
}
