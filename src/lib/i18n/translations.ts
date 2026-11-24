// lib/i18n/translations.ts
import { type Locale, type Translation } from './types';

// Statically import only the default locale so non-default locales are code-split
import isTranslationsRaw from '../../locales/is.json';

// Type guard to validate translation structure (used in dev and tests)
export function isValidTranslation(obj: unknown): obj is Translation {
  if (!obj || typeof obj !== 'object') return false;

  const record = obj as Record<string, unknown>;
  return Object.values(record).every(
    (value) => typeof value === 'string' || isValidTranslation(value),
  );
}

const translationCache: Partial<Record<Locale, Translation>> = {
  is: isTranslationsRaw as Translation,
};

const pendingLoads: Partial<Record<Locale, Promise<Translation>>> = {};

const localeLoaders: Record<Exclude<Locale, 'is'>, () => Promise<{ default: unknown }>> = {
  en: () => import('../../locales/en.json'),
  pl: () => import('../../locales/pl.json'),
};

export const isLocaleLoaded = (locale: Locale): boolean => {
  return Boolean(translationCache[locale]);
};

export async function loadTranslations(locale: Locale): Promise<Translation> {
  const cached = translationCache[locale];
  if (cached) {
    return cached;
  }

  if (locale === 'is') {
    return translationCache.is!;
  }

  if (!pendingLoads[locale]) {
    pendingLoads[locale] = localeLoaders[locale]()
      .then((mod) => {
        const raw = mod.default;
        if (process.env.NODE_ENV === 'development' && !isValidTranslation(raw)) {
          throw new Error(`Invalid translation file structure for locale "${locale}"`);
        }
        const parsed = raw as Translation;
        translationCache[locale] = parsed;
        return parsed;
      })
      .finally(() => {
        delete pendingLoads[locale];
      });
  }

  return pendingLoads[locale]!;
}

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

const lookupKey = (dict: Translation | undefined, key: string): string | undefined => {
  if (!dict) return undefined;

  const keys = key.split('.');
  let value: unknown = dict;

  for (const k of keys) {
    if (value && typeof value === 'object' && value !== null && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return undefined;
    }
  }

  return typeof value === 'string' ? value : undefined;
};

const interpolate = (value: string, params?: Record<string, string | number>): string => {
  if (!params) return value;

  return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
    return str.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), String(paramValue));
  }, value);
};

const lookupInLocale = (
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string | undefined => {
  const dict = translationCache[locale];
  if (!dict) return undefined;

  if (params?.count !== undefined) {
    const count = Number(params.count);
    const pluralKey = getPluralKey(key, count, locale);
    const pluralValue = lookupKey(dict, pluralKey);
    if (pluralValue !== undefined) {
      return interpolate(pluralValue, params);
    }
  }

  const baseValue = lookupKey(dict, key);
  if (baseValue !== undefined) {
    return interpolate(baseValue, params);
  }

  return undefined;
};

export const getTranslation = (
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string => {
  const result = lookupInLocale(locale, key, params);
  if (result !== undefined) {
    return result;
  }

  // Fallback to English if already loaded
  if (locale !== 'en' && translationCache.en) {
    const enResult = lookupInLocale('en', key, params);
    if (enResult !== undefined) {
      return enResult;
    }
  }

  // Fallback to default Icelandic locale (always loaded)
  if (locale !== 'is') {
    const isResult = lookupInLocale('is', key, params);
    if (isResult !== undefined) {
      return isResult;
    }
  }

  return key;
};

export const hasTranslation = (locale: Locale, key: string): boolean => {
  return lookupKey(translationCache[locale], key) !== undefined;
};
