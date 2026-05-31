/**
 * Light / dark surface tokens for cards, borders, elevation, and subtle accents.
 * Dark volumetric gradients stay unchanged; light uses borders + soft shadows.
 */

import { Platform, StyleSheet, type ViewStyle } from 'react-native';

import type { SemanticTheme } from '@/hooks/use-semantic-theme';

export type ThemeScheme = 'light' | 'dark';

/** Reference hex aligned with julow-web / Tailwind gray-200 */
export const LIGHT_SURFACE = {
  border: '#E5E7EB',
  borderSubtle: '#F3F4F6',
  separator: '#E8EAED',
  shadow: '#0f172a',
} as const;

export function getAccentSheenStops(scheme: ThemeScheme, accent: string): [string, string, string] {
  if (scheme === 'dark') {
    return [`${accent}28`, `${accent}08`, 'transparent'];
  }
  return [`${accent}10`, `${accent}03`, 'transparent'];
}

/** Default premium card border gradient (dark). Light → solid border. */
export function getVolumetricBorderStops(
  scheme: ThemeScheme,
  accent?: string,
): [string, string, string] | null {
  if (scheme === 'light') return null;
  if (accent) {
    return [`${accent}40`, 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.06)'];
  }
  return ['rgba(255,255,255,0.24)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.12)'];
}

/** Stat / project / metric cards with accent tint (dark gradient border). */
export function getAccentCardBorderStops(
  scheme: ThemeScheme,
  color: string,
): [string, string, string] | null {
  if (scheme === 'light') return null;
  return [`${color}55`, 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.06)'];
}

export function getMeetingBorderStops(scheme: ThemeScheme): [string, string, string] | null {
  if (scheme === 'light') return null;
  return ['rgba(129,140,248,0.34)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.05)'];
}

export function getMeetingHeroSheenStops(scheme: ThemeScheme): [string, string] {
  return scheme === 'dark'
    ? ['rgba(99,102,241,0.12)', 'transparent']
    : ['rgba(99,102,241,0.05)', 'transparent'];
}

export function getModalBorderStops(scheme: ThemeScheme): [string, string, string] | null {
  if (scheme === 'light') return null;
  return ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.1)'];
}

export function getScreenTopGlowStops(scheme: ThemeScheme, accent: string): [string, string] {
  return scheme === 'dark' ? [`${accent}12`, 'transparent'] : [`${accent}06`, 'transparent'];
}

export function getLightCardElevation(): ViewStyle {
  return (
    Platform.select({
      ios: {
        shadowColor: LIGHT_SURFACE.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
      default: {},
    }) ?? {}
  );
}

export function getLightCardBorder(c: SemanticTheme): Pick<ViewStyle, 'borderWidth' | 'borderColor'> {
  return {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  };
}

export function getLightRaisedCardStyle(c: SemanticTheme): ViewStyle {
  return {
    backgroundColor: c.surface,
    ...getLightCardBorder(c),
    ...getLightCardElevation(),
  };
}

/** Tab bar / header chrome on light Android (no blur). */
export function getTabBarChromeStyle(c: SemanticTheme): ViewStyle {
  if (c.scheme === 'dark') {
    return { backgroundColor: c.surface };
  }
  return {
    backgroundColor: c.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.separator,
    ...getLightCardElevation(),
  };
}

export function getHeaderBlurOverlay(scheme: ThemeScheme): string {
  return scheme === 'dark' ? 'rgba(18,18,20,0.48)' : 'rgba(255,255,255,0.72)';
}

export function getSheetBackdrop(scheme: ThemeScheme): string {
  return scheme === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(15,23,42,0.28)';
}

/** Frosted toast fill — opaque enough to read on any screen background. */
export function getToastGlassBackground(scheme: ThemeScheme): string {
  return scheme === 'dark' ? 'rgba(22,22,26,0.88)' : 'rgba(255,255,255,0.92)';
}

/** Accent-tinted volumetric border for toast (dark). Light uses hairline + shadow. */
export function getToastBorderStops(
  scheme: ThemeScheme,
  accent: string,
): [string, string, string] | null {
  if (scheme === 'light') return null;
  return [`${accent}66`, 'rgba(255,255,255,0.14)', 'rgba(255,255,255,0.07)'];
}

export function getToastLightBorder(c: SemanticTheme, accent: string): Pick<ViewStyle, 'borderWidth' | 'borderColor'> {
  return {
    borderWidth: StyleSheet.hairlineWidth + 0.5,
    borderColor: `${accent}40`,
  };
}

/** Strong elevation so toasts float above tab bars and scroll content. */
export function getToastElevation(scheme: ThemeScheme): ViewStyle {
  if (scheme === 'dark') {
    return (
      Platform.select({
        ios: {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.42,
          shadowRadius: 22,
        },
        android: { elevation: 14 },
        default: {},
      }) ?? {}
    );
  }
  return (
    Platform.select({
      ios: {
        shadowColor: LIGHT_SURFACE.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.14,
        shadowRadius: 18,
      },
      android: { elevation: 10 },
      default: {},
    }) ?? {}
  );
}
