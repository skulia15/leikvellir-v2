// lib/i18n/types.ts
export type Locale = 'is' | 'en' | 'pl';

export interface LocaleConfig {
  code: Locale;
  name: string;
  nativeName: string;
  flag: string;
  direction: 'ltr' | 'rtl';
}

export type TranslationKey = string;

export type TranslationParams = Record<string, string | number>;

export interface Translation {
  [key: string]: string | Translation;
}

export interface Translations {
  [locale: string]: Translation;
}
