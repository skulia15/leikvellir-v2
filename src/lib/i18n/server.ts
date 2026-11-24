// lib/i18n/server.ts
import { cookies } from 'next/headers';
import { defaultLocale, isValidLocale, LOCALE_COOKIE_NAME, LOCALE_STORAGE_KEY } from './config';
import { type Locale } from './types';

export { getTranslation } from './translations';

export async function getServerLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const raw =
      cookieStore.get(LOCALE_COOKIE_NAME)?.value ??
      cookieStore.get(LOCALE_STORAGE_KEY)?.value;
    if (raw && isValidLocale(raw)) {
      return raw;
    }
  } catch {
    // Fallback outside dynamic request context (e.g. static generation or unit tests)
  }
  return defaultLocale;
}