import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { Fira_Sans } from "next/font/google";
import { type Metadata } from "next";
import { Toaster } from "sonner";

import { TRPCReactProvider } from "~/trpc/react";
import { AppErrorBoundary } from "~/components/ui/error-boundary";
import NavigationBar from "./_components/navigation-bar";
import { getServerAuthSession } from "~/server/auth";
import { Providers } from "./_components/providers";

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
      <body className="min-h-screen bg-background">
        <Providers session={session}>
          <NavigationBar />
          <AppErrorBoundary>
            <TRPCReactProvider>
              <main className="pt-16">
                <div id="app-container">{children}</div>
              </main>
            </TRPCReactProvider>
          </AppErrorBoundary>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
