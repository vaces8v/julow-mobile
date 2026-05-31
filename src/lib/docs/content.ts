import type { DocsByLocale } from "./types";
import { de } from "./locales/de";
import { en } from "./locales/en";
import { ru } from "./locales/ru";

export const DOCS_BY_LOCALE: DocsByLocale = { en, ru, de };

export function getDocs(locale: keyof DocsByLocale) {
  return DOCS_BY_LOCALE[locale] ?? DOCS_BY_LOCALE.en;
}
