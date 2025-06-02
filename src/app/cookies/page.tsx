// app/cookies/page.tsx
import type { Metadata } from "next";
import CookieManagementPage from "./_components/cookie-management-client";

export const metadata: Metadata = {
    title: "Cookie Management | Leikvellir",
    description: "Manage your cookie preferences and data collection settings.",
};

export default function CookiesPage() {
    return <CookieManagementPage />;
}

// TypeScript declarations for global objects
declare global {
    interface Window {
        posthog?: {
            opt_in_capturing: () => void;
            opt_out_capturing: () => void;
        };
    }
}
