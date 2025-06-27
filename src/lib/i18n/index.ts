// lib/i18n/index.ts
export { LanguageProvider, useTranslation, useT, useLocale } from './context';
export { defaultLocale, locales, getLocaleConfig, isValidLocale } from './config';
export { getTranslation, hasTranslation } from './translations';
export type { Locale, LocaleConfig, TranslationKey, TranslationParams } from './types';
