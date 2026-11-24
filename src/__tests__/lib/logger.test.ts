// __tests__/lib/logger.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "~/lib/logging/logger";

describe("server-side Logger", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    vi.stubEnv("NODE_ENV", originalNodeEnv ?? "test");
  });

  it("logs errors synchronously on the server in production without setTimeout", () => {
    vi.stubEnv("NODE_ENV", "production");
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    const err = new Error("Database connection failed");
    logger.error("Unhandled failure", { component: "tRPC", action: "test" }, err);

    // Must be called immediately (synchronously) before returning
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[ERROR] [tRPC] Unhandled failure"),
      expect.objectContaining({ component: "tRPC", action: "test", sessionId: "server" }),
      err,
    );
    expect(errorSpy).toHaveBeenCalledWith(
      "EXTERNAL_LOG:",
      expect.objectContaining({ level: "error", message: "Unhandled failure" }),
    );
    expect(setTimeoutSpy).not.toHaveBeenCalled();

    setTimeoutSpy.mockRestore();
  });

  it("logs warnings synchronously on the server in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    logger.warn("Missing blob token", { component: "FileCleanup" });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[WARN] [FileCleanup] Missing blob token"),
      expect.objectContaining({ component: "FileCleanup", sessionId: "server" }),
      undefined,
    );
  });
});
