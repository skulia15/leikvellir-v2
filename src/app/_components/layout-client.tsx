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

    useEffect(() => {
        const isFrontPage = pathname === "/";

        const checkMobile = () => {
            const isMobile = window.innerWidth < 768;
            // Hide footer on front page when on mobile
            setShouldShowFooter(!(isFrontPage && isMobile));
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, [pathname]);

    return (
        <LayoutContext.Provider value={{ shouldShowFooter }}>
            <div className="flex flex-col">
                {children}
            </div>
        </LayoutContext.Provider>
    );
} 