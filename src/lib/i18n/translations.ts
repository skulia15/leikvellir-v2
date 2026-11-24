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
  // Handle pluralization if count parameter is provided
  if (params?.count !== undefined) {
    const count = Number(params.count);
    const pluralKey = getPluralKey(key, count, locale);
    const keys = pluralKey.split('.');
    let value: unknown = translations[locale];

    for (const k of keys) {
      if (value && typeof value === 'object' && value !== null && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        // If plural key not found, try base key
        break;
      }
    }

    if (typeof value === 'string') {
      // Replace parameters in the translation
      if (params) {
        return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
          return str.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), String(paramValue));
        }, value);
      }
      return value;
    }
  }

  // Regular translation logic
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

// Helper function to determine the correct plural key based on count and locale
export const getPluralKey = (baseKey: string, count: number, locale: Locale): string => {
  const absCount = Math.abs(count);
  switch (locale) {
    case 'en':
      return absCount === 1 ? `${baseKey}_one` : `${baseKey}_other`;
    case 'is':
      // Icelandic CLDR: integers ending in 1 (except 11) take the singular, e.g. "21 mynd"
      return Number.isInteger(absCount) && absCount % 10 === 1 && absCount % 100 !== 11
        ? `${baseKey}_one`
        : `${baseKey}_other`;
    case 'pl': {
      // Polish CLDR cardinal plural rules:
      // 1 = one; mod10 in 2..4 (excluding mod100 in 12..14) = few; other integers = many; decimals = other
      if (!Number.isInteger(absCount)) return `${baseKey}_other`;
      if (absCount === 1) return `${baseKey}_one`;
      const mod10 = absCount % 10;
      const mod100 = absCount % 100;
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
        return `${baseKey}_few`;
      }
      return `${baseKey}_many`;
    }
    default:
      return absCount === 1 ? `${baseKey}_one` : `${baseKey}_other`;
  }
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
