"use client";

import { AlertTriangle, Bug, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

interface ErrorContext {
    component?: string;
    action?: string;
    [key: string]: unknown;
}

interface ErrorEntry {
    timestamp: number;
    component: string;
    action: string;
    error: Error;
    context?: ErrorContext;
}

interface ErrorStats {
    totalErrors: number;
    recentErrorRate: number;
    errorsByComponent: Record<string, number>;
}

// Simple error tracking for development
class SimpleErrorReporter {
    private errors: ErrorEntry[] = [];
    private maxErrors = 100;

    reportError(error: Error, context: ErrorContext = {}) {
        const entry: ErrorEntry = {
            timestamp: Date.now(),
            component: context.component ?? "Unknown",
            action: context.action ?? "unknown",
            error,
            context,
        };

        this.errors.push(entry);

        // Keep only the most recent errors
        if (this.errors.length > this.maxErrors) {
            this.errors = this.errors.slice(-this.maxErrors);
        }
    }

    getRecentErrors(minutes = 10): ErrorEntry[] {
        const cutoff = Date.now() - (minutes * 60 * 1000);
        return this.errors.filter(error => error.timestamp > cutoff);
    }

    getErrorStats(): ErrorStats {
        const recentErrors = this.getRecentErrors();
        const errorsByComponent: Record<string, number> = {};

        recentErrors.forEach(error => {
            errorsByComponent[error.component] = (errorsByComponent[error.component] || 0) + 1;
        });

        return {
            totalErrors: this.errors.length,
            recentErrorRate: recentErrors.length / 10, // per minute
            errorsByComponent,
        };
    }

    clearErrors() {
        this.errors = [];
    }
}

// Global error reporter instance
const errorReporter = new SimpleErrorReporter();

export function ErrorDashboard() {
    const [errors, setErrors] = useState<ErrorEntry[]>([]);
    const [stats, setStats] = useState<ErrorStats>({
        totalErrors: 0,
        recentErrorRate: 0,
        errorsByComponent: {},
    });
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Only show in development or if there are recent errors
        const isDev = process.env.NODE_ENV === "development";
        const hasRecentErrors = stats.recentErrorRate > 0;
        setIsVisible(isDev || hasRecentErrors);

        // Refresh every 30 seconds
        const interval = setInterval(() => {
            setErrors(errorReporter.getRecentErrors());
            setStats(errorReporter.getErrorStats());
        }, 30000);

        // Initial load
        setErrors(errorReporter.getRecentErrors());
        setStats(errorReporter.getErrorStats());

        return () => clearInterval(interval);
    }, [stats.recentErrorRate]);

    if (!isVisible) return null;

    const clearErrors = () => {
        errorReporter.clearErrors();
        setErrors([]);
        setStats(errorReporter.getErrorStats());
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 max-w-md">
            <Card className="border-destructive">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Bug className="h-4 w-4" />
                        Error Dashboard
                        {stats.recentErrorRate > 0 && (
                            <Badge variant="destructive" className="text-xs">
                                {stats.recentErrorRate.toFixed(1)}/min
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {/* Quick stats */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                            <div className="font-semibold">{stats.totalErrors}</div>
                            <div className="text-muted-foreground">Total</div>
                        </div>
                        <div className="text-center">
                            <div className="font-semibold">{Object.keys(stats.errorsByComponent).length}</div>
                            <div className="text-muted-foreground">Components</div>
                        </div>
                        <div className="text-center">
                            <div className="font-semibold text-destructive">
                                {Math.round(stats.recentErrorRate * 10) / 10}
                            </div>
                            <div className="text-muted-foreground">Rate/min</div>
                        </div>
                    </div>

                    {/* Top error components */}
                    {Object.keys(stats.errorsByComponent).length > 0 && (
                        <div>
                            <div className="text-xs font-medium mb-1">Top Error Sources:</div>
                            <div className="space-y-1">
                                {Object.entries(stats.errorsByComponent)
                                    .sort(([, a], [, b]) => b - a)
                                    .slice(0, 3)
                                    .map(([component, count]) => (
                                        <div key={component} className="flex justify-between text-xs">
                                            <span className="truncate">{component}</span>
                                            <Badge variant="outline" className="text-xs">
                                                {count}
                                            </Badge>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Recent errors */}
                    {errors.length > 0 && (
                        <div>
                            <div className="text-xs font-medium mb-1">Recent Errors:</div>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {errors.slice(-5).map((error, index) => (
                                    <div key={index} className="text-xs p-2 bg-muted rounded">
                                        <div className="flex items-center gap-1 mb-1">
                                            <AlertTriangle className="h-3 w-3 text-destructive" />
                                            <span className="font-medium truncate">
                                                {error.component || "Unknown"}
                                            </span>
                                            <Clock className="h-3 w-3 text-muted-foreground ml-auto" />
                                        </div>
                                        <div className="text-muted-foreground truncate">
                                            {error.error.message}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={clearErrors}
                            className="text-xs"
                        >
                            Clear
                        </Button>
                        {process.env.NODE_ENV === "development" && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => console.table(errors)}
                                className="text-xs"
                            >
                                Debug
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Export the error reporter for use in other components
export { errorReporter };
