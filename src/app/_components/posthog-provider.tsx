"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { PostHog } from "posthog-js";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [posthogClient, setPosthogClient] = useState<PostHog | null>(null);

  useEffect(() => {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (typeof window === "undefined" || !posthogKey) {
      return;
    }

    let cancelled = false;
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // Defer PostHog bundle load and initialization to reduce main thread blocking and initial bundle size
    const initializePostHog = () => {
      void import("posthog-js")
        .then(({ default: posthog }) => {
          if (cancelled) return;

          posthog.init(posthogKey, {
            api_host: "/ingest",
            ui_host: "https://eu.posthog.com",
            capture_pageview: false, // We capture pageviews manually
            capture_pageleave: true, // Enable pageleave capture
            capture_exceptions: true, // This enables capturing exceptions using Error Tracking
            debug: false, // Disable debug mode to reduce console noise

            // Optimize performance and caching
            persistence: "localStorage+cookie", // Use localStorage for better caching
            persistence_name: "ph_leiksvæði", // Custom persistence name
            cross_subdomain_cookie: false, // Optimize for single domain
            secure_cookie: true, // Secure cookies in production
          });

          window.posthog = posthog;
          setPosthogClient(posthog);
        })
        .catch((error) => {
          console.error("Failed to load PostHog:", error);
        });
    };

    if (window.requestIdleCallback) {
      idleId = window.requestIdleCallback(initializePostHog, { timeout: 2000 });
    } else {
      timeoutId = setTimeout(initializePostHog, 1000);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && window.cancelIdleCallback) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <>
      <SuspendedPostHogPageView posthog={posthogClient} />
      {children}
    </>
  );
}

function PostHogPageView({ posthog }: { posthog: PostHog | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

function SuspendedPostHogPageView({ posthog }: { posthog: PostHog | null }) {
  return (
    <Suspense fallback={null}>
      <PostHogPageView posthog={posthog} />
    </Suspense>
  );
}

declare global {
  interface Window {
    posthog?: PostHog;
  }
}
