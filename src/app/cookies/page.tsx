// app/cookies/page.tsx
"use client";

import { ArrowLeft, Cookie, RotateCcw, Save, Shield } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Switch } from "~/components/ui/switch";
import { cookieUtils } from "../_components/cookie-consent-banner";

interface CookiePreferences {
    essential: boolean;
    analytics: boolean;
    functional: boolean;
    advertising: boolean;

}

const DEFAULT_PREFERENCES: CookiePreferences = {
    essential: true,
    analytics: false,
    functional: true,
    advertising: false,

};

export default function CookieManagementPage() {
    const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);
    const [hasChanges, setHasChanges] = useState(false);
    const [saved, setSaved] = useState(false);

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

        localStorage.setItem("leikvellir-cookie-consent", JSON.stringify(consentData));

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
                                Back to Map
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-2">
                                <Cookie className="h-8 w-8" />
                                Cookie Preferences
                            </h1>
                            <p className="text-muted-foreground">
                                Manage your privacy and cookie settings
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
                                    <span className="font-medium">Preferences saved successfully!</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Cookie Categories */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Cookie Categories
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Essential Cookies */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-semibold">Essential Cookies</h3>
                                        <Badge variant="secondary">Always Active</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Required for basic functionality like authentication, security, and navigation.
                                    </p>
                                    <div className="text-xs text-muted-foreground">
                                        <strong>Examples:</strong> Session tokens, CSRF protection, user preferences
                                    </div>
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
                                        <h3 className="font-semibold">Analytics Cookies</h3>
                                        {preferences.analytics && <Badge variant="default">Enabled</Badge>}
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Help us understand how visitors interact with our website through PostHog analytics.
                                    </p>
                                    <div className="text-xs text-muted-foreground">
                                        <strong>Used for:</strong> Page views, user flows, feature usage, performance monitoring
                                    </div>
                                </div>
                                <Switch
                                    checked={preferences.analytics}
                                    onCheckedChange={(checked) => updatePreference("analytics", checked)}
                                />
                            </div>

                            {/* Functional Cookies */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-semibold">Functional Cookies</h3>
                                        {preferences.functional && <Badge variant="default">Enabled</Badge>}
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Remember your preferences and settings to enhance your experience.
                                    </p>
                                    <div className="text-xs text-muted-foreground">
                                        <strong>Examples:</strong> Map zoom level, filter preferences, location cache
                                    </div>
                                </div>
                                <Switch
                                    checked={preferences.functional}
                                    onCheckedChange={(checked) => updatePreference("functional", checked)}
                                />
                            </div>

                            {/* Advertising Cookies */}
                            <div className="flex items-center justify-between p-4 border rounded-lg opacity-60">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-semibold">Advertising Cookies</h3>
                                        <Badge variant="outline">Not Used</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        We don&apos;t currently use advertising cookies on Leikvellir.
                                    </p>
                                    <div className="text-xs text-muted-foreground">
                                        <strong>Future use:</strong> Personalized ads, retargeting (if implemented)
                                    </div>
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
                            Save Preferences
                        </Button>

                        <Button
                            variant="outline"
                            onClick={resetToDefaults}
                            className="flex items-center gap-2"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Reset to Defaults
                        </Button>

                        <Button
                            variant="destructive"
                            onClick={revokeAllConsent}
                            className="sm:ml-auto"
                        >
                            Revoke All Consent
                        </Button>
                    </div>

                    {/* Information */}
                    <Card>
                        <CardContent className="p-6">
                            <h3 className="font-semibold mb-3">Additional Information</h3>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <p>
                                    • You can change these settings at any time by revisiting this page
                                </p>
                                <p>
                                    • Essential cookies cannot be disabled as they&apos;re required for the site to function
                                </p>
                                <p>
                                    • Disabling functional cookies may limit some features like saved map preferences
                                </p>
                                <p>
                                    • Analytics data is anonymized and used solely to improve the user experience
                                </p>
                            </div>

                            <div className="mt-4 pt-4 border-t">
                                <p className="text-xs text-muted-foreground">
                                    For more information about our data practices, please read our{" "}
                                    <Link href="/privacy" className="text-blue-600 hover:underline">
                                        Privacy Policy
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

// TypeScript declarations for global objects
declare global {
    interface Window {
        posthog?: {
            opt_in_capturing: () => void;
            opt_out_capturing: () => void;
        };
    }
}
