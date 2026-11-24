// lib/i18n/config.ts
import { type LocaleConfig, type Locale } from './types';

export const defaultLocale: Locale = 'is';
export const LOCALE_STORAGE_KEY = 'leiksvaedi-locale';
export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

const bcp47LocaleMap: Record<Locale, string> = {
  is: 'is-IS',
  en: 'en-GB',
  pl: 'pl-PL',
};

export const getBcp47Locale = (locale: Locale): string => {
  return bcp47LocaleMap[locale] ?? 'is-IS';
};

export const locales: LocaleConfig[] = [
  {
    code: 'is',
    name: 'Icelandic',
    nativeName: 'Íslenska',
    flag: '🇮🇸',
    direction: 'ltr',
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    direction: 'ltr',
  },
  {
    code: 'pl',
    name: 'Polish',
    nativeName: 'Polski',
    flag: '🇵🇱',
    direction: 'ltr',
  },
];

export const getLocaleConfig = (locale: Locale): LocaleConfig => {
  return locales.find(l => l.code === locale) || locales[0]!;
};

export const isValidLocale = (locale: string): locale is Locale => {
  return locales.some(l => l.code === locale);
};
