"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

interface MainContentProps {
    children: ReactNode;
}

export function MainContent({ children }: MainContentProps) {
    const pathname = usePathname();
    const isFrontPage = pathname === "/";

    // The front page is map-first and manages its own height; every other route
    // gets the standard page padding.
    const mainClasses = isFrontPage
        ? "flex-1 pt-16 min-h-0"
        : "flex-1 pt-16 p-4 md:p-16";

    return (
        <main className={mainClasses}>
            <div id="app-container" className={isFrontPage ? "h-full" : ""}>
                {children}
            </div>
        </main>
    );
}