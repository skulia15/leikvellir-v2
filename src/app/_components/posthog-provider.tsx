// app/_components/posthog-provider.tsx
"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect } from "react";
import { cookieUtils } from "./cookie-consent-banner";

if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
    person_profiles: "identified_only", // or 'always' to create profiles for anonymous users as well
    loaded: (posthog) => {
      // Only track if analytics cookies are consented to
      const canUseAnalytics = cookieUtils.canUseAnalytics();
      if (!canUseAnalytics) {
        posthog.opt_out_capturing();
      }
      
      if (process.env.NODE_ENV === "development") {
        console.log("PostHog loaded. Tracking:", canUseAnalytics ? "enabled" : "disabled");
      }
    },
    // Disable in development unless explicitly enabled
    disable_session_recording: process.env.NODE_ENV === "development",
    capture_pageview: false, // We'll handle this manually
    capture_pageleave: true,
    // Privacy settings
    respect_dnt: true,
    opt_out_capturing_by_default: true, // Start opted out, enable after consent
  });
}

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Check consent status and initialize accordingly
    const checkConsent = () => {
      if (cookieUtils.hasConsented()) {
        const canUseAnalytics = cookieUtils.canUseAnalytics();
        if (canUseAnalytics) {
          posthog.opt_in_capturing();
          // Capture page view manually with privacy in mind
          posthog.capture("$pageview", {
            $current_url: window.location.href,
            $pathname: window.location.pathname,
          });
        } else {
          posthog.opt_out_capturing();
        }
      }
    };

    checkConsent();

    // Listen for storage changes (consent updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "leikvellir-cookie-consent") {
        checkConsent();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}

// Hook for tracking events with consent check
export function usePostHogTracking() {
  const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    if (cookieUtils.canUseAnalytics()) {
      posthog.capture(eventName, properties);
    }
  };

  const identifyUser = (userId: string, properties?: Record<string, any>) => {
    if (cookieUtils.canUseAnalytics()) {
      posthog.identify(userId, properties);
    }
  };

  const resetUser = () => {
    if (cookieUtils.canUseAnalytics()) {
      posthog.reset();
    }
  };

  return {
    trackEvent,
    identifyUser,
    resetUser,
    canTrack: cookieUtils.canUseAnalytics(),
  };
}

// Export for use in layout or providers
export { posthog };
