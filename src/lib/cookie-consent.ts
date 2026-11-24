export const COOKIE_CONSENT_STORAGE_KEY = "Leiksvæði-cookie-consent";
export const CONSENT_VERSION = 1;
export const COOKIE_CONSENT_CHANGE_EVENT = "leiksvaedi:cookie-consent-change";

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  functional: boolean;
}

export interface StoredConsentData {
  preferences: CookiePreferences;
  version: number;
  timestamp: string;
}

export const DEFAULT_COOKIE_PREFERENCES: CookiePreferences = {
  essential: true,
  analytics: false,
  functional: false,
};

export const ALL_ACCEPTED_COOKIE_PREFERENCES: CookiePreferences = {
  essential: true,
  analytics: true,
  functional: true,
};

export function normalizeCookiePreferences(
  preferences: Pick<CookiePreferences, "analytics" | "functional"> & {
    essential?: boolean;
  },
): CookiePreferences {
  return {
    essential: true,
    analytics: Boolean(preferences.analytics),
    functional: Boolean(preferences.functional),
  };
}

export function parseStoredConsent(raw: string | null): StoredConsentData | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    if (record.version !== CONSENT_VERSION) {
      return null;
    }

    if (typeof record.timestamp !== "string") {
      return null;
    }

    const prefs = record.preferences;
    if (typeof prefs !== "object" || prefs === null) {
      return null;
    }

    const prefsRecord = prefs as Record<string, unknown>;
    if (
      typeof prefsRecord.analytics !== "boolean" ||
      typeof prefsRecord.functional !== "boolean"
    ) {
      return null;
    }

    return {
      preferences: normalizeCookiePreferences({
        analytics: prefsRecord.analytics,
        functional: prefsRecord.functional,
      }),
      version: CONSENT_VERSION,
      timestamp: record.timestamp,
    };
  } catch (error) {
    console.error("Error parsing stored cookie preferences:", error);
    return null;
  }
}

export function getStoredConsent(): StoredConsentData | null {
  if (typeof window === "undefined") return null;

  try {
    return parseStoredConsent(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY));
  } catch (error) {
    console.error("Error reading cookie preferences from storage:", error);
    return null;
  }
}

export function getCookiePreferences(): CookiePreferences | null {
  return getStoredConsent()?.preferences ?? null;
}

export function hasConsented(): boolean {
  return getCookiePreferences() !== null;
}

export function canUseAnalytics(): boolean {
  return getCookiePreferences()?.analytics ?? false;
}

export function canUseFunctional(): boolean {
  return getCookiePreferences()?.functional ?? false;
}

function dispatchConsentChange(preferences: CookiePreferences | null): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<CookiePreferences | null>(COOKIE_CONSENT_CHANGE_EVENT, {
      detail: preferences,
    }),
  );
}

export function saveCookiePreferences(
  preferences: Pick<CookiePreferences, "analytics" | "functional"> & {
    essential?: boolean;
  },
): StoredConsentData {
  const consentData: StoredConsentData = {
    preferences: normalizeCookiePreferences(preferences),
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        COOKIE_CONSENT_STORAGE_KEY,
        JSON.stringify(consentData),
      );
    } catch (error) {
      console.error("Error saving cookie preferences to storage:", error);
    }

    dispatchConsentChange(consentData.preferences);
  }

  return consentData;
}

export function revokeCookieConsent(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
  } catch (error) {
    console.error("Error removing cookie preferences from storage:", error);
  }

  dispatchConsentChange(null);
}

export function subscribeToCookieConsent(
  listener: (preferences: CookiePreferences | null) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleConsentChange = (event: Event) => {
    const customEvent = event as CustomEvent<CookiePreferences | null>;
    listener(customEvent.detail);
  };

  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === null || event.key === COOKIE_CONSENT_STORAGE_KEY) {
      listener(getCookiePreferences());
    }
  };

  window.addEventListener(COOKIE_CONSENT_CHANGE_EVENT, handleConsentChange);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    window.removeEventListener(COOKIE_CONSENT_CHANGE_EVENT, handleConsentChange);
    window.removeEventListener("storage", handleStorageChange);
  };
}

export const cookieUtils = {
  getStoredConsent,
  getPreferences: getCookiePreferences,
  savePreferences: saveCookiePreferences,
  hasConsented,
  canUseAnalytics,
  canUseFunctional,
  revokeConsent: revokeCookieConsent,
  subscribe: subscribeToCookieConsent,
};
