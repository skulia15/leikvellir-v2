// app/privacy/page.tsx
import { ArrowLeft, Cookie, Database, Eye, Shield, UserCheck } from "lucide-react";
import { type Metadata } from "next";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { getTranslation } from "~/lib/i18n/server";
import { defaultLocale } from "~/lib/i18n/config";

export const metadata: Metadata = {
  title: getTranslation(defaultLocale, 'privacy.privacyPolicy') + " - Leiksvæði",
  description: getTranslation(defaultLocale, 'privacy.overviewText'),
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                {getTranslation(defaultLocale, 'privacy.backToMap')}
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{getTranslation(defaultLocale, 'privacy.privacyPolicy')}</h1>
              <p className="text-muted-foreground">
                {getTranslation(defaultLocale, 'privacy.lastUpdated')} {new Date().toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                {getTranslation(defaultLocale, 'privacy.overview')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                {getTranslation(defaultLocale, 'privacy.overviewText')}
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm">
                  <strong>{getTranslation(defaultLocale, 'privacy.keyPoints')}</strong> {getTranslation(defaultLocale, 'privacy.keyPointsText')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Information We Collect */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-green-500" />
                {getTranslation(defaultLocale, 'privacy.informationWeCollect')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  {getTranslation(defaultLocale, 'privacy.accountInformation')}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>{getTranslation(defaultLocale, 'privacy.accountInfoItems.0')}</li>
                  <li>{getTranslation(defaultLocale, 'privacy.accountInfoItems.1')}</li>
                  <li>{getTranslation(defaultLocale, 'privacy.accountInfoItems.2')}</li>
                  <li>{getTranslation(defaultLocale, 'privacy.accountInfoItems.3')}</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">{getTranslation(defaultLocale, 'privacy.userGeneratedContent')}</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>{getTranslation(defaultLocale, 'privacy.userContentItems.0')}</li>
                  <li>{getTranslation(defaultLocale, 'privacy.userContentItems.1')}</li>
                  <li>{getTranslation(defaultLocale, 'privacy.userContentItems.2')}</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">{getTranslation(defaultLocale, 'privacy.locationData')}</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>{getTranslation(defaultLocale, 'privacy.locationDataItems.0')}</li>
                  <li>{getTranslation(defaultLocale, 'privacy.locationDataItems.1')}</li>
                  <li>{getTranslation(defaultLocale, 'privacy.locationDataItems.2')}</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">{getTranslation(defaultLocale, 'privacy.technicalInformation')}</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>{getTranslation(defaultLocale, 'privacy.technicalInfoItems.0')}</li>
                  <li>{getTranslation(defaultLocale, 'privacy.technicalInfoItems.1')}</li>
                  <li>{getTranslation(defaultLocale, 'privacy.technicalInfoItems.2')}</li>
                  <li>{getTranslation(defaultLocale, 'privacy.technicalInfoItems.3')}</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Cookie Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cookie className="h-5 w-5 text-orange-500" />
                {getTranslation(defaultLocale, 'privacy.cookieUsage')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p>
                {getTranslation(defaultLocale, 'privacy.cookieUsageText')}
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-green-600 mb-2">{getTranslation(defaultLocale, 'privacy.essentialCookiesTitle')}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {getTranslation(defaultLocale, 'privacy.essentialCookiesText')}
                  </p>
                  <ul className="list-disc list-inside text-xs space-y-1">
                    <li>{getTranslation(defaultLocale, 'privacy.essentialCookiesList.0')}</li>
                    <li>{getTranslation(defaultLocale, 'privacy.essentialCookiesList.1')}</li>
                    <li>{getTranslation(defaultLocale, 'privacy.essentialCookiesList.2')}</li>
                    <li>{getTranslation(defaultLocale, 'privacy.essentialCookiesList.3')}</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-blue-600 mb-2">{getTranslation(defaultLocale, 'privacy.analyticsCookiesTitle')}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {getTranslation(defaultLocale, 'privacy.analyticsCookiesText')}
                  </p>
                  <ul className="list-disc list-inside text-xs space-y-1">
                    <li>{getTranslation(defaultLocale, 'privacy.analyticsCookiesList.0')}</li>
                    <li>{getTranslation(defaultLocale, 'privacy.analyticsCookiesList.1')}</li>
                    <li>{getTranslation(defaultLocale, 'privacy.analyticsCookiesList.2')}</li>
                    <li>{getTranslation(defaultLocale, 'privacy.analyticsCookiesList.3')}</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-purple-600 mb-2">{getTranslation(defaultLocale, 'privacy.functionalCookiesTitle')}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {getTranslation(defaultLocale, 'privacy.functionalCookiesText')}
                  </p>
                  <ul className="list-disc list-inside text-xs space-y-1">
                    <li>{getTranslation(defaultLocale, 'privacy.functionalCookiesList.0')}</li>
                    <li>{getTranslation(defaultLocale, 'privacy.functionalCookiesList.1')}</li>
                    <li>{getTranslation(defaultLocale, 'privacy.functionalCookiesList.2')}</li>
                    <li>{getTranslation(defaultLocale, 'privacy.functionalCookiesList.3')}</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-600 mb-2">{getTranslation(defaultLocale, 'privacy.thirdPartyCookiesTitle')}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {getTranslation(defaultLocale, 'privacy.thirdPartyCookiesText')}
                  </p>
                  <ul className="list-disc list-inside text-xs space-y-1">
                    <li>{getTranslation(defaultLocale, 'privacy.thirdPartyCookiesList.0')}</li>
                    <li>{getTranslation(defaultLocale, 'privacy.thirdPartyCookiesList.1')}</li>
                    <li>{getTranslation(defaultLocale, 'privacy.thirdPartyCookiesList.2')}</li>
                    <li>{getTranslation(defaultLocale, 'privacy.thirdPartyCookiesList.3')}</li>
                  </ul>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-800 mb-2">{getTranslation(defaultLocale, 'privacy.managingCookies')}</h4>
                <p className="text-sm text-amber-700">
                  {getTranslation(defaultLocale, 'privacy.managingCookiesText')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* How We Use Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-indigo-500" />
                {getTranslation(defaultLocale, 'privacy.howWeUseInformation')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">{getTranslation(defaultLocale, 'privacy.serviceFunctionality')}</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>{getTranslation(defaultLocale, 'privacy.serviceFunctionalityList.0')}</li>
                    <li>{getTranslation(defaultLocale, 'privacy.serviceFunctionalityList.1')}</li>
                    <li>{getTranslation(defaultLocale, 'privacy.serviceFunctionalityList.2')}</li>
                    <li>{getTranslation(defaultLocale, 'privacy.serviceFunctionalityList.3')}</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">{getTranslation(defaultLocale, 'privacy.analyticsAndImprovement')}</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>{getTranslation(defaultLocale, 'privacy.analyticsImprovementList.0')}</li>
                    <li>{getTranslation(defaultLocale, 'privacy.analyticsImprovementList.1')}</li>
                    <li>{getTranslation(defaultLocale, 'privacy.analyticsImprovementList.2')}</li>
                    <li>{getTranslation(defaultLocale, 'privacy.analyticsImprovementList.3')}</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">{getTranslation(defaultLocale, 'privacy.communication')}</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>{getTranslation(defaultLocale, 'privacy.communicationList.0')}</li>
                    <li>{getTranslation(defaultLocale, 'privacy.communicationList.1')}</li>
                    <li>{getTranslation(defaultLocale, 'privacy.communicationList.2')}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Sharing */}
          <Card>
            <CardHeader>
              <CardTitle>{getTranslation(defaultLocale, 'privacy.dataSharingTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                {getTranslation(defaultLocale, 'privacy.dataSharingText')}
              </p>

              <div className="space-y-3">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold">{getTranslation(defaultLocale, 'privacy.serviceProviders')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {getTranslation(defaultLocale, 'privacy.serviceProvidersText')}
                  </p>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-semibold">{getTranslation(defaultLocale, 'privacy.legalRequirements')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {getTranslation(defaultLocale, 'privacy.legalRequirementsText')}
                  </p>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-semibold">{getTranslation(defaultLocale, 'privacy.publicContent')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {getTranslation(defaultLocale, 'privacy.publicContentText')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>{getTranslation(defaultLocale, 'privacy.contactUs')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                {getTranslation(defaultLocale, 'privacy.contactUsText')}
              </p>

              <div className="space-y-2 text-sm">
                <p><strong>{getTranslation(defaultLocale, 'privacy.email')}</strong> skuliarnarsson@gmail.com</p>
                <p><strong>{getTranslation(defaultLocale, 'privacy.developer')}</strong> Skúli Arnarsson</p>
                <p><strong>{getTranslation(defaultLocale, 'privacy.github')}</strong> <Link href="https://github.com/skulia15" className="text-blue-600 hover:underline">github.com/skulia15</Link></p>
                <p><strong>{getTranslation(defaultLocale, 'privacy.location')}</strong> Hafnarfjörður, Iceland</p>
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  {getTranslation(defaultLocale, 'privacy.privacyNotice')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
