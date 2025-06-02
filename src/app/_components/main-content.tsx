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
        <main className={`flex-1 pt-16 ${isFrontPage ? "" : "p-16"}`}>
            <div id="app-container">{children}</div>
        </main>
    );
} 