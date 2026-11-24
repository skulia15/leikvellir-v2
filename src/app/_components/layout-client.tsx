"use client";

import { type ReactNode, createContext, useContext } from "react";
import { usePathname } from "next/navigation";

interface LayoutContextType {
    shouldShowFooter: boolean;
    hideFooterOnMobile: boolean;
}

const LayoutContext = createContext<LayoutContextType>({
    shouldShowFooter: true,
    hideFooterOnMobile: false,
});

export const useLayout = () => useContext(LayoutContext);

interface LayoutClientProps {
    children: ReactNode;
}

export function LayoutClient({ children }: LayoutClientProps) {
    const pathname = usePathname();
    const isFrontPage = pathname === "/";

    // Use pure CSS responsive classes so SSR and mobile hydration match with zero CLS:
    // - Front page mobile: fixed 100dvh with overflow-hidden so iOS Safari chrome never clips
    // - Front page desktop (md+): min-h-screen so footer is reachable below the map
    // - Other pages: normal scrollable min-h-screen layout
    const containerClasses = isFrontPage
        ? "flex flex-col h-[100dvh] overflow-hidden md:h-auto md:min-h-screen md:overflow-visible"
        : "flex flex-col min-h-screen";

    return (
        <LayoutContext.Provider
            value={{
                shouldShowFooter: true,
                hideFooterOnMobile: isFrontPage,
            }}
        >
            <div className={containerClasses}>
                {children}
            </div>
        </LayoutContext.Provider>
    );
}