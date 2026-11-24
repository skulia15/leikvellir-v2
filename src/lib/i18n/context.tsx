"use client";

// lib/i18n/context.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { type Locale } from './types';
import { defaultLocale, getBcp47Locale, isValidLocale, LOCALE_COOKIE_NAME, LOCALE_STORAGE_KEY } from './config';
import { getTranslation, isLocaleLoaded, loadTranslations } from './translations';

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

function getCookieLocale(): Locale | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [rawName, ...rest] = cookie.trim().split('=');
    if (rawName === LOCALE_COOKIE_NAME || rawName === LOCALE_STORAGE_KEY) {
      const val = decodeURIComponent(rest.join('='));
      if (isValidLocale(val)) return val;
    }
  }
  return null;
}

function persistLocale(nextLocale: Locale) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
  } catch {
    // Ignore storage errors (e.g., private browsing)
  }
  if (typeof document !== 'undefined') {
    document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(nextLocale)}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = nextLocale;
  }
}

export function LanguageProvider({ children, initialLocale }: LanguageProviderProps) {
  const startingLocale = initialLocale ?? defaultLocale;
  const [locale, setLocaleState] = useState<Locale>(startingLocale);
  const [loadedLocale, setLoadedLocale] = useState<Locale>(() =>
    isLocaleLoaded(startingLocale) ? startingLocale : defaultLocale,
  );
  const [isHydrated, setIsHydrated] = useState(false);

  // Load locale from localStorage / cookie on mount and keep them in sync
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let resolved: Locale = initialLocale || defaultLocale;
      try {
        const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
        if (stored && isValidLocale(stored)) {
          resolved = stored;
        } else {
          const fromCookie = getCookieLocale();
          if (fromCookie) {
            resolved = fromCookie;
          }
        }
      } catch {
        const fromCookie = getCookieLocale();
        if (fromCookie) {
          resolved = fromCookie;
        }
      }
      setLocaleState(resolved);
      persistLocale(resolved);
      setIsHydrated(true);
    }
  }, [initialLocale]);

  // Dynamically load translations for non-default locales on demand
  useEffect(() => {
    if (isLocaleLoaded(locale)) {
      setLoadedLocale(locale);
      return;
    }

    let cancelled = false;
    void loadTranslations(locale)
      .then(() => {
        if (!cancelled) {
          setLoadedLocale(locale);
        }
      })
      .catch((error) => {
        console.error(`Failed to load translations for locale "${locale}":`, error);
      });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  // Persist locale to localStorage, cookie, and <html lang> when it changes
  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      persistLocale(locale);
    }
  }, [locale, isHydrated]);

  const setLocale = useCallback((newLocale: Locale) => {
    persistLocale(newLocale);
    setLocaleState(newLocale);
  }, []);

  const activeLocale = isLocaleLoaded(locale) ? locale : loadedLocale;

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return getTranslation(activeLocale, key, params);
    },
    [activeLocale],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, setLocale, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}

// Hook for getting just the translation function
export function useT() {
  const { t } = useTranslation();
  return t;
}

// Hook for getting just the current locale
export function useLocale() {
  const { locale, setLocale } = useTranslation();
  return { locale, setLocale };
}

// Hook for getting the BCP 47 tag of the active locale (for Intl / toLocale* APIs)
export function useDateLocale() {
  const { locale } = useTranslation();
  return getBcp47Locale(locale);
}
