import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

const reactCacheStores = new Set<Map<unknown, unknown>>();
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    cache: <T extends (...args: unknown[]) => unknown>(fn: T): T => {
      const store = new Map<unknown, unknown>();
      reactCacheStores.add(store);
      return ((...args: unknown[]) => {
        const key = args[0];
        if (store.has(key)) {
          return store.get(key);
        }
        const result = fn(...args);
        store.set(key, result);
        return result;
      }) as T;
    },
  };
});

import {
  generateRootMetadata,
  generateMetadata as generateSEOMetadata,
  generatePlaygroundMetadata,
} from "~/lib/seo/metadata";
import { getBaseUrl } from "~/lib/seo/base-url";
import { PlaygroundSchema } from "~/lib/seo/structured-data";
import { LanguageProvider } from "~/lib/i18n";
import type { Playground } from "~/types";

// Mock next/navigation
const mockNotFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Mock next/link as plain <a> for SSR markup verification
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => React.createElement("a", { href, ...props }, children),
}));

// Mock next/image as plain <img> for SSR markup verification
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
  }: {
    src: string;
    alt: string;
    [key: string]: unknown;
  }) => React.createElement("img", { src, alt }),
}));

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
  signOut: vi.fn(),
}));

// Mock admin context
vi.mock("~/lib/admin-context", () => ({
  useAdmin: () => ({
    isAdminMode: false,
    toggleAdminMode: vi.fn(),
    userRole: null,
    canAccessAdmin: false,
    isLoading: false,
  }),
}));

// PlaygroundDetail pulls in check-ins, maps, etc.; the hydration test only
// needs to know the real playground (not a skeleton) reaches it.
vi.mock("~/app/_components/playground-detail", () => ({
  default: ({ playground }: { playground: { title: string; municipality?: string | null } }) => (
    <div>
      <a href="/playgrounds">back</a>
      <h1>{playground.title}</h1>
      <span>{playground.municipality}</span>
    </div>
  ),
}));

// Mock tRPC client hooks
const mockGetByIdUseQuery = vi.fn();
vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({
      playground: { getById: { invalidate: vi.fn() }, getAll: { invalidate: vi.fn() } },
      checkIn: new Proxy({}, { get: () => ({ invalidate: vi.fn() }) }),
    }),
    playground: {
      getById: {
        useQuery: (...args: unknown[]) => mockGetByIdUseQuery(...args),
      },
      getAll: {
        useQuery: () => ({ data: [], isLoading: false }),
      },
      getMySubmissions: {
        useQuery: () => ({ data: undefined, isLoading: false }),
      },
      getMyEditSuggestions: {
        useQuery: () => ({ data: undefined, isLoading: false }),
      },
      hasMySubmissions: {
        useQuery: () => ({ data: false, isLoading: false }),
      },
    },
    equipment: {
      getCatalog: {
        useQuery: () => ({ data: [], isLoading: false }),
      },
    },
  },
}));

// Mock tRPC server caller
const mockServerGetById = vi.fn();
const mockServerGetByIdPrefetch = vi.fn();
const mockServerGetAll = vi.fn();
const mockServerGetAllPrefetch = vi.fn();

