"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useState, useEffect } from "react";

interface MainContentProps {
    children: ReactNode;
}

export function MainContent({ children }: MainContentProps) {
    const pathname = usePathname();
    const [isMobile, setIsMobile] = useState(false);
    const isFrontPage = pathname === "/";

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Only apply overflow-hidden on mobile front page to prevent scrolling
    // Desktop front page should allow normal scrolling behavior
    const getMainClasses = () => {
        if (isFrontPage) {
            return isMobile
                ? "flex-1 pt-16 overflow-hidden"
                : "flex-1 pt-16";
        }
        return "flex-1 pt-16 p-4 md:p-16";
    };

    return (
        <main className={getMainClasses()}>
            <div id="app-container" className={isFrontPage ? "h-full" : ""}>
                {children}
            </div>
        </main>
    );
} 