/**
 * Sigma Design System 3 — Design Tokens
 * Based on https://www.thesigma.co/designsystem-library/foundation
 *
 * All color values, typography scales, spacing, border-radii and elevation
 * tokens are centralised here so every screen stays consistent.
 */

// ─── CORE PALETTE (dark-mode variants) ──────────────────────────────────────
export const SigmaColors = {
  red: '#FF4245',
  orange: '#FF9230',
  yellow: '#FFD600',
  lime: '#A0CC33',
  green: '#30D158',
  mint: '#00DAC3',
  teal: '#00D2E0',
  cyan: '#3CD3FE',
  blue: '#0091FF',
  indigo: '#6B5DFF',
  purple: '#DB34F2',
  pink: '#FF375F',
  brown: '#B78A66',
} as const;

// ─── BACKGROUND ─────────────────────────────────────────────────────────────
export const SigmaBg = {
  primary: '#000000',
  secondary: '#1F1E1E',
  elevated: '#1F1E1E',
} as const;

// ─── GRAYS ──────────────────────────────────────────────────────────────────
export const SigmaGray = {
  black: '#000000',
  gray: '#939290',
  gray2: '#666564',
  gray3: '#4A4949',
  gray4: '#3C3C3B',
  gray5: '#2E2E2D',
  gray6: '#1E1E1D',
  white: '#FFFFFF',
} as const;

// ─── TEXT & LABELS ──────────────────────────────────────────────────────────
export const SigmaText = {
  primary: '#FFFFFF',
  secondary: 'rgba(245,243,240,0.60)',
  tertiary: 'rgba(245,243,240,0.30)',
  quaternary: 'rgba(235,235,245,0.18)',
} as const;

// ─── FILLS ──────────────────────────────────────────────────────────────────
export const SigmaFill = {
  primary: 'rgba(128,128,128,0.12)',
  secondary: 'rgba(235,235,245,0.60)',
  tertiary: 'rgba(120,120,120,0.20)',
  elevated: '#1F1E1E',
  liquidGlass: 'rgba(31,30,30,0.80)',
} as const;

// ─── TYPOGRAPHY SCALE (pt) ──────────────────────────────────────────────────
// Adapted for mobile: Sigma desktop scale scaled down proportionally.
export const SigmaTypo = {
  largeTitle: 34,    // Billboard-level on mobile (iOS large title)
  title1: 28,        // Title Large (mobile-adapted from 40)
  title2: 22,        // Title Medium (mobile-adapted from 32)
  title3: 20,        // Title Small / Headline (Sigma Headline Standard 20pt)
  headline: 17,      // Semibold body-level headline
  body: 16,          // Body Large
  bodySmall: 14,     // Body Medium
  caption: 12,       // Caption / footnotes
  captionSmall: 11,  // Smallest label text
} as const;

// ─── SHAPES / BORDER RADII ─────────────────────────────────────────────────
// Sigma: "Use consistent corner radius scales across the system"
// We define 4 tiers: small, medium, large, xl (concentric nesting friendly).
export const SigmaRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
} as const;

// ─── ELEVATION (dark mode — subtle) ────────────────────────────────────────
// Sigma: "subtlety is key", "contrast replaces depth in dark mode"
export const SigmaElevation = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  low: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

// ─── SPACING ────────────────────────────────────────────────────────────────
export const SigmaSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// ─── BORDER ─────────────────────────────────────────────────────────────────
export const SigmaBorder = {
  subtle: 'rgba(255,255,255,0.08)',
  light: 'rgba(255,255,255,0.12)',
  medium: 'rgba(255,255,255,0.18)',
} as const;

// ─── DIVIDER ────────────────────────────────────────────────────────────────
export const SigmaDivider = 'rgba(255,255,255,0.06)';
