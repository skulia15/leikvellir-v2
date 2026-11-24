"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Cookie, Save, Shield, RotateCcw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Switch } from "~/components/ui/switch";
import { useT } from "~/lib/i18n";
import {
    DEFAULT_COOKIE_PREFERENCES,
    type CookiePreferences,
    getCookiePreferences,
    revokeCookieConsent,
    saveCookiePreferences,
    subscribeToCookieConsent,
} from "~/lib/cookie-consent";

export default function CookieManagementPage() {
    const [preferences, setPreferences] = useState<CookiePreferences>(
        DEFAULT_COOKIE_PREFERENCES,
    );
    const [hasChanges, setHasChanges] = useState(false);
    const [saved, setSaved] = useState(false);
    const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const t = useT();

    useEffect(() => {
        const current = getCookiePreferences();
        if (current) {
            setPreferences(current);
        }

        const unsubscribe = subscribeToCookieConsent((updated) => {
            setPreferences(updated ?? DEFAULT_COOKIE_PREFERENCES);
            setHasChanges(false);
        });

        return () => {
            unsubscribe();
            if (savedTimeoutRef.current !== null) {
                clearTimeout(savedTimeoutRef.current);
            }
        };
    }, []);

    const updatePreference = (key: keyof CookiePreferences, value: boolean) => {
        if (key === "essential") return; // Cannot disable essential cookies

        setPreferences((prev) => ({ ...prev, [key]: value }));
        setHasChanges(true);
        setSaved(false);
    };

    const handleSavePreferences = () => {
        const result = saveCookiePreferences(preferences);
        setPreferences(result.preferences);
        setHasChanges(false);
        setSaved(true);

        if (savedTimeoutRef.current !== null) {
            clearTimeout(savedTimeoutRef.current);
        }
        savedTimeoutRef.current = setTimeout(() => setSaved(false), 3000);
    };

    const resetToDefaults = () => {
        setPreferences(DEFAULT_COOKIE_PREFERENCES);
        setHasChanges(true);
        setSaved(false);
    };

    const revokeAllConsent = () => {
        revokeCookieConsent();
        setPreferences(DEFAULT_COOKIE_PREFERENCES);
        setHasChanges(false);
        setSaved(false);
    };

    return (
        <div className="bg-background">
            {/* Header */}
            <div className="border-b bg-white">
                <div className="container mx-auto py-4">
                    <Button asChild variant="ghost" size="sm" className="w-fit">
                        <Link href="/" className="flex items-center gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            {t("common.back")}
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="container mx-auto py-8 max-w-2xl">
                {/* Page Title */}
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                        <Cookie className="h-6 w-6 sm:h-8 sm:w-8" />
                        {t("cookies.cookieManagement")}
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground mt-2">
                        {t("cookies.manageCookiePreferences")}
                    </p>
                </div>
                <div className="space-y-6">
                    {/* Status Messages */}
                    {saved && (
                        <Card className="border-green-200 bg-green-50">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-green-800">
                                    <Save className="h-4 w-4" />
                                    <span className="font-medium">{t("success.settingsSaved")}</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Cookie Categories */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                {t("cookies.cookiePreferences")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-0 divide-y">
                            {/* Essential Cookies */}
                            <div className="flex items-center justify-between py-6 first:pt-0 last:pb-0">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-semibold">{t("cookies.essentialCookies")}</h3>
                                        <Badge variant="secondary">{t("cookies.required")}</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {t("cookies.essentialCookiesDescription")}
                                    </p>
                                </div>
                                <Switch
                                    checked={true}
                                    disabled={true}
                                    aria-label={t("cookies.essentialCookies")}
                                    className="opacity-50 ml-4"
                                />
                            </div>

                            {/* Analytics Cookies */}
                            <div className="flex items-center justify-between py-6 first:pt-0 last:pb-0">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-semibold">{t("cookies.analyticsCookies")}</h3>
                                        <Badge variant={preferences.analytics ? "default" : "outline"}>
                                            {preferences.analytics
                                                ? t("cookies.enabled")
                                                : t("cookies.disabled")}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {t("cookies.analyticsCookiesDescription")}
                                    </p>
                                </div>
                                <Switch
                                    checked={preferences.analytics}
                                    onCheckedChange={(checked) =>
                                        updatePreference("analytics", checked)
                                    }
                                    aria-label={t("cookies.analyticsCookies")}
                                    className="ml-4"
                                />
                            </div>

                            {/* Functional Cookies */}
                            <div className="flex items-center justify-between py-6 first:pt-0 last:pb-0">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-semibold">{t("cookies.functionalCookies")}</h3>
                                        <Badge variant={preferences.functional ? "default" : "outline"}>
                                            {preferences.functional
                                                ? t("cookies.enabled")
                                                : t("cookies.disabled")}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {t("cookies.functionalCookiesDescription")}
                                    </p>
                                </div>
                                <Switch
                                    checked={preferences.functional}
                                    onCheckedChange={(checked) =>
                                        updatePreference("functional", checked)
                                    }
                                    aria-label={t("cookies.functionalCookies")}
                                    className="ml-4"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Button
                            onClick={handleSavePreferences}
                            disabled={!hasChanges}
                            className="flex items-center gap-2"
                        >
                            <Save className="h-4 w-4" />
                            {t("cookies.savePreferences")}
                        </Button>

                        <Button
                            variant="outline"
                            onClick={resetToDefaults}
                            className="flex items-center gap-2"
                        >
                            <RotateCcw className="h-4 w-4" />
                            {t("cookies.resetToDefaults")}
                        </Button>

                        <Button
                            variant="destructive"
                            onClick={revokeAllConsent}
                            className="sm:ml-auto"
                        >
                            {t("cookies.revokeAllConsent")}
                        </Button>
                    </div>

                    {/* Information */}
                    <Card>
                        <CardContent className="p-6">
                            <h3 className="font-semibold mb-3">{t("cookies.cookieInformation")}</h3>
                            <div className="mt-4 pt-4 border-t">
                                <p className="text-xs text-muted-foreground">
                                    {t("cookies.learnMore")}{" "}
                                    <Link href="/privacy" className="text-blue-600 hover:underline">
                                        {t("cookies.privacyPolicy")}
                                    </Link>.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}