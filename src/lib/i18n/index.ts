// lib/i18n/index.ts
export { LanguageProvider, useTranslation, useT, useLocale, useDateLocale } from './context';
export {
  defaultLocale,
  locales,
  getLocaleConfig,
  isValidLocale,
  getBcp47Locale,
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
} from './config';
export { getTranslation, hasTranslation, getPluralKey } from './translations';
export type { Locale, LocaleConfig, TranslationKey, TranslationParams } from './types';
