import * as React from 'react';
import { LOCALES, LOCALE_LABELS, type Locale, type Translations } from './translations';

type I18nCtx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
  localeLabels: typeof LOCALE_LABELS;
};

const Ctx = React.createContext<I18nCtx>({
  locale: 'ru',
  setLocale: () => {},
  t: LOCALES.ru,
  localeLabels: LOCALE_LABELS,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = React.useState<Locale>('ru');

  const value = React.useMemo(
    () => ({ locale, setLocale, t: LOCALES[locale], localeLabels: LOCALE_LABELS }),
    [locale],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return React.useContext(Ctx);
}

export type { Locale } from './translations';
