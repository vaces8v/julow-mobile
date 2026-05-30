import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';
import { isLocale, resolveDeviceLocale } from './device-locale';
import { LOCALES, LOCALE_LABELS, type Locale, type Translations } from './translations';

const LOCALE_STORAGE_KEY = '@julow/locale';

type I18nCtx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
  localeLabels: typeof LOCALE_LABELS;
  isReady: boolean;
};

const Ctx = React.createContext<I18nCtx>({
  locale: resolveDeviceLocale(),
  setLocale: () => {},
  t: LOCALES.en,
  localeLabels: LOCALE_LABELS,
  isReady: false,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>(resolveDeviceLocale());
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(LOCALE_STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (isLocale(stored)) {
          setLocaleState(stored);
        }
      })
      .finally(() => {
        if (!cancelled) setIsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next);
    void AsyncStorage.setItem(LOCALE_STORAGE_KEY, next);
  }, []);

  const value = React.useMemo(
    () => ({ locale, setLocale, t: LOCALES[locale], localeLabels: LOCALE_LABELS, isReady }),
    [locale, setLocale, isReady],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return React.useContext(Ctx);
}

export type { Locale } from './translations';
