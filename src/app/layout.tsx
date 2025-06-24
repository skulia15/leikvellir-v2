import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { Fira_Sans } from "next/font/google";
import { type Metadata } from "next";
import { Toaster } from "sonner";

import NavigationBar from "./_components/navigation-bar";
import { getServerAuthSession } from "~/server/auth";
import { Providers } from "./_components/providers";
// import { ErrorDashboard } from "./_components/error-dashboard";
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

export const metadata: Metadata = generateSEOMetadata();

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerAuthSession();

  return (
    <html lang="is" className={`${GeistSans.variable} ${firaSans.variable}`}>
      <head>
        <meta name="google-site-verification" content="T6ALXq-rzn0arBTQuAPGDqNpTKMf49319JZIAsW3Mfo" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Leiksvæði" />
        {/* Preconnect to Google APIs to improve performance */}
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="preconnect" href="https://maps.gstatic.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <OrganizationSchema />
        <WebsiteSchema />
      </head>
      <body className="bg-background">
        <Providers session={session}>
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
          {/* {process.env.NODE_ENV === "development" && <ErrorDashboard />} */}
        </Providers>
      </body>
    </html>
  );
}
