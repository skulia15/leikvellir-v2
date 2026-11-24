import "~/styles/globals.css";

import { Outfit } from "next/font/google";
import { type Metadata, type Viewport } from "next";
import { Toaster } from "sonner";

import NavigationBar from "./_components/navigation-bar";
import { getServerAuthSession } from "~/server/auth";
import { getServerLocale } from "~/lib/i18n/server";
import { Providers } from "./_components/providers";
import { Footer } from "./_components/footer";
import { CookieConsentBanner } from "./_components/cookie-consent-banner";
import { MainContent } from "./_components/main-content";
import { SkipToContent } from "./_components/skip-to-content";
import { FloatingFeedbackButton } from "~/components/ui/floating-feedback-button";
import { LayoutClient } from "./_components/layout-client";
import { generateRootMetadata } from "~/lib/seo/metadata";
import { OrganizationSchema, WebsiteSchema } from "~/lib/seo/structured-data";

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = generateRootMetadata();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerAuthSession();
  const locale = await getServerLocale();

  return (
    <html lang={locale} className={outfit.variable}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Leiksvæði" />
        <link rel="preconnect" href="https://api.mapbox.com" />
        <OrganizationSchema />
        <WebsiteSchema />
      </head>
      <body className="bg-background">
        <Providers session={session} initialLocale={locale}>
          <LayoutClient>
            <SkipToContent />
            <NavigationBar />
            <MainContent>
              {children}
            </MainContent>
            <Footer />
          </LayoutClient>
          <FloatingFeedbackButton />
          <Toaster />
          <CookieConsentBanner />
        </Providers>
      </body>
    </html>
  );
}
