import { getLocales } from 'expo-localization';
import type { Locale } from './translations';

const SUPPORTED: Locale[] = ['en', 'ru', 'de'];

function mapLanguageCode(code: string | undefined): Locale | null {
  const normalized = code?.split(/[-_]/)[0]?.toLowerCase();
  if (normalized === 'ru') return 'ru';
  if (normalized === 'de') return 'de';
  if (normalized === 'en') return 'en';
  return null;
}

export function resolveDeviceLocale(): Locale {
  for (const locale of getLocales()) {
    const fromLanguage = mapLanguageCode(locale.languageCode);
    if (fromLanguage) return fromLanguage;

    const fromTag = mapLanguageCode(locale.languageTag);
    if (fromTag) return fromTag;
  }

  return 'en';
}

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'en' || value === 'ru' || value === 'de';
}

export { SUPPORTED as SUPPORTED_LOCALES };
