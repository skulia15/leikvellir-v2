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
import {
  ALL_ACCEPTED_COOKIE_PREFERENCES,
  DEFAULT_COOKIE_PREFERENCES,
  type CookiePreferences,
  getCookiePreferences,
  saveCookiePreferences,
  subscribeToCookieConsent,
} from "~/lib/cookie-consent";

export { cookieUtils } from "~/lib/cookie-consent";

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(
    DEFAULT_COOKIE_PREFERENCES,
  );
  const t = useT();

  useEffect(() => {
    const stored = getCookiePreferences();
    if (stored) {
      setPreferences(stored);
      setShowBanner(false);
    } else {
      setShowBanner(true);
    }

    return subscribeToCookieConsent((updated) => {
      if (updated) {
        setPreferences(updated);
        setShowBanner(false);
        setShowSettings(false);
      } else {
        setPreferences(DEFAULT_COOKIE_PREFERENCES);
        setShowBanner(true);
      }
    });
  }, []);

  const handleSavePreferences = (newPreferences: CookiePreferences) => {
    const saved = saveCookiePreferences(newPreferences);
    setPreferences(saved.preferences);
    setShowBanner(false);
    setShowSettings(false);
  };

  const acceptAll = () => {
    handleSavePreferences(ALL_ACCEPTED_COOKIE_PREFERENCES);
  };

  const acceptEssentialOnly = () => {
    handleSavePreferences(DEFAULT_COOKIE_PREFERENCES);
  };

  const updatePreference = (key: keyof CookiePreferences, value: boolean) => {
    if (key === "essential") return; // Cannot disable essential cookies
    setPreferences((prev) => ({ ...prev, [key]: value }));
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
                  <Cookie className="h-4 w-4 md:h-5 md:w-5 text-orange-500" aria-hidden="true" />
                  <h2 className="font-semibold text-sm md:text-base">
                    {t("cookies.cookiePreferences")}
                  </h2>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground mb-2">
                  {t("cookies.cookieConsentDescription")}
                </p>
                <Link
                  href="/privacy"
                  className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  {t("cookies.readPrivacyPolicy")}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>

              <div className="flex flex-col gap-2 md:flex-row">
                <Dialog open={showSettings} onOpenChange={setShowSettings}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 text-xs md:text-sm"
                    >
                      <Settings className="h-3 w-3 md:h-4 md:w-4" aria-hidden="true" />
                      {t("cookies.customize")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Cookie className="h-5 w-5" aria-hidden="true" />
                        {t("cookies.cookiePreferences")}
                      </DialogTitle>
                      <DialogDescription>
                        {t("cookies.cookieSettingsDescription")}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      {/* Essential Cookies */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-sm">
                              {t("cookies.essentialCookies")}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                              {t("cookies.required")}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t("cookies.essentialCookiesShortDescription")}
                          </p>
                        </div>
                        <Switch
                          checked={true}
                          disabled={true}
                          aria-label={t("cookies.essentialCookies")}
                          className="opacity-50"
                        />
                      </div>

                      <Separator />

                      {/* Analytics Cookies */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-medium text-sm">
                            {t("cookies.analyticsCookies")}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {t("cookies.analyticsCookiesShortDescription")}
                          </p>
                        </div>
                        <Switch
                          checked={preferences.analytics}
                          onCheckedChange={(checked) =>
                            updatePreference("analytics", checked)
                          }
                          aria-label={t("cookies.analyticsCookies")}
                        />
                      </div>

                      <Separator />

                      {/* Functional Cookies */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-medium text-sm">
                            {t("cookies.functionalCookies")}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {t("cookies.functionalCookiesShortDescription")}
                          </p>
                        </div>
                        <Switch
                          checked={preferences.functional}
                          onCheckedChange={(checked) =>
                            updatePreference("functional", checked)
                          }
                          aria-label={t("cookies.functionalCookies")}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSavePreferences(preferences)}
                        className="flex-1"
                      >
                        {t("cookies.savePreferences")}
                      </Button>
                      <Button size="sm" onClick={acceptAll} className="flex-1">
                        {t("cookies.acceptAll")}
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
                  {t("cookies.essentialOnly")}
                </Button>

                <Button
                  size="sm"
                  onClick={acceptAll}
                  className="flex items-center gap-2 text-xs md:text-sm"
                >
                  <Check className="h-3 w-3 md:h-4 md:w-4" />
                  {t("cookies.acceptAll")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
