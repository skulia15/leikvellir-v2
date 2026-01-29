"use client";

import { type ReactNode, createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";

interface LayoutContextType {
    shouldShowFooter: boolean;
}

const LayoutContext = createContext<LayoutContextType>({ shouldShowFooter: true });

export const useLayout = () => useContext(LayoutContext);

interface LayoutClientProps {
    children: ReactNode;
}

export function LayoutClient({ children }: LayoutClientProps) {
    const pathname = usePathname();
    const [shouldShowFooter, setShouldShowFooter] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const isFrontPage = pathname === "/";

        // Hide footer only on mobile front page to prevent scrolling
        // Desktop front page should show footer when scrolled to bottom
        const updateFooterVisibility = () => {
            const isMobileDevice = window.innerWidth < 768;
            setShouldShowFooter(!(isFrontPage && isMobileDevice));
        };

        updateFooterVisibility();
        window.addEventListener("resize", updateFooterVisibility);
        return () => window.removeEventListener("resize", updateFooterVisibility);
    }, [pathname]);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const isFrontPage = pathname === "/";

    // On front page mobile: use h-screen with overflow-hidden to prevent scrolling
    // On front page desktop: use min-h-screen to allow map to take full height
    // On other pages: use min-h-screen for normal scrollable layout
    const containerClasses = isFrontPage && isMobile
        ? "flex flex-col h-screen"
        : "flex flex-col min-h-screen";

    return (
        <LayoutContext.Provider value={{ shouldShowFooter }}>
            <div className={containerClasses}>
                {children}
            </div>
        </LayoutContext.Provider>
    );
} 