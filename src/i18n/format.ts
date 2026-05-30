import type { Locale } from './translations';

const LOCALE_TAGS: Record<Locale, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  de: 'de-DE',
};

export function formatAppDate(
  value: string | undefined | null,
  locale: Locale,
  mode: 'short' | 'long' | 'dayMonth' = 'short',
) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.length >= 10 ? value.slice(0, 10) : value;
  }
  const tag = LOCALE_TAGS[locale];
  if (mode === 'dayMonth') {
    return parsed.toLocaleDateString(tag, { day: 'numeric', month: 'short' });
  }
  if (mode === 'long') {
    return parsed.toLocaleDateString(tag, { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return parsed.toLocaleDateString(tag, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatAppDateTime(value: string | undefined | null, locale: Locale) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 16).replace('T', ' ');
  }
  return parsed.toLocaleString(LOCALE_TAGS[locale], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
