// lib/i18n/translations.ts
import { type Locale, type Translation, type Translations } from './types';

// Import translation files
import isTranslations from '../../locales/is.json';
import enTranslations from '../../locales/en.json';
import plTranslations from '../../locales/pl.json';

export const translations: Translations = {
  is: isTranslations as Translation,
  en: enTranslations as Translation,
  pl: plTranslations as Translation,
};

export const getTranslation = (locale: Locale, key: string, params?: Record<string, string | number>): string => {
  const keys = key.split('.');
  let value: any = translations[locale];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to English if key not found in current locale
      if (locale !== 'en') {
        return getTranslation('en', key, params);
      }
      // If not found in English either, return the key
      return key;
    }
  }

  if (typeof value !== 'string') {
    return key;
  }

  // Replace parameters in the translation
  if (params) {
    return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
      return str.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), String(paramValue));
    }, value);
  }

  return value;
};

export const hasTranslation = (locale: Locale, key: string): boolean => {
  const keys = key.split('.');
  let value: unknown = translations[locale];

  for (const k of keys) {
    if (value && typeof value === 'object' && value !== null && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return false;
    }
  }

  return typeof value === 'string';
};
