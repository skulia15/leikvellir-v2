// test/test-utils.tsx
import React, { type ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "~/server/api/root";
import { LanguageProvider } from "~/lib/i18n";

// Create tRPC client for testing
export const trpc = createTRPCReact<AppRouter>();

/**
 * Create a wrapper component with all providers needed for testing
 */
function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const trpcClient = trpc.createClient({
      links: [
        // Mock link for testing - will be handled by MSW
        () => () => {
          throw new Error("tRPC should be mocked in tests");
        },
      ],
    });

    return (
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <LanguageProvider initialLocale="en">
            {children}
          </LanguageProvider>
        </QueryClientProvider>
      </trpc.Provider>
    );
  };
}

/**
 * Custom render function with providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(ui, { wrapper: createWrapper(), ...options });
}

/**
 * Create mock File objects for testing
 */
export function createMockFile(
  name: string,
  size: number,
  type: string,
  content?: string,
): File {
  const file = new File([content ?? "mock file content"], name, { type });

  // Override size property since File constructor doesn't respect it
  Object.defineProperty(file, "size", {
    value: size,
    writable: false,
  });

  return file;
}

/**
 * Create mock image files with proper signatures
 */
export function createMockImageFile(
  name = "test-image.jpg",
  size = 1024 * 100, // 100KB
  type = "image/jpeg",
): File {
  return createMockFile(name, size, type, "mock image content");
}

interface MockSessionOverrides {
  user?: {
    id?: string;
    name?: string;
    email?: string;
    image?: string | null;
  };
  expires?: string;
}

/**
 * Create mock session data for testing
 */
export function createMockSession(overrides?: MockSessionOverrides) {
  return {
    user: {
      id: "test-user-123",
      name: "Test User",
      email: "test@example.com",
      image: null,
      ...overrides?.user,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

interface MockPlaygroundOverrides {
  id?: number;
  title?: string;
  latitude?: number;
  longitude?: number;
  publiclyAccessible?: boolean;
  toddlerFriendly?: boolean;
  coverImage?: string;
  images?: string[];
  createdById?: string;
  createdAt?: Date;
  updatedAt?: Date | null;
}

/**
 * Create mock playground data for testing
 */
export function createMockPlayground(overrides?: MockPlaygroundOverrides) {
  return {
    id: 1,
    title: "Test Playground",
    latitude: 64.071,
    longitude: -21.954,
    publiclyAccessible: true,
    toddlerFriendly: false,
    coverImage: "/uploads/playgrounds/test-image.jpg",
    images: ["/uploads/playgrounds/test-image.jpg"],
    createdById: "test-user-123",
    createdAt: new Date(),
    updatedAt: null,
    ...overrides,
  };
}

/**
 * Helper to wait for async operations in tests
 */
export function waitFor(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Re-export everything from testing library
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
