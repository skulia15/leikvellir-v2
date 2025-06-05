"use client";

import { ArrowLeft, Cookie, Database, Eye, Shield, UserCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useTranslation } from "~/lib/i18n";
import { LocalizedDate } from "./localized-date";

export function PrivacyPageClient() {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b bg-white">
                <div className="container mx-auto py-4">
                    <Button asChild variant="ghost" size="sm" className="w-fit">
                        <Link href="/" className="flex items-center gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            {t('privacy.backToMap')}
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="container mx-auto py-8 max-w-4xl">
                {/* Page Title */}
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold">{t('privacy.privacyPolicy')}</h1>
                    <p className="text-sm sm:text-base text-muted-foreground mt-2">
                        {t('privacy.lastUpdated')} <LocalizedDate />
                    </p>
                </div>
                <div className="space-y-8">
                    {/* Overview */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-blue-500" />
                                {t('privacy.overview')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p>
                                {t('privacy.overviewText')}
                            </p>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm">
                                    <strong>{t('privacy.keyPoints')}</strong> {t('privacy.keyPointsText')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Information We Collect */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Database className="h-5 w-5 text-green-500" />
                                {t('privacy.informationWeCollect')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="font-semibold mb-2 flex items-center gap-2">
                                    <UserCheck className="h-4 w-4" />
                                    {t('privacy.accountInformation')}
                                </h3>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                    <li>{t('privacy.accountInfoItems.0')}</li>
                                    <li>{t('privacy.accountInfoItems.1')}</li>
                                    <li>{t('privacy.accountInfoItems.2')}</li>
                                    <li>{t('privacy.accountInfoItems.3')}</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">{t('privacy.userGeneratedContent')}</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                    <li>{t('privacy.userContentItems.0')}</li>
                                    <li>{t('privacy.userContentItems.1')}</li>
                                    <li>{t('privacy.userContentItems.2')}</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">{t('privacy.locationData')}</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                    <li>{t('privacy.locationDataItems.0')}</li>
                                    <li>{t('privacy.locationDataItems.1')}</li>
                                    <li>{t('privacy.locationDataItems.2')}</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">{t('privacy.technicalInformation')}</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                    <li>{t('privacy.technicalInfoItems.0')}</li>
                                    <li>{t('privacy.technicalInfoItems.1')}</li>
                                    <li>{t('privacy.technicalInfoItems.2')}</li>
                                    <li>{t('privacy.technicalInfoItems.3')}</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Cookie Usage */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Cookie className="h-5 w-5 text-orange-500" />
                                {t('privacy.cookieUsage')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <p>
                                {t('privacy.cookieUsageText')}
                            </p>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="border rounded-lg p-4">
                                    <h4 className="font-semibold text-green-600 mb-2">{t('privacy.essentialCookiesTitle')}</h4>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        {t('privacy.essentialCookiesText')}
                                    </p>
                                    <ul className="list-disc list-inside text-xs space-y-1">
                                        <li>{t('privacy.essentialCookiesList.0')}</li>
                                        <li>{t('privacy.essentialCookiesList.1')}</li>
                                        <li>{t('privacy.essentialCookiesList.2')}</li>
                                        <li>{t('privacy.essentialCookiesList.3')}</li>
                                    </ul>
                                </div>

                                <div className="border rounded-lg p-4">
                                    <h4 className="font-semibold text-blue-600 mb-2">{t('privacy.analyticsCookiesTitle')}</h4>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        {t('privacy.analyticsCookiesText')}
                                    </p>
                                    <ul className="list-disc list-inside text-xs space-y-1">
                                        <li>{t('privacy.analyticsCookiesList.0')}</li>
                                        <li>{t('privacy.analyticsCookiesList.1')}</li>
                                        <li>{t('privacy.analyticsCookiesList.2')}</li>
                                        <li>{t('privacy.analyticsCookiesList.3')}</li>
                                    </ul>
                                </div>

                                <div className="border rounded-lg p-4">
                                    <h4 className="font-semibold text-purple-600 mb-2">{t('privacy.functionalCookiesTitle')}</h4>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        {t('privacy.functionalCookiesText')}
                                    </p>
                                    <ul className="list-disc list-inside text-xs space-y-1">
                                        <li>{t('privacy.functionalCookiesList.0')}</li>
                                        <li>{t('privacy.functionalCookiesList.1')}</li>
                                        <li>{t('privacy.functionalCookiesList.2')}</li>
                                        <li>{t('privacy.functionalCookiesList.3')}</li>
                                    </ul>
                                </div>

                                <div className="border rounded-lg p-4">
                                    <h4 className="font-semibold text-gray-600 mb-2">{t('privacy.thirdPartyCookiesTitle')}</h4>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        {t('privacy.thirdPartyCookiesText')}
                                    </p>
                                    <ul className="list-disc list-inside text-xs space-y-1">
                                        <li>{t('privacy.thirdPartyCookiesList.0')}</li>
                                        <li>{t('privacy.thirdPartyCookiesList.1')}</li>
                                        <li>{t('privacy.thirdPartyCookiesList.2')}</li>
                                        <li>{t('privacy.thirdPartyCookiesList.3')}</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <h4 className="font-semibold text-amber-800 mb-2">{t('privacy.managingCookies')}</h4>
                                <p className="text-sm text-amber-700">
                                    {t('privacy.managingCookiesText')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* How We Use Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Eye className="h-5 w-5 text-indigo-500" />
                                {t('privacy.howWeUseInformation')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold mb-2">{t('privacy.serviceFunctionality')}</h4>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                        <li>{t('privacy.serviceFunctionalityList.0')}</li>
                                        <li>{t('privacy.serviceFunctionalityList.1')}</li>
                                        <li>{t('privacy.serviceFunctionalityList.2')}</li>
                                        <li>{t('privacy.serviceFunctionalityList.3')}</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-semibold mb-2">{t('privacy.analyticsAndImprovement')}</h4>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                        <li>{t('privacy.analyticsImprovementList.0')}</li>
                                        <li>{t('privacy.analyticsImprovementList.1')}</li>
                                        <li>{t('privacy.analyticsImprovementList.2')}</li>
                                        <li>{t('privacy.analyticsImprovementList.3')}</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-semibold mb-2">{t('privacy.communication')}</h4>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                        <li>{t('privacy.communicationList.0')}</li>
                                        <li>{t('privacy.communicationList.1')}</li>
                                        <li>{t('privacy.communicationList.2')}</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Data Sharing */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('privacy.dataSharingTitle')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p>
                                {t('privacy.dataSharingText')}
                            </p>

                            <div className="space-y-3">
                                <div className="border-l-4 border-blue-500 pl-4">
                                    <h4 className="font-semibold">{t('privacy.serviceProviders')}</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {t('privacy.serviceProvidersText')}
                                    </p>
                                </div>

                                <div className="border-l-4 border-green-500 pl-4">
                                    <h4 className="font-semibold">{t('privacy.legalRequirements')}</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {t('privacy.legalRequirementsText')}
                                    </p>
                                </div>

                                <div className="border-l-4 border-purple-500 pl-4">
                                    <h4 className="font-semibold">{t('privacy.publicContent')}</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {t('privacy.publicContentText')}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contact Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('privacy.contactUs')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="mb-4">
                                {t('privacy.contactUsText')}
                            </p>

                            <div className="space-y-2 text-sm">
                                <p><strong>{t('privacy.email')}</strong> skuliarnarsson@gmail.com</p>
                                <p><strong>{t('privacy.developer')}</strong> Skúli Arnarsson</p>
                                <p><strong>{t('privacy.github')}</strong> <Link href="https://github.com/skulia15" className="text-blue-600 hover:underline">github.com/skulia15</Link></p>
                                <p><strong>{t('privacy.location')}</strong> Hafnarfjörður, Iceland</p>
                            </div>

                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-muted-foreground">
                                    {t('privacy.privacyNotice')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
} 