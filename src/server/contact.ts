// server/contact.ts
import { z } from "zod";
import { logger } from "~/lib/logging/logger";

export const ContactCategorySchema = z.enum([
  "bug",
  "feature",
  "question",
  "other",
]);

export type ContactCategory = z.infer<typeof ContactCategorySchema>;

export const ContactSubmissionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  category: ContactCategorySchema,
  subject: z.string().trim().min(5).max(200),
  message: z.string().trim().min(10).max(5000),
  url: z.string().trim().max(500).optional().or(z.literal("")),
  browser: z.string().trim().max(200).optional().or(z.literal("")),
});

export type ContactSubmission = z.infer<typeof ContactSubmissionSchema>;

export const CONTACT_CATEGORY_META: Record<
  ContactCategory,
  { label: string; color: number }
> = {
  bug: { label: "Bug Report", color: 0xd9534f },
  feature: { label: "Feature Request", color: 0x8a6edb },
  question: { label: "Question", color: 0x4a9bd1 },
  other: { label: "Other", color: 0x6c757d },
};

// Sliding-window in-memory rate limiter per client IP
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const RATE_LIMIT_MAX_REQUESTS = 5;
const MAX_TRACKED_KEYS = 1000;

const requestTimestampsByKey = new Map<string, number[]>();

export function checkContactRateLimit(
  key: string,
  now = Date.now(),
): { allowed: boolean; retryAfterSeconds?: number } {
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const existing = requestTimestampsByKey.get(key) ?? [];
  const recent = existing.filter((ts) => ts > windowStart);

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestTimestampsByKey.set(key, recent);
    const oldestInWindow = recent[0] ?? now;
    const retryAfterMs = Math.max(1000, oldestInWindow + RATE_LIMIT_WINDOW_MS - now);
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  recent.push(now);
  requestTimestampsByKey.set(key, recent);

  // Evict stale or oldest entries if map grows too large
  if (requestTimestampsByKey.size > MAX_TRACKED_KEYS) {
    for (const [k, timestamps] of requestTimestampsByKey.entries()) {
      const valid = timestamps.filter((ts) => ts > windowStart);
      if (valid.length === 0) {
        requestTimestampsByKey.delete(k);
      }
      if (requestTimestampsByKey.size <= MAX_TRACKED_KEYS) break;
    }
    if (requestTimestampsByKey.size > MAX_TRACKED_KEYS) {
      const firstKey = requestTimestampsByKey.keys().next().value;
      if (firstKey !== undefined) {
        requestTimestampsByKey.delete(firstKey);
      }
    }
  }

  return { allowed: true };
}

export function resetContactRateLimit(): void {
  requestTimestampsByKey.clear();
}

const WEBHOOK_TIMEOUT_MS = 5_000;
const MAX_DISCORD_TITLE = 256;
const MAX_DISCORD_DESCRIPTION = 4096;
const MAX_DISCORD_FIELD = 1024;

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

export type ContactDeliveryResult =
  | { ok: true; deliveredVia: "discord" | "log" }
  | { ok: false; error: string };

export async function deliverContactMessage(
  submission: ContactSubmission,
): Promise<ContactDeliveryResult> {
  const meta = CONTACT_CATEGORY_META[submission.category];
  const webhookUrl = process.env.DISCORD_ADMIN_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    logger.info("Contact form submission received (no Discord webhook configured; logged fallback)", {
      component: "ContactAPI",
      action: "contact_submission_fallback",
      metadata: {
        category: submission.category,
        categoryLabel: meta.label,
        name: submission.name,
        email: submission.email,
        subject: submission.subject,
        message: submission.message,
        url: submission.url || undefined,
        browser: submission.browser || undefined,
      },
    });
    return { ok: true, deliveredVia: "log" };
  }

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    { name: "Category", value: truncate(meta.label, MAX_DISCORD_FIELD), inline: true },
    { name: "Name", value: truncate(submission.name, MAX_DISCORD_FIELD), inline: true },
    { name: "Email", value: truncate(submission.email, MAX_DISCORD_FIELD), inline: true },
  ];

  if (submission.url) {
    fields.push({
      name: "Page URL",
      value: truncate(submission.url, MAX_DISCORD_FIELD),
      inline: false,
    });
  }

  if (submission.browser) {
    fields.push({
      name: "Browser / Device",
      value: truncate(submission.browser, MAX_DISCORD_FIELD),
      inline: false,
    });
  }

  const embed = {
    title: truncate(`[${meta.label}] ${submission.subject}`, MAX_DISCORD_TITLE),
    description: truncate(submission.message, MAX_DISCORD_DESCRIPTION),
    color: meta.color,
    fields,
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      logger.error(
        "Discord contact webhook rejected submission",
        {
          component: "ContactAPI",
          action: "contact_webhook_failed",
          metadata: {
            status: response.status,
            body: responseText,
            category: submission.category,
            subject: submission.subject,
            email: submission.email,
          },
        },
      );
      return { ok: false, error: "Failed to deliver contact message" };
    }

    logger.info("Contact form submission delivered to Discord", {
      component: "ContactAPI",
      action: "contact_submission_delivered",
      metadata: {
        category: submission.category,
        subject: submission.subject,
      },
    });

    return { ok: true, deliveredVia: "discord" };
  } catch (error) {
    logger.error(
      "Discord contact webhook request failed",
      {
        component: "ContactAPI",
        action: "contact_webhook_error",
        metadata: {
          category: submission.category,
          subject: submission.subject,
          email: submission.email,
        },
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    return { ok: false, error: "Failed to deliver contact message" };
  }
}
