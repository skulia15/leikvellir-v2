// app/_components/cookie-consent-banner.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import Link from "next/link";
import { Cookie, Settings, Check, X, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Switch } from "~/components/ui/switch";
import { Separator } from "~/components/ui/separator";
import { useT } from "~/lib/i18n";

interface CookiePreferences {
  essential: boolean; // Always true, cannot be disabled
  analytics: boolean;
  functional: boolean;
  advertising: boolean;
}

interface StoredConsentData {
  preferences: CookiePreferences;
  version: number;
  timestamp: string;
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  analytics: false,
  functional: false,
  advertising: false,
};

const STORAGE_KEY = "leikvellir-cookie-consent";
const CONSENT_VERSION = 1;

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);
  const t = useT();

  useEffect(() => {
    // Check if user has already given consent
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsedData = JSON.parse(stored) as StoredConsentData;
        const { preferences: storedPrefs, version } = parsedData;
        if (version === CONSENT_VERSION) {
          setPreferences(storedPrefs);
          // Initialize analytics if consented
          if (storedPrefs.analytics) {
            initializeAnalytics();
          }
          return;
        }
      } catch (error) {
        console.error("Error parsing stored cookie preferences:", error);
      }
    }

    // Show banner if no valid consent found
    setShowBanner(true);
  }, []);

  const initializeAnalytics = () => {
    // Initialize PostHog or other analytics here
    if (typeof window !== "undefined" && window.posthog) {
      window.posthog.opt_in_capturing();
    }
  };

  const disableAnalytics = () => {
    // Disable PostHog or other analytics here
    if (typeof window !== "undefined" && window.posthog) {
      window.posthog.opt_out_capturing();
    }
  };

  const savePreferences = (newPreferences: CookiePreferences) => {
    const consentData: StoredConsentData = {
      preferences: newPreferences,
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(consentData));
    setPreferences(newPreferences);

    // Handle analytics based on preference
    if (newPreferences.analytics) {
      initializeAnalytics();
    } else {
      disableAnalytics();
    }

    setShowBanner(false);
    setShowSettings(false);
  };

  const acceptAll = () => {
    savePreferences({
      essential: true,
      analytics: true,
      functional: true,
      advertising: false, // We don't use advertising cookies yet
    });
  };

  const acceptEssentialOnly = () => {
    savePreferences(DEFAULT_PREFERENCES);
  };

  const updatePreference = (key: keyof CookiePreferences, value: boolean) => {
    if (key === "essential") return; // Cannot disable essential cookies
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Cookie Consent Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none">
        <Card className="mx-auto max-w-4xl border-2 shadow-lg pointer-events-auto">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col gap-3 md:gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Cookie className="h-4 w-4 md:h-5 md:w-5 text-orange-500" />
                  <h3 className="font-semibold text-sm md:text-base">{t('cookies.cookiePreferences')}</h3>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground mb-2">
                  {t('cookies.cookieConsentDescription')}
                </p>
                <Link
                  href="/privacy"
                  className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  {t('cookies.readPrivacyPolicy')}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              <div className="flex flex-col gap-2 md:flex-row">
                <Dialog open={showSettings} onOpenChange={setShowSettings}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2 text-xs md:text-sm">
                      <Settings className="h-3 w-3 md:h-4 md:w-4" />
                      {t('cookies.customize')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Cookie className="h-5 w-5" />
                        {t('cookies.cookiePreferences')}
                      </DialogTitle>
                      <DialogDescription>
                        {t('cookies.cookieSettingsDescription')}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      {/* Essential Cookies */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">{t('cookies.essentialCookies')}</h4>
                            <Badge variant="outline" className="text-xs">
                              {t('cookies.required')}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t('cookies.essentialCookiesShortDescription')}
                          </p>
                        </div>
                        <Switch
                          checked={true}
                          disabled={true}
                          className="opacity-50"
                        />
                      </div>

                      <Separator />

                      {/* Analytics Cookies */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{t('cookies.analyticsCookies')}</h4>
                          <p className="text-xs text-muted-foreground">
                            {t('cookies.analyticsCookiesShortDescription')}
                          </p>
                        </div>
                        <Switch
                          checked={preferences.analytics}
                          onCheckedChange={(checked) => updatePreference("analytics", checked)}
                        />
                      </div>

                      <Separator />

                      {/* Functional Cookies */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{t('cookies.functionalCookies')}</h4>
                          <p className="text-xs text-muted-foreground">
                            {t('cookies.functionalCookiesShortDescription')}
                          </p>
                        </div>
                        <Switch
                          checked={preferences.functional}
                          onCheckedChange={(checked) => updatePreference("functional", checked)}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => savePreferences(preferences)}
                        className="flex-1"
                      >
                        {t('cookies.savePreferences')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={acceptAll}
                        className="flex-1"
                      >
                        {t('cookies.acceptAll')}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={acceptEssentialOnly}
                  className="flex items-center gap-2 text-xs md:text-sm"
                >
                  <X className="h-3 w-3 md:h-4 md:w-4" />
                  {t('cookies.essentialOnly')}
                </Button>

                <Button
                  size="sm"
                  onClick={acceptAll}
                  className="flex items-center gap-2 text-xs md:text-sm"
                >
                  <Check className="h-3 w-3 md:h-4 md:w-4" />
                  {t('cookies.acceptAll')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// Cookie management utility functions
export const cookieUtils = {
  getPreferences: (): CookiePreferences | null => {
    if (typeof window === "undefined") return null;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    try {
      const parsedData = JSON.parse(stored) as StoredConsentData;
      const { preferences, version } = parsedData;
      if (version === CONSENT_VERSION) {
        return preferences;
      }
    } catch (error) {
      console.error("Error parsing cookie preferences:", error);
    }

    return null;
  },

  hasConsented: (): boolean => {
    return cookieUtils.getPreferences() !== null;
  },

  canUseAnalytics: (): boolean => {
    const prefs = cookieUtils.getPreferences();
    return prefs?.analytics ?? false;
  },

  canUseFunctional: (): boolean => {
    const prefs = cookieUtils.getPreferences();
    return prefs?.functional ?? false;
  },

  revokeConsent: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
      // Disable analytics
      if (window.posthog) {
        window.posthog.opt_out_capturing();
      }
      // Reload page to reset state
      window.location.reload();
    }
  },
};

// TypeScript declarations for global objects
declare global {
  interface Window {
    posthog?: {
      opt_in_capturing: () => void;
      opt_out_capturing: () => void;
    };
  }
}
