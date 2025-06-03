"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Cookie, Save, Shield, RotateCcw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Switch } from "~/components/ui/switch";
import { cookieUtils } from "~/app/_components/cookie-consent-banner";
import { useT } from "~/lib/i18n";

interface CookiePreferences {
    essential: boolean;
    analytics: boolean;
    functional: boolean;
    advertising: boolean;
}

const DEFAULT_PREFERENCES: CookiePreferences = {
    essential: true,
    analytics: false,
    functional: false,
    advertising: false,
};

export default function CookieManagementPage() {
    const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);
    const [hasChanges, setHasChanges] = useState(false);
    const [saved, setSaved] = useState(false);
    const t = useT();

    useEffect(() => {
        // Load current preferences
        const current = cookieUtils.getPreferences();
        if (current) {
            setPreferences(current);
        }
    }, []);

    const updatePreference = (key: keyof CookiePreferences, value: boolean) => {
        if (key === "essential") return; // Cannot disable essential cookies

        setPreferences(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
        setSaved(false);
    };

    const savePreferences = () => {
        const consentData = {
            preferences,
            version: "1.0",
            timestamp: new Date().toISOString(),
        };

        localStorage.setItem("Leiksvæði-cookie-consent", JSON.stringify(consentData));

        // Handle analytics based on preference
        if (preferences.analytics) {
            if (typeof window !== "undefined" && window.posthog) {
                window.posthog.opt_in_capturing();
            }
        } else {
            if (typeof window !== "undefined" && window.posthog) {
                window.posthog.opt_out_capturing();
            }
        }

        setHasChanges(false);
        setSaved(true);

        // Auto-hide success message
        setTimeout(() => setSaved(false), 3000);
    };

    const resetToDefaults = () => {
        setPreferences(DEFAULT_PREFERENCES);
        setHasChanges(true);
        setSaved(false);
    };

    const revokeAllConsent = () => {
        cookieUtils.revokeConsent();
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b bg-white">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center gap-4">
                        <Button asChild variant="ghost" size="sm">
                            <Link href="/" className="flex items-center gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                {t('common.back')}
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-2">
                                <Cookie className="h-8 w-8" />
                                {t('cookies.cookieManagement')}
                            </h1>
                            <p className="text-muted-foreground">
                                {t('cookies.manageCookiePreferences')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <div className="space-y-6">
                    {/* Status Messages */}
                    {saved && (
                        <Card className="border-green-200 bg-green-50">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-green-800">
                                    <Save className="h-4 w-4" />
                                    <span className="font-medium">{t('success.settingsSaved')}</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Cookie Categories */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                {t('cookies.cookieInformation')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Essential Cookies */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-semibold">{t('cookies.essentialCookies')}</h3>
                                        <Badge variant="secondary">{t('admin.approved')}</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        {t('cookies.essentialCookiesDescription')}
                                    </p>
                                </div>
                                <Switch
                                    checked={true}
                                    disabled={true}
                                    className="opacity-50"
                                />
                            </div>

                            {/* Analytics Cookies */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-semibold">{t('cookies.analyticsCookies')}</h3>
                                        {preferences.analytics && <Badge variant="default">{t('admin.approved')}</Badge>}
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        {t('cookies.analyticsCookiesDescription')}
                                    </p>
                                </div>
                                <Switch
                                    checked={preferences.analytics}
                                    onCheckedChange={(checked) => updatePreference("analytics", checked)}
                                />
                            </div>

                            {/* Marketing Cookies */}
                            <div className="flex items-center justify-between p-4 border rounded-lg opacity-60">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-semibold">{t('cookies.marketingCookies')}</h3>
                                        <Badge variant="outline">{t('admin.rejected')}</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        {t('cookies.marketingCookiesDescription')}
                                    </p>
                                </div>
                                <Switch
                                    checked={false}
                                    disabled={true}
                                    className="opacity-50"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Button
                            onClick={savePreferences}
                            disabled={!hasChanges}
                            className="flex items-center gap-2"
                        >
                            <Save className="h-4 w-4" />
                            {t('cookies.savePreferences')}
                        </Button>

                        <Button
                            variant="outline"
                            onClick={resetToDefaults}
                            className="flex items-center gap-2"
                        >
                            <RotateCcw className="h-4 w-4" />
                            {t('cookies.resetToDefaults')}
                        </Button>

                        <Button
                            variant="destructive"
                            onClick={revokeAllConsent}
                            className="sm:ml-auto"
                        >
                            {t('cookies.revokeAllConsent')}
                        </Button>
                    </div>

                    {/* Information */}
                    <Card>
                        <CardContent className="p-6">
                            <h3 className="font-semibold mb-3">{t('cookies.cookieInformation')}</h3>
                            <div className="mt-4 pt-4 border-t">
                                <p className="text-xs text-muted-foreground">
                                    {t('cookies.learnMore')}{" "}
                                    <Link href="/privacy" className="text-blue-600 hover:underline">
                                        {t('cookies.privacyPolicy')}
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