import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

import { TRPCReactProvider } from "~/trpc/react";
import { ErrorBoundary } from "~/components/ui/error-boundary";
import NavigationBar from "./_components/navigation-bar";

export const metadata: Metadata = {
  title: "Leikvellir",
  // TODO: find a better description
  description: "Discover and map playgrounds across Iceland",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body className="min-h-screen bg-background">
        <NavigationBar />
        <ErrorBoundary
          onError={(error, errorInfo) => {
            // In production, you might want to send this to an error monitoring service
            console.error("Application error:", error, errorInfo);
          }}
        >
          <TRPCReactProvider>
            <main className="pt-20">
              <div id="app-container">{children}</div>
            </main>
          </TRPCReactProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
