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

const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-fira-sans",
});

export const metadata: Metadata = {
  title: "Leiksvæði",
  // TODO: find a better description
  description: "Discover and map playgrounds across Iceland",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerAuthSession();

  return (
    <html lang="en" className={`${GeistSans.variable} ${firaSans.variable}`}>
      <head>
        <meta name="google-site-verification" content="51PPDlaCttszidyW9wyKGGgd729BuUb0wWLY2M9lQAc" />
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
