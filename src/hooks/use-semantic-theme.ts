/**
 * Разрешённые семантические цвета HeroUI / Julow (Uniwind CSS variables).
 * Соответствуют apps/mobile/src/global.css и веб-теме.
 */

import { useColorScheme } from 'react-native';
import { useCSSVariable } from 'uniwind';

function pick(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

/** Запасные hex, если переменные ещё не подхватились (первый кадр / SSR). */
export const THEME_FALLBACK = {
  light: {
    background: '#f4f3f0',
    foreground: '#171717',
    muted: '#737373',
    border: '#e4e4e7',
    separator: '#e8e8ea',
    surface: '#ffffff',
    surfaceSecondary: '#f2f2f4',
    surfaceTertiary: '#ebebed',
    accent: '#2563eb',
    accentForeground: '#fafafa',
    danger: '#dc2626',
    success: '#16a34a',
    warning: '#ca8a04',
    default: '#ececee',
    defaultForeground: '#171717',
  },
  dark: {
    background: '#121214',
    foreground: '#f0f0f0',
    muted: '#a1a1aa',
    border: '#3f3f46',
    separator: '#3a3a40',
    surface: '#1c1c1f',
    surfaceSecondary: '#252528',
    surfaceTertiary: '#2e2e32',
    accent: '#3b82f6',
    accentForeground: '#fafafa',
    danger: '#ef4444',
    success: '#22c55e',
    warning: '#eab308',
    default: '#27272a',
    defaultForeground: '#fafafa',
  },
} as const;

export type SemanticTheme = {
  scheme: 'light' | 'dark';
  background: string;
  foreground: string;
  muted: string;
  border: string;
  separator: string;
  surface: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  accent: string;
  accentForeground: string;
  danger: string;
  success: string;
  warning: string;
  default: string;
  defaultForeground: string;
};

export function useSemanticTheme(): SemanticTheme {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const fb = THEME_FALLBACK[scheme];

  const vars = useCSSVariable([
    '--background',
    '--foreground',
    '--muted',
    '--border',
    '--separator',
    '--surface',
    '--surface-secondary',
    '--surface-tertiary',
    '--accent',
    '--accent-foreground',
    '--danger',
    '--success',
    '--warning',
    '--default',
    '--default-foreground',
  ]) as string[];

  return {
    scheme,
    background: pick(vars[0], fb.background),
    foreground: pick(vars[1], fb.foreground),
    muted: pick(vars[2], fb.muted),
    border: pick(vars[3], fb.border),
    separator: pick(vars[4], fb.separator),
    surface: pick(vars[5], fb.surface),
    surfaceSecondary: pick(vars[6], fb.surfaceSecondary),
    surfaceTertiary: pick(vars[7], fb.surfaceTertiary),
    accent: pick(vars[8], fb.accent),
    accentForeground: pick(vars[9], fb.accentForeground),
    danger: pick(vars[10], fb.danger),
    success: pick(vars[11], fb.success),
    warning: pick(vars[12], fb.warning),
    default: pick(vars[13], fb.default),
    defaultForeground: pick(vars[14], fb.defaultForeground),
  };
}
