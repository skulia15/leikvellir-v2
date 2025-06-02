// lib/i18n/config.ts
import { type LocaleConfig, type Locale } from './types';

export const defaultLocale: Locale = 'is';

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
