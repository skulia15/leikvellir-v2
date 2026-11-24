import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CookieConsentBanner } from "~/app/_components/cookie-consent-banner";
import CookieManagementPage from "~/app/cookies/_components/cookie-management-client";
import {
  LocalizedDate,
  PRIVACY_POLICY_LAST_UPDATED,
  formatDateForLocale,
} from "~/app/privacy/_components/localized-date";
import {
  CONSENT_VERSION,
  COOKIE_CONSENT_STORAGE_KEY,
} from "~/lib/cookie-consent";
import { LanguageProvider } from "~/lib/i18n";

describe("CookieManagementPage and CookieConsentBanner consistency", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("aligns categories, accessible switch labels, and numeric consent version between /cookies and the banner", () => {
    render(
      <LanguageProvider initialLocale="en">
        <CookieConsentBanner />
        <CookieManagementPage />
      </LanguageProvider>,
    );

    // Banner is visible before consent
    expect(screen.getByRole("button", { name: /Accept All/i })).toBeInTheDocument();

    // /cookies exposes Essential, Analytics, Functional — and NO Marketing or admin labels
    expect(screen.queryByText(/Marketing Cookies/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Approved$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Rejected$/i)).not.toBeInTheDocument();

    const essentialSwitch = screen.getByRole("switch", {
      name: "Essential Cookies",
    });
    const analyticsSwitch = screen.getByRole("switch", {
      name: "Analytics Cookies",
    });
    const functionalSwitch = screen.getByRole("switch", {
      name: "Functional Cookies",
    });

    expect(essentialSwitch).toBeDisabled();
    expect(analyticsSwitch).toHaveAttribute("aria-checked", "false");
    expect(functionalSwitch).toHaveAttribute("aria-checked", "false");

    // Enable analytics and functional, then save
    fireEvent.click(analyticsSwitch);
    fireEvent.click(functionalSwitch);
    fireEvent.click(screen.getByRole("button", { name: /Save Preferences/i }));

    // Stored payload uses numeric CONSENT_VERSION, so banner hides and stays hidden
    const storedRaw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    expect(storedRaw).not.toBeNull();
    const parsed = JSON.parse(storedRaw!);
    expect(parsed.version).toBe(CONSENT_VERSION);
    expect(typeof parsed.version).toBe("number");
    expect(parsed.preferences).toEqual({
      essential: true,
      analytics: true,
      functional: true,
    });

    expect(
      screen.queryByRole("button", { name: /Accept All/i }),
    ).not.toBeInTheDocument();
  });
});

describe("LocalizedDate fixed revision date", () => {
  it("formats the fixed privacy policy revision date deterministically across locales", () => {
    expect(formatDateForLocale(PRIVACY_POLICY_LAST_UPDATED, "is")).toBe(
      "24. nóvember 2026",
    );
    expect(formatDateForLocale(PRIVACY_POLICY_LAST_UPDATED, "en")).toBe(
      "24 November 2026",
    );
    expect(formatDateForLocale(PRIVACY_POLICY_LAST_UPDATED, "pl")).toMatch(
      /24.*listopada.*2026/,
    );

    render(
      <LanguageProvider initialLocale="en">
        <LocalizedDate />
      </LanguageProvider>,
    );

    const timeEl = screen.getByText("24 November 2026");
    expect(timeEl.tagName).toBe("TIME");
    expect(timeEl).toHaveAttribute("datetime", "2026-11-24");
  });
});
