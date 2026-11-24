// app/api/contact/route.ts
import { type NextRequest, NextResponse } from "next/server";
import {
  ContactSubmissionSchema,
  checkContactRateLimit,
  deliverContactMessage,
} from "~/server/contact";

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rateLimit = checkContactRateLimit(clientIp);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        code: "RATE_LIMITED",
        error: "Too many requests. Please try again later.",
      },
      {
        status: 429,
        headers: rateLimit.retryAfterSeconds
          ? { "Retry-After": String(rateLimit.retryAfterSeconds) }
          : undefined,
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        code: "INVALID_JSON",
        error: "Invalid JSON payload",
      },
      { status: 400 },
    );
  }

  const parsed = ContactSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const result = await deliverContactMessage(parsed.data);
  if (!result.ok) {
    return NextResponse.json(
      {
        success: false,
        code: "DELIVERY_FAILED",
        error: result.error,
      },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      success: true,
      deliveredVia: result.deliveredVia,
    },
    { status: 200 },
  );
}
