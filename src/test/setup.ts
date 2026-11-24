// test/setup.ts
import { beforeAll, afterAll, afterEach, vi } from "vitest";

// Guard browser-only imports for @vitest-environment node tests
const hasWindow = typeof window !== "undefined";

let server: { listen: (opts?: any) => void; close: () => void; resetHandlers: () => void } | null = null;
let cleanup: (() => void) | null = null;

if (hasWindow) {
  // Dynamic imports aren't supported in setup, so we import conditionally
  // These are safe because jsdom provides the required globals
  await import("@testing-library/jest-dom");
  const rtl = await import("@testing-library/react");
  cleanup = rtl.cleanup;
  const mocks = await import("./mocks/server");
  server = mocks.server;
  // Preload English translations for component tests that mount LanguageProvider with initialLocale="en"
  const { loadTranslations } = await import("~/lib/i18n/translations");
  await loadTranslations("en");
}

// Set up environment variables for tests
process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "test-google-maps-api-key";
process.env.NEXTAUTH_SECRET = "test-secret";
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.DISCORD_CLIENT_ID = "test-discord-client-id";
process.env.DISCORD_CLIENT_SECRET = "test-discord-client-secret";
process.env.SKIP_ENV_VALIDATION = "true";

// Start server before all tests
beforeAll(() => server?.listen({ onUnhandledRequest: "error" }));

// Close server after all tests
afterAll(() => server?.close());

// Reset handlers after each test
afterEach(() => {
  server?.resetHandlers();
  cleanup?.();
});

// Preserve native WHATWG URL parsing while mocking blob object URL helpers for jsdom
if (hasWindow) {
  const NativeURL = globalThis.URL;
  class TestURL extends NativeURL {
    static override createObjectURL = vi.fn(
      () => "blob:http://localhost:3000/mock-blob-url",
    );
    static override revokeObjectURL = vi.fn();
  }

  Object.defineProperty(window, "URL", {
    value: TestURL,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(global, "URL", {
    value: TestURL,
    writable: true,
    configurable: true,
  });
}

// Mock FileReader for file validation tests
interface MockFileReaderEvent {
  target: { result: ArrayBuffer | null };
}

if (hasWindow) Object.defineProperty(window, "FileReader", {
  value: class MockFileReader {
    onload: ((event: MockFileReaderEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    result: ArrayBuffer | null = null;

    readAsArrayBuffer(file: Blob) {
      // Create mock ArrayBuffer based on file type immediately
      const buffer = this.createMockBuffer(file);
      this.result = buffer;

      // Call onload synchronously for more predictable tests
      if (this.onload) {
        this.onload({ target: { result: buffer } });
      }
    }

    private createMockBuffer(file: Blob): ArrayBuffer {
      // Create realistic file signatures for testing
      const signatures: Record<string, number[]> = {
        "image/jpeg": [0xff, 0xd8, 0xff, 0xe0], // JPEG signature
        "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], // PNG signature
        "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF header for WebP
        "text/plain": [0x48, 0x65, 0x6c, 0x6c], // "Hell" in ASCII (not an image)
      };

      const signature = signatures[file.type] ?? [0x00, 0x00, 0x00, 0x00];
      const buffer = new ArrayBuffer(12);
      const view = new Uint8Array(buffer);

      signature.forEach((byte, index) => {
        if (index < view.length) {
          view[index] = byte;
        }
      });

      return buffer;
    }
  },
  writable: true, // Make it writable so tests can override if needed
  configurable: true,
});

// Mock crypto.randomUUID for consistent test IDs
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: vi.fn(() => "test-uuid-123"),
  },
});

// Mock DataTransfer for drag and drop tests
class MockDataTransfer {
  items: DataTransferItem[] = [];
  files: FileList = [] as unknown as FileList;
  types: string[] = [];
  effectAllowed = "copy";
  dropEffect = "copy";

  constructor() {
    // Make files behave like a FileList
    Object.defineProperty(this, "files", {
      value: Object.assign([], {
        item: (index: number) => this.files[index] ?? null,
        length: 0,
      }),
      writable: true,
    });
  }

  setData(_format: string, _data: string) {
    // Mock implementation
  }

  getData(_format: string) {
    return "";
  }
}

if (hasWindow) Object.defineProperty(window, "DataTransfer", {
  value: MockDataTransfer,
});

// Mock DragEvent
class MockDragEvent extends Event {
  dataTransfer: MockDataTransfer;

  constructor(type: string, eventInitDict?: EventInit) {
    super(type, eventInitDict);
    this.dataTransfer = new MockDataTransfer();
  }
}

if (hasWindow) Object.defineProperty(window, "DragEvent", {
  value: MockDragEvent,
});

// Mock ResizeObserver for Radix UI components
class MockResizeObserver {
  observe() {
    // Mock implementation
  }
  unobserve() {
    // Mock implementation
  }
  disconnect() {
    // Mock implementation
  }
}

if (hasWindow) Object.defineProperty(window, "ResizeObserver", {
  value: MockResizeObserver,
});

// Mock window.alert for jsdom
if (hasWindow) Object.defineProperty(window, "alert", {
  value: vi.fn(),
});

// Mock console methods to avoid noise in tests
Object.defineProperty(console, "warn", {
  value: vi.fn(),
});

Object.defineProperty(console, "error", {
  value: vi.fn(),
});
