// __tests__/api/contact.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("~/lib/logging/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { POST } from "~/app/api/contact/route";
import { resetContactRateLimit, RATE_LIMIT_MAX_REQUESTS } from "~/server/contact";
import { logger } from "~/lib/logging/logger";

const mockLogger = vi.mocked(logger);

const validPayload = {
  name: "Jane Doe",
  email: "jane@example.com",
  category: "feature" as const,
  subject: "Add filter for fenced playgrounds",
  message: "It would be really helpful to filter playgrounds by fencing directly on the map.",
  url: "https://leikvellir.is/map",
  browser: "Chrome 130 / macOS",
};

function createJsonRequest(
  body: unknown,
  headers: Record<string, string> = { "x-forwarded-for": "203.0.113.10" },
): NextRequest {
  return new NextRequest("http://localhost:3000/api/contact", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("Contact API Route", () => {
  const originalWebhook = process.env.DISCORD_ADMIN_WEBHOOK_URL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    resetContactRateLimit();
    delete process.env.DISCORD_ADMIN_WEBHOOK_URL;
  });

  afterEach(() => {
    if (originalWebhook === undefined) {
      delete process.env.DISCORD_ADMIN_WEBHOOK_URL;
    } else {
      process.env.DISCORD_ADMIN_WEBHOOK_URL = originalWebhook;
    }
    global.fetch = originalFetch;
  });

  it("returns 400 for malformed JSON", async () => {
    const request = new NextRequest("http://localhost:3000/api/contact", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.1",
      },
      body: "{not-valid-json",
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.code).toBe("INVALID_JSON");
  });

  it("returns 400 with fieldErrors when validation fails", async () => {
    const request = createJsonRequest({
      name: "A",
      email: "not-an-email",
      category: "invalid",
      subject: "Hi",
      message: "Short",
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.fieldErrors).toEqual(
      expect.objectContaining({
        name: expect.any(Array),
        email: expect.any(Array),
        category: expect.any(Array),
        subject: expect.any(Array),
        message: expect.any(Array),
      }),
    );
  });

  it("falls back to structured logging and returns 200 when webhook is unset", async () => {
    const response = await POST(createJsonRequest(validPayload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      deliveredVia: "log",
    });
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining("Contact form submission received"),
      expect.objectContaining({
        component: "ContactAPI",
        action: "contact_submission_fallback",
        metadata: expect.objectContaining({
          category: "feature",
          categoryLabel: "Feature Request",
          email: "jane@example.com",
          subject: validPayload.subject,
        }),
      }),
    );
  });

  it("delivers formatted Discord embed with matching category label when webhook is configured", async () => {
    process.env.DISCORD_ADMIN_WEBHOOK_URL = "https://discord.com/api/webhooks/test/token";
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    global.fetch = mockFetch as unknown as typeof fetch;

    const response = await POST(createJsonRequest(validPayload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      deliveredVia: "discord",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe("https://discord.com/api/webhooks/test/token");
    expect(calledInit.method).toBe("POST");

    const parsedBody = JSON.parse(calledInit.body as string) as {
      embeds: Array<{
        title: string;
        description: string;
        fields: Array<{ name: string; value: string }>;
      }>;
    };
    const embed = parsedBody.embeds[0];
    expect(embed?.title).toBe("[Feature Request] Add filter for fenced playgrounds");
    expect(embed?.description).toBe(validPayload.message);
    expect(embed?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Category", value: "Feature Request" }),
        expect.objectContaining({ name: "Name", value: "Jane Doe" }),
        expect.objectContaining({ name: "Email", value: "jane@example.com" }),
        expect.objectContaining({ name: "Page URL", value: validPayload.url }),
        expect.objectContaining({ name: "Browser / Device", value: validPayload.browser }),
      ]),
    );
  });

  it("returns 502 when Discord webhook responds with non-OK status", async () => {
    process.env.DISCORD_ADMIN_WEBHOOK_URL = "https://discord.com/api/webhooks/test/token";
    global.fetch = vi.fn().mockResolvedValue(
      new Response("Unauthorized", { status: 401 }),
    ) as unknown as typeof fetch;

    const response = await POST(createJsonRequest(validPayload));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.success).toBe(false);
    expect(body.code).toBe("DELIVERY_FAILED");
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it("returns 502 when Discord webhook fetch throws", async () => {
    process.env.DISCORD_ADMIN_WEBHOOK_URL = "https://discord.com/api/webhooks/test/token";
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error")) as unknown as typeof fetch;

    const response = await POST(createJsonRequest(validPayload));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.success).toBe(false);
    expect(body.code).toBe("DELIVERY_FAILED");
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it("rate limits excessive requests per IP and still allows other IPs", async () => {
    const ipA = { "x-forwarded-for": "198.51.100.1" };
    const ipB = { "x-forwarded-for": "198.51.100.2" };

    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      const res = await POST(createJsonRequest(validPayload, ipA));
      expect(res.status).toBe(200);
    }

    const throttled = await POST(createJsonRequest(validPayload, ipA));
    const throttledBody = await throttled.json();
    expect(throttled.status).toBe(429);
    expect(throttledBody.code).toBe("RATE_LIMITED");
    expect(Number(throttled.headers.get("Retry-After"))).toBeGreaterThan(0);

    const otherIpRes = await POST(createJsonRequest(validPayload, ipB));
    expect(otherIpRes.status).toBe(200);
  });
});