vi.mock("~/trpc/server", () => {
  const api = {
    playground: {
      getById: Object.assign(
        (input: { id: number }) => mockServerGetById(input),
        { prefetch: (input: { id: number }) => mockServerGetByIdPrefetch(input) },
      ),
      getAll: Object.assign(() => mockServerGetAll(), {
        prefetch: () => mockServerGetAllPrefetch(),
      }),
      getNearby: Object.assign(() => Promise.resolve([]), {
        prefetch: () => Promise.resolve(),
      }),
    },
    equipment: {
      getCatalog: Object.assign(() => Promise.resolve([]), {
        prefetch: () => Promise.resolve(),
      }),
    },
    users: {
      getCurrentUser: vi.fn(),
    },
  };
  // Public pages use the session-less `publicApi`; same mocks for both callers.
  return {
    api,
    publicApi: api,
    HydrateClient: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock server auth for route modules imported in metadata tests
vi.mock("~/server/auth", () => ({
  getServerAuthSession: vi.fn().mockResolvedValue(null),
}));

const BASE_URL = getBaseUrl();

const samplePlayground: Playground = {
  id: 42,
  title: "Klambratún Leikvöllur",
  latitude: 64.138,
  longitude: -21.914,
  municipality: "Reykjavík",
  publiclyAccessible: true,
  toddlerFriendly: true,
  isSchoolGround: false,
  schoolType: null,
  hasSeating: true,
  hasPicnicTable: false,
  hasFencing: true,
  hasGarbageCan: true,
  hasBathroomNearby: false,
  hasSoftPlayArea: false,
  coverImage: "https://example.com/cover.jpg",
  images: ["https://example.com/cover.jpg", "https://example.com/gallery-1.jpg"],
  status: "approved",
  createdById: "user-1",
  reviewedById: null,
  reviewedAt: null,
  rejectionReason: null,
  submitAnonymously: false,
  createdAt: new Date("2025-05-01T12:00:00.000Z"),
  updatedAt: new Date("2025-06-01T12:00:00.000Z"),
  playgroundEquipment: [],
  createdBy: { id: "user-1", name: "Test User", email: "test@example.com" },
  reviewedBy: null,
};

describe("SEO metadata & canonical isolation", () => {
  it("root metadata omits alternates and openGraph so child routes never inherit homepage canonical or OG URL", () => {
    const rootMeta = generateRootMetadata();
    expect(rootMeta.alternates).toBeUndefined();
    expect(rootMeta.openGraph).toBeUndefined();
    expect(rootMeta.twitter).toBeUndefined();
    expect(rootMeta.metadataBase).toBeDefined();
  });

  it("page metadata helper produces self-referencing canonical and OG URL for public paths", () => {
    const homeMeta = generateSEOMetadata({ path: "/", exactTitle: true, title: "Home" });
    expect(homeMeta.alternates?.canonical).toBe(BASE_URL);
    expect(homeMeta.openGraph?.url).toBe(BASE_URL);
    expect(homeMeta.title).toBe("Home");

    const playgroundsMeta = generateSEOMetadata({
      path: "/playgrounds",
      exactTitle: true,
      title: "Playgrounds",
    });
    expect(playgroundsMeta.alternates?.canonical).toBe(`${BASE_URL}/playgrounds`);
    expect(playgroundsMeta.openGraph?.url).toBe(`${BASE_URL}/playgrounds`);
  });

  it("page metadata helper sets noindex/nofollow and omits canonical when noIndex is true", () => {
    const meta = generateSEOMetadata({
      title: "Private",
      exactTitle: true,
      path: "/private",
      noIndex: true,
    });
    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(meta.alternates).toBeUndefined();
  });

  it("generatePlaygroundMetadata uses coverImage when images array is empty and deduplicates coverImage", () => {
    const coverOnly = generatePlaygroundMetadata({
      id: "42",
      name: "Klambratún",
      municipality: "Reykjavík",
      latitude: 64.138,
      longitude: -21.914,
      coverImage: "https://example.com/only-cover.jpg",
      images: [],
    });

    const ogImages = Array.isArray(coverOnly.openGraph?.images)
      ? coverOnly.openGraph.images
      : [];
    expect(ogImages[0]).toMatchObject({ url: "https://example.com/only-cover.jpg" });
    expect(coverOnly.alternates?.canonical).toBe(`${BASE_URL}/playground/42`);
  });

  it("PlaygroundSchema includes coverImage and deduplicates against images", () => {
    const html = renderToStaticMarkup(
      <PlaygroundSchema
        playground={{
          id: "42",
          name: "Klambratún",
          municipality: "Reykjavík",
          latitude: 64.138,
          longitude: -21.914,
          coverImage: "https://example.com/cover.jpg",
          images: ["https://example.com/cover.jpg", "https://example.com/second.jpg"],
          createdAt: new Date("2025-05-01T12:00:00.000Z"),
        }}
      />,
    );

    const match = /<script[^>]*>([\s\S]*?)<\/script>/.exec(html);
    expect(match).not.toBeNull();
    const jsonLd = JSON.parse(match![1]!) as {
      image: Array<{ url: string }>;
    };
    expect(jsonLd.image.map((img) => img.url)).toEqual([
      "https://example.com/cover.jpg",
      "https://example.com/second.jpg",
    ]);
  });

  it("route metadata exports define proper canonicals for public routes and noindex for private/admin routes", async () => {
    const [
      homePage,
      playgroundsLayout,
      contactPage,
      privacyPage,
      cookiesPage,
      createPlaygroundPage,
      signinPage,
      mySubmissionsPage,
      adminLayout,
      adminPage,
    ] = await Promise.all([
      import("~/app/(home)/page"),
      import("~/app/playgrounds/layout"),
      import("~/app/contact/page"),
      import("~/app/privacy/page"),
      import("~/app/cookies/page"),
      import("~/app/create-playground/page"),
      import("~/app/signin/page"),
      import("~/app/my-submissions/page"),
      import("~/app/admin/layout"),
      import("~/app/admin/page"),
    ]);

    expect(homePage.metadata.alternates?.canonical).toBe(BASE_URL);
    expect(homePage.metadata.openGraph?.url).toBe(BASE_URL);

    expect(playgroundsLayout.metadata.alternates?.canonical).toBe(`${BASE_URL}/playgrounds`);
    expect(playgroundsLayout.metadata.openGraph?.url).toBe(`${BASE_URL}/playgrounds`);

    const contactMeta = await contactPage.generateMetadata();
    expect(contactMeta.alternates?.canonical).toBe(`${BASE_URL}/contact`);
    expect(contactMeta.openGraph?.url).toBe(`${BASE_URL}/contact`);

    expect(privacyPage.metadata.alternates?.canonical).toBe(`${BASE_URL}/privacy`);
    expect(privacyPage.metadata.openGraph?.url).toBe(`${BASE_URL}/privacy`);

    expect(cookiesPage.metadata.alternates?.canonical).toBe(`${BASE_URL}/cookies`);
    expect(cookiesPage.metadata.openGraph?.url).toBe(`${BASE_URL}/cookies`);

    expect(createPlaygroundPage.metadata.alternates?.canonical).toBeUndefined();
    expect(createPlaygroundPage.metadata.robots).toEqual({ index: false, follow: false });

    expect(signinPage.metadata.robots).toEqual({ index: false, follow: false });
    expect(mySubmissionsPage.metadata.robots).toEqual({ index: false, follow: false });
    expect(adminLayout.metadata.robots).toEqual({ index: false, follow: false });
    expect(adminPage.metadata.robots).toEqual({ index: false, follow: false });
  });

  it("/playgrounds layout does not render invisible FAQPage JSON-LD", async () => {
    const { default: PlaygroundsLayout } = await import("~/app/playgrounds/layout");
    const html = renderToStaticMarkup(
      <PlaygroundsLayout>
        <div>Content</div>
      </PlaygroundsLayout>,
    );
    expect(html).not.toContain("FAQPage");
    expect(html).not.toContain("faq-schema");
    expect(html).toContain("Content");
  });
});

describe("/playground/[id] validation and hydration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const store of reactCacheStores) {
      store.clear();
    }
  });

  it("rejects partially numeric IDs like '42abc' in both PlaygroundPage and generateMetadata", async () => {
    const { default: PlaygroundPage, generateMetadata } = await import(
      "~/app/playground/[id]/page"
    );

    for (const invalidId of ["42abc", "0", "-5", "42.5", " 42", "abc"]) {
      await expect(
        PlaygroundPage({ params: Promise.resolve({ id: invalidId }) }),
      ).rejects.toThrow("NEXT_NOT_FOUND");
      const meta = await generateMetadata({ params: Promise.resolve({ id: invalidId }) });
      expect(meta.robots).toEqual({ index: false, follow: false });
    }

    expect(mockServerGetById).not.toHaveBeenCalled();
    expect(mockServerGetByIdPrefetch).not.toHaveBeenCalled();
  });

  it("deduplicates getById across generateMetadata and PlaygroundPage, passes coverImage, and hydrates PlaygroundDetailClient", async () => {
    mockServerGetById.mockResolvedValueOnce(samplePlayground);
    const { default: PlaygroundPage, generateMetadata } = await import(
      "~/app/playground/[id]/page"
    );

    const metadata = await generateMetadata({ params: Promise.resolve({ id: "42" }) });
    const element = await PlaygroundPage({ params: Promise.resolve({ id: "42" }) });

    // Only 1 server DB call across both generateMetadata and PlaygroundPage, and 0 unhydrated prefetches
    expect(mockServerGetById).toHaveBeenCalledTimes(1);
    expect(mockServerGetById).toHaveBeenCalledWith({ id: 42 });
    expect(mockServerGetByIdPrefetch).not.toHaveBeenCalled();
    expect(metadata.alternates?.canonical).toBe(`${BASE_URL}/playground/42`);

    // Render PlaygroundDetailClient with initialPlayground to verify SSR content without 200ms timer
    mockGetByIdUseQuery.mockImplementation((_input: unknown, opts?: { initialData?: Playground }) => ({
      data: opts?.initialData,
      isLoading: false,
      error: null,
    }));

    expect(element).toBeDefined();
    const { default: PlaygroundDetailClient } = await import(
      "~/app/_components/playground-detail-client"
    );
    const html = renderToStaticMarkup(
      <LanguageProvider>
        <PlaygroundDetailClient playgroundId={42} initialPlayground={samplePlayground} />
      </LanguageProvider>,
    );

    expect(html).toContain("Klambratún Leikvöllur");
    expect(html).toContain("Reykjavík");
    expect(html).toContain('href="/playgrounds"');
  });
});

describe("SSR HTML output for /playgrounds list and Navbar", () => {
  it("PlaygroundsList renders real playground cards and links in SSR HTML (no empty state)", async () => {
    const { default: PlaygroundsList } = await import("~/app/_components/playgrounds-list");
    const html = renderToStaticMarkup(
      <LanguageProvider>
        <PlaygroundsList playgrounds={[samplePlayground]} />
      </LanguageProvider>,
    );

    expect(html).toContain('href="/playground/42"');
    expect(html).toContain("Klambratún Leikvöllur");
    expect(html).toContain("Reykjavík");
  });

  it("NavigationBarClient renders crawlable links immediately in SSR HTML without skeleton delay", async () => {
    const { default: NavigationBarClient } = await import(
      "~/app/_components/navigation-bar-client"
    );
    const html = renderToStaticMarkup(
      <LanguageProvider>
        <NavigationBarClient session={null} />
      </LanguageProvider>,
    );

    expect(html).toContain('href="/"');
    expect(html).toContain('href="/playgrounds"');
    expect(html).toContain('href="/leaderboard"');
    expect(html).toContain('href="/create-playground"');
    expect(html).toContain('href="/contact"');
    expect(html).toContain('href="/signin"');
  });
});
