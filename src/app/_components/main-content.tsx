"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

interface MainContentProps {
    children: ReactNode;
}

export function MainContent({ children }: MainContentProps) {
    const pathname = usePathname();
    const isFrontPage = pathname === "/";

    return (
        <main className={`flex-1 ${isFrontPage ? "pt-16" : "pt-16 p-4 md:p-16"}`}>
            <div id="app-container" className={isFrontPage ? "h-full" : ""}>
                {children}
            </div>
        </main>
    );
} 