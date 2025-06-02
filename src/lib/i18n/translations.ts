// lib/i18n/translations.ts
import { type Locale, type Translation, type Translations } from './types';

// Import translation files
import isTranslationsRaw from '../../locales/is.json';
import enTranslationsRaw from '../../locales/en.json';
import plTranslationsRaw from '../../locales/pl.json';

// Type guard to validate translation structure
function isValidTranslation(obj: unknown): obj is Translation {
  if (!obj || typeof obj !== 'object') return false;

  const record = obj as Record<string, unknown>;
  return Object.values(record).every(value =>
    typeof value === 'string' || isValidTranslation(value)
  );
}

// Safely cast the imported JSON to Translation type
function safeTranslation(raw: unknown): Translation {
  if (isValidTranslation(raw)) {
    return raw;
  }
  throw new Error('Invalid translation file structure');
}

export const translations: Translations = {
  is: safeTranslation(isTranslationsRaw),
  en: safeTranslation(enTranslationsRaw),
  pl: safeTranslation(plTranslationsRaw),
};

export const getTranslation = (locale: Locale, key: string, params?: Record<string, string | number>): string => {
  const keys = key.split('.');
  let value: unknown = translations[locale];

  for (const k of keys) {
    if (value && typeof value === 'object' && value !== null && k in value) {
      value = (value as Record<string, unknown>)[k];
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
