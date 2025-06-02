// app/privacy/page.tsx
import { type Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Shield, Cookie, Database, Eye, UserCheck } from "lucide-react";
import { Button } from "~/components/ui/button";

export const metadata: Metadata = {
  title: "Privacy Policy - Leikvellir",
  description: "Privacy Policy and Cookie Usage for Leikvellir - Iceland's playground discovery platform",
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
                Back to Map
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Privacy Policy</h1>
              <p className="text-muted-foreground">
                Last updated: {new Date().toLocaleDateString("en-US", {
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
                Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Leikvellir is committed to protecting your privacy.
                This Privacy Policy explains how we collect, use, and safeguard your information
                when you use our playground discovery platform for Iceland.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm">
                  <strong>Key Points:</strong> We collect minimal data necessary for the service,
                  use cookies for analytics and functionality, and never sell your personal information.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Information We Collect */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-green-500" />
                Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Account Information
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Email address (via Discord OAuth)</li>
                  <li>Display name (via Discord OAuth)</li>
                  <li>Discord user ID (for authentication)</li>
                  <li>Account creation and last login timestamps</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">User-Generated Content</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Playground submissions (location, title, images, equipment details)</li>
                  <li>Uploaded photographs of playgrounds</li>
                  <li>Equipment and accessibility information</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Location Data</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Approximate location (when voluntarily shared for distance calculations)</li>
                  <li>Playground coordinates (for mapping purposes)</li>
                  <li>Location data is stored locally in your browser and not sent to our servers</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Technical Information</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Browser type and version</li>
                  <li>Device type and screen resolution</li>
                  <li>IP address (for security and analytics)</li>
                  <li>Usage patterns and feature interactions</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Cookie Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cookie className="h-5 w-5 text-orange-500" />
                Cookie Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p>
                We use cookies and similar technologies to enhance your experience and understand
                how our service is used. Here's a breakdown of our cookie usage:
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-green-600 mb-2">Essential Cookies</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Required for basic functionality. Cannot be disabled.
                  </p>
                  <ul className="list-disc list-inside text-xs space-y-1">
                    <li>Authentication session cookies</li>
                    <li>Security tokens</li>
                    <li>Form submission protection</li>
                    <li>User preference storage</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-blue-600 mb-2">Analytics Cookies</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Help us understand usage patterns (via PostHog).
                  </p>
                  <ul className="list-disc list-inside text-xs space-y-1">
                    <li>Page views and user journeys</li>
                    <li>Feature usage statistics</li>
                    <li>Performance metrics</li>
                    <li>Anonymous user behavior tracking</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-purple-600 mb-2">Functional Cookies</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Enhance your experience with the platform.
                  </p>
                  <ul className="list-disc list-inside text-xs space-y-1">
                    <li>Location cache (browser storage)</li>
                    <li>Map preferences</li>
                    <li>Filter settings</li>
                    <li>UI state persistence</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-600 mb-2">Third-Party Cookies</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    From external services we integrate with.
                  </p>
                  <ul className="list-disc list-inside text-xs space-y-1">
                    <li>Google Maps API cookies</li>
                    <li>Discord OAuth cookies</li>
                    <li>PostHog analytics cookies</li>
                    <li>CDN and performance cookies</li>
                  </ul>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-800 mb-2">Managing Cookies</h4>
                <p className="text-sm text-amber-700">
                  You can manage your cookie preferences using our cookie banner or through your
                  browser settings. Disabling certain cookies may limit some functionality.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* How We Use Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-indigo-500" />
                How We Use Your Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Service Functionality</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Authenticate users and manage accounts</li>
                    <li>Display and manage playground submissions</li>
                    <li>Calculate distances to playgrounds (when location is shared)</li>
                    <li>Moderate content and prevent abuse</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Analytics and Improvement</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Understand usage patterns and popular features</li>
                    <li>Monitor system performance and reliability</li>
                    <li>Identify and fix bugs or issues</li>
                    <li>Plan new features based on user needs</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Communication</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Send important service updates</li>
                    <li>Respond to support requests</li>
                    <li>Notify about policy changes</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Sharing */}
          <Card>
            <CardHeader>
              <CardTitle>Data Sharing and Third Parties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                We do not sell, trade, or rent your personal information to third parties.
                We may share information only in these specific circumstances:
              </p>

              <div className="space-y-3">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold">Service Providers</h4>
                  <p className="text-sm text-muted-foreground">
                    PostHog (analytics), Vercel (hosting), Google Maps (mapping services)
                  </p>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-semibold">Legal Requirements</h4>
                  <p className="text-sm text-muted-foreground">
                    When required by law or to protect rights and safety
                  </p>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-semibold">Public Content</h4>
                  <p className="text-sm text-muted-foreground">
                    Approved playground submissions are publicly visible on the map
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Your Rights */}
          {/* <Card>
            <CardHeader>
              <CardTitle>Your Rights and Choices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>You have the following rights regarding your personal information:</p>
              
              <div className="grid gap-3 md:grid-cols-2">
                <div className="border rounded-lg p-3">
                  <h4 className="font-semibold text-sm">Access & Portability</h4>
                  <p className="text-xs text-muted-foreground">
                    Request a copy of your data in a portable format
                  </p>
                </div>
                
                <div className="border rounded-lg p-3">
                  <h4 className="font-semibold text-sm">Correction</h4>
                  <p className="text-xs text-muted-foreground">
                    Update or correct inaccurate information
                  </p>
                </div>
                
                <div className="border rounded-lg p-3">
                  <h4 className="font-semibold text-sm">Deletion</h4>
                  <p className="text-xs text-muted-foreground">
                    Request deletion of your account and data
                  </p>
                </div>
                
                <div className="border rounded-lg p-3">
                  <h4 className="font-semibold text-sm">Cookie Control</h4>
                  <p className="text-xs text-muted-foreground">
                    Manage cookie preferences and opt-out of analytics
                  </p>
                </div>
              </div>
            </CardContent>
          </Card> */}

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                If you have questions about this Privacy Policy or want to exercise your rights:
              </p>

              <div className="space-y-2 text-sm">
                <p><strong>Email:</strong> skuliarnarsson@gmail.com</p>
                <p><strong>Developer:</strong> Skúli Arnarsson</p>
                <p><strong>GitHub:</strong> <Link href="https://github.com/skulia15" className="text-blue-600 hover:underline">github.com/skulia15</Link></p>
                <p><strong>Location:</strong> Hafnarfjörður, Iceland</p>
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  This privacy policy may be updated periodically. We will notify users of
                  significant changes via email or through the application.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
