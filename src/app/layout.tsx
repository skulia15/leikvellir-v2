import "~/styles/globals.css";

import { Outfit } from "next/font/google";
import { type Metadata, type Viewport } from "next";
import { Toaster } from "sonner";

import NavigationBar from "./_components/navigation-bar";
import { defaultLocale } from "~/lib/i18n/config";
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

// No server session or locale-cookie read here: either would opt every route out of static
// rendering. SessionProvider fetches the session client-side, and LanguageProvider switches to
// the saved locale (and updates <html lang>) on mount.
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={defaultLocale} className={outfit.variable}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Leiksvæði" />
        <link rel="preconnect" href="https://api.mapbox.com" />
        <OrganizationSchema />
        <WebsiteSchema />
      </head>
      <body className="bg-background">
        <Providers>
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
