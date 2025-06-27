"use client";

// lib/i18n/context.tsx
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type Locale } from './types';
import { defaultLocale, isValidLocale } from './config';
import { getTranslation } from './translations';

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

const STORAGE_KEY = 'leiksvaedi-locale';

export function LanguageProvider({ children, initialLocale }: LanguageProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale || defaultLocale);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load locale from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && isValidLocale(stored)) {
        setLocaleState(stored);
      }
      setIsHydrated(true);
    }
  }, []);

  // Save locale to localStorage when it changes
  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, locale);
    }
  }, [locale, isHydrated]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
  };

  const t = (key: string, params?: Record<string, string | number>) => {
    return getTranslation(locale, key, params);
  };

  const value: LanguageContextValue = {
    locale,
    setLocale,
    t,
  };

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