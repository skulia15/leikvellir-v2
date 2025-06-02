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

const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-fira-sans",
});

export const metadata: Metadata = {
  title: "Leikvellir",
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
      <body className="bg-background">
        <Providers session={session}>
          <div className="flex flex-col">
            <NavigationBar />
            <MainContent>
              {children}
            </MainContent>
            <Footer />
          </div>
          <Toaster />
          <CookieConsentBanner />
          {/* {process.env.NODE_ENV === "development" && <ErrorDashboard />} */}
        </Providers>
      </body>
    </html>
  );
}
