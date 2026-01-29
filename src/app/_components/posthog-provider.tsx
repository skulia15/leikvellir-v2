"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Defer PostHog initialization to reduce main thread blocking
    const initializePostHog = () => {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host: "/ingest",
        ui_host: "https://eu.posthog.com",
        capture_pageview: false, // We capture pageviews manually
        capture_pageleave: true, // Enable pageleave capture
        capture_exceptions: true, // This enables capturing exceptions using Error Tracking
        debug: false, // Disable debug mode to reduce console noise
        verbose: false, // Disable verbose logging
        
        // Optimize performance and caching
        persistence: "localStorage+cookie", // Use localStorage for better caching
        persistence_name: "ph_leiksvæði", // Custom persistence name
        cross_subdomain_cookie: false, // Optimize for single domain
        secure_cookie: true, // Secure cookies in production
        
        loaded: () => {
          // PostHog loaded
        },
      });
    };

    // Use requestIdleCallback to defer initialization until the browser is idle
    if (typeof window !== "undefined") {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(initializePostHog, { timeout: 2000 });
      } else {
        // Fallback for browsers that don't support requestIdleCallback
        setTimeout(initializePostHog, 1000);
      }
    }
  }, []);

  return (
    <PHProvider client={posthog}>
      <SuspendedPostHogPageView />
      {children}
    </PHProvider>
  );
}

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname;
      const search = searchParams.toString();
      if (search) {
        url += "?" + search;
      }
      posthog.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams, posthog]);

  return null;
}

function SuspendedPostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageView />
    </Suspense>
  );
}
