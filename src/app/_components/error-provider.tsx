"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";

interface ErrorContext {
    component?: string;
    action?: string;
    [key: string]: unknown;
}

interface ErrorProviderProps {
    children: ReactNode;
}

const ErrorContext = createContext<{
    reportError: (error: Error, context?: ErrorContext) => void;
}>({
    reportError: (error: Error, context?: ErrorContext) => {
        console.error("Error reported:", error, context);
    }
});

export function ErrorProvider({ children }: ErrorProviderProps) {
    useEffect(() => {
        // Global error handler for unhandled promise rejections
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            console.error("Unhandled promise rejection:", event.reason);
        };

        // Global error handler for runtime errors
        const handleError = (event: ErrorEvent) => {
            console.error("Runtime error:", event.error);
        };

        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        window.addEventListener('error', handleError);

        return () => {
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
            window.removeEventListener('error', handleError);
        };
    }, []);

    const reportError = (error: Error, context?: ErrorContext) => {
        console.error("Reported error:", error, context);

        // In a real application, you might send this to a logging service
        // or store it for the error dashboard
    };

    return (
        <ErrorContext.Provider value={{ reportError }}>
            {children}
        </ErrorContext.Provider>
    );
}

export function useErrorReporting() {
    return useContext(ErrorContext);
}