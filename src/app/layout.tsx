import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { Fira_Sans, Outfit } from "next/font/google";
import { type Metadata, type Viewport } from "next";
import { Toaster } from "sonner";

import NavigationBar from "./_components/navigation-bar";
import { getServerAuthSession } from "~/server/auth";
import { getServerLocale } from "~/lib/i18n/server";
import { Providers } from "./_components/providers";
import { Footer } from "./_components/footer";
import { CookieConsentBanner } from "./_components/cookie-consent-banner";
import { MainContent } from "./_components/main-content";
import { FloatingFeedbackButton } from "~/components/ui/floating-feedback-button";
import { LayoutClient } from "./_components/layout-client";
import { generateMetadata as generateSEOMetadata } from "~/lib/seo/metadata";
import { OrganizationSchema, WebsiteSchema } from "~/lib/seo/structured-data";

const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-fira-sans",
  display: "swap",
  preload: true,
});

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = generateSEOMetadata();

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
    <html lang={locale} className={`${GeistSans.variable} ${firaSans.variable} ${outfit.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Leiksvæði" />
        <link rel="preconnect" href="https://api.mapbox.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <OrganizationSchema />
        <WebsiteSchema />
      </head>
      <body className="bg-background">
        <Providers session={session} initialLocale={locale}>
          <LayoutClient>
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
