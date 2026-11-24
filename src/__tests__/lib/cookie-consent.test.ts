import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ALL_ACCEPTED_COOKIE_PREFERENCES,
  CONSENT_VERSION,
  COOKIE_CONSENT_STORAGE_KEY,
  DEFAULT_COOKIE_PREFERENCES,
  canUseAnalytics,
  canUseFunctional,
  cookieUtils,
  getCookiePreferences,
  getStoredConsent,
  hasConsented,
  normalizeCookiePreferences,
  parseStoredConsent,
  revokeCookieConsent,
  saveCookiePreferences,
  subscribeToCookieConsent,
} from "~/lib/cookie-consent";

describe("cookie-consent utilities", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe("normalizeCookiePreferences", () => {
    it("always forces essential to true", () => {
      expect(
        normalizeCookiePreferences({
          essential: false,
          analytics: false,
          functional: true,
        }),
      ).toEqual({
        essential: true,
        analytics: false,
        functional: true,
      });
    });
  });

  describe("parseStoredConsent", () => {
    it("returns null for empty or invalid JSON", () => {
      expect(parseStoredConsent(null)).toBeNull();
      expect(parseStoredConsent("")).toBeNull();
      expect(parseStoredConsent("{not-json")).toBeNull();
      expect(parseStoredConsent("null")).toBeNull();
      expect(parseStoredConsent('"string"')).toBeNull();
    });

    it("rejects string version values like legacy '1.0' and mismatched numeric versions", () => {
      const legacyStringVersion = JSON.stringify({
        preferences: ALL_ACCEPTED_COOKIE_PREFERENCES,
        version: "1.0",
        timestamp: "2026-01-01T00:00:00.000Z",
      });
      const stringOne = JSON.stringify({
        preferences: ALL_ACCEPTED_COOKIE_PREFERENCES,
        version: "1",
        timestamp: "2026-01-01T00:00:00.000Z",
      });
      const wrongNumericVersion = JSON.stringify({
        preferences: ALL_ACCEPTED_COOKIE_PREFERENCES,
        version: CONSENT_VERSION + 1,
        timestamp: "2026-01-01T00:00:00.000Z",
      });

      expect(parseStoredConsent(legacyStringVersion)).toBeNull();
      expect(parseStoredConsent(stringOne)).toBeNull();
      expect(parseStoredConsent(wrongNumericVersion)).toBeNull();
    });

    it("rejects malformed preferences or missing timestamp", () => {
      expect(
        parseStoredConsent(
          JSON.stringify({
            preferences: { essential: true, analytics: "yes", functional: false },
            version: CONSENT_VERSION,
            timestamp: "2026-01-01T00:00:00.000Z",
          }),
        ),
      ).toBeNull();

      expect(
        parseStoredConsent(
          JSON.stringify({
            preferences: { essential: true, analytics: true },
            version: CONSENT_VERSION,
            timestamp: "2026-01-01T00:00:00.000Z",
          }),
        ),
      ).toBeNull();

      expect(
        parseStoredConsent(
          JSON.stringify({
            preferences: ALL_ACCEPTED_COOKIE_PREFERENCES,
            version: CONSENT_VERSION,
          }),
        ),
      ).toBeNull();
    });

    it("parses valid stored consent and normalizes essential to true", () => {
      const raw = JSON.stringify({
        preferences: { essential: false, analytics: true, functional: false },
        version: CONSENT_VERSION,
        timestamp: "2026-11-24T12:00:00.000Z",
      });

      expect(parseStoredConsent(raw)).toEqual({
        preferences: { essential: true, analytics: true, functional: false },
        version: CONSENT_VERSION,
        timestamp: "2026-11-24T12:00:00.000Z",
      });
    });
  });

  describe("storage persistence and helpers", () => {
    it("defaults to unconsented and false capabilities when storage is empty", () => {
      expect(getStoredConsent()).toBeNull();
      expect(getCookiePreferences()).toBeNull();
      expect(hasConsented()).toBe(false);
      expect(canUseAnalytics()).toBe(false);
      expect(canUseFunctional()).toBe(false);
    });

    it("saves preferences with numeric CONSENT_VERSION and reads them back", () => {
      const saved = saveCookiePreferences({
        essential: false,
        analytics: true,
        functional: false,
      });

      expect(saved.version).toBe(CONSENT_VERSION);
      expect(typeof saved.version).toBe("number");
      expect(saved.preferences).toEqual({
        essential: true,
        analytics: true,
        functional: false,
      });

      const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!).version).toBe(CONSENT_VERSION);

      expect(getStoredConsent()).toEqual(saved);
      expect(getCookiePreferences()).toEqual(saved.preferences);
      expect(hasConsented()).toBe(true);
      expect(canUseAnalytics()).toBe(true);
      expect(canUseFunctional()).toBe(false);
    });

    it("revokes consent and clears stored data", () => {
      saveCookiePreferences(ALL_ACCEPTED_COOKIE_PREFERENCES);
      expect(hasConsented()).toBe(true);

      revokeCookieConsent();

      expect(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBeNull();
      expect(hasConsented()).toBe(false);
      expect(canUseAnalytics()).toBe(false);
      expect(canUseFunctional()).toBe(false);
    });

    it("exposes matching helpers on cookieUtils", () => {
      cookieUtils.savePreferences(DEFAULT_COOKIE_PREFERENCES);
      expect(cookieUtils.hasConsented()).toBe(true);
      expect(cookieUtils.canUseAnalytics()).toBe(false);
      expect(cookieUtils.canUseFunctional()).toBe(false);
      expect(cookieUtils.getPreferences()).toEqual(DEFAULT_COOKIE_PREFERENCES);
    });
  });

  describe("subscribeToCookieConsent", () => {
    it("notifies subscribers on save and revoke and stops after unsubscribe", () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToCookieConsent(listener);

      saveCookiePreferences({ analytics: true, functional: false });
      expect(listener).toHaveBeenLastCalledWith({
        essential: true,
        analytics: true,
        functional: false,
      });

      revokeCookieConsent();
      expect(listener).toHaveBeenLastCalledWith(null);

      unsubscribe();
      saveCookiePreferences(ALL_ACCEPTED_COOKIE_PREFERENCES);
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it("notifies subscribers on cross-tab storage events for the consent key only", () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToCookieConsent(listener);

      window.localStorage.setItem(
        COOKIE_CONSENT_STORAGE_KEY,
        JSON.stringify({
          preferences: ALL_ACCEPTED_COOKIE_PREFERENCES,
          version: CONSENT_VERSION,
          timestamp: "2026-11-24T12:00:00.000Z",
        }),
      );

      window.dispatchEvent(
        new StorageEvent("storage", { key: "unrelated-key" }),
      );
      expect(listener).not.toHaveBeenCalled();

      window.dispatchEvent(
        new StorageEvent("storage", { key: COOKIE_CONSENT_STORAGE_KEY }),
      );
      expect(listener).toHaveBeenCalledWith(ALL_ACCEPTED_COOKIE_PREFERENCES);

      unsubscribe();
    });
  });
});
