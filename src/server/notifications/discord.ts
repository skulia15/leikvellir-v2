// server/notifications/discord.ts
// Deliberately not marked `server-only`: that package throws under the jsdom
// test environment. Access is already server-gated because `env` refuses to
// hand out DISCORD_ADMIN_WEBHOOK_URL on the client.
import { env } from "~/env";
import { logger } from "~/lib/logging/logger";
import { getBaseUrl } from "~/lib/seo/base-url";

/**
 * Admin notifications posted to a Discord channel via an incoming webhook.
 *
 * Every export here is best-effort: a webhook that is unconfigured, slow or
 * failing must never break the user-facing mutation that triggered it, so all
 * errors are swallowed and logged rather than thrown.
 */

/** Give up on a slow webhook rather than holding the submission response open. */
const WEBHOOK_TIMEOUT_MS = 5_000;

/** Brand violet, matching the "Soft Nordic" primary. */
const SUBMISSION_COLOR = 0x8a6edb;
/** Terrain water blue, to tell edit suggestions apart at a glance. */
const EDIT_SUGGESTION_COLOR = 0x4a9bd1;

/** Discord rejects embed field values over 1024 characters. */
const MAX_FIELD_LENGTH = 1024;

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordEmbed {
  title: string;
  url?: string;
  description?: string;
  color: number;
  fields?: DiscordEmbedField[];
  timestamp?: string;
}

function absoluteUrl(path: string): string {
  // The production domain is non-ASCII (leiksvæði.is); URL punycodes the host
  // so Discord accepts it as a valid link target.
  return new URL(path, getBaseUrl()).toString();
}

function truncate(value: string): string {
  return value.length > MAX_FIELD_LENGTH
    ? `${value.slice(0, MAX_FIELD_LENGTH - 1)}…`
    : value;
}

function field(name: string, value: string, inline = true): DiscordEmbedField {
  return { name, value: truncate(value), inline };
}

/** Who to credit, honouring the submitter's anonymity choice. */
function submitterLabel(
  submitterName: string | null | undefined,
  submitAnonymously: boolean | undefined,
): string {
  if (submitAnonymously) return "Anonymous";
  return submitterName?.trim() ?? "Unknown";
}

async function postEmbed(embed: DiscordEmbed, action: string): Promise<void> {
  const webhookUrl = env.DISCORD_ADMIN_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });

    if (!response.ok) {
      logger.warn("Discord admin notification rejected", {
        component: "DiscordNotifications",
        action,
        metadata: { status: response.status, body: await response.text() },
      });
    }
  } catch (error) {
    logger.warn(
      "Discord admin notification failed",
      { component: "DiscordNotifications", action },
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

interface NewSubmissionNotification {
  playgroundId: number;
  title: string;
  municipality: string | null | undefined;
  imageCount: number;
  equipmentCount: number;
  submitterName: string | null | undefined;
  submitAnonymously: boolean;
}

export async function notifyNewSubmission({
  playgroundId,
  title,
  municipality,
  imageCount,
  equipmentCount,
  submitterName,
  submitAnonymously,
}: NewSubmissionNotification): Promise<void> {
  await postEmbed(
    {
      title: `🛝 New playground submission: ${title}`,
      url: absoluteUrl("/admin/review"),
      description: "Waiting for review in the admin dashboard.",
      color: SUBMISSION_COLOR,
      fields: [
        field("Municipality", municipality?.trim() ?? "—"),
        field("Photos", String(imageCount)),
        field("Equipment", String(equipmentCount)),
        field("Submitted by", submitterLabel(submitterName, submitAnonymously)),
        field("Playground ID", String(playgroundId)),
      ],
      timestamp: new Date().toISOString(),
    },
    "notify_new_submission",
  );
}

/**
 * Human labels for the optional keys of CreateEditSuggestionSchema, so the
 * notification says "Toddler friendly" rather than "toddlerFriendly".
 */
const EDIT_SUGGESTION_FIELD_LABELS: Record<string, string> = {
  title: "Title",
  latitude: "Location",
  longitude: "Location",
  municipality: "Municipality",
  publiclyAccessible: "Publicly accessible",
  toddlerFriendly: "Toddler friendly",
  isSchoolGround: "School ground",
  schoolType: "School type",
  hasSeating: "Seating",
  hasPicnicTable: "Picnic table",
  hasFencing: "Fencing",
  hasGarbageCan: "Garbage can",
  hasBathroomNearby: "Bathroom nearby",
  hasSoftPlayArea: "Soft play area",
  equipmentIds: "Equipment",
  coverImage: "Cover photo",
  images: "Photos",
  removeImages: "Photos",
  removeCoverImage: "Cover photo",
};

/** Map raw schema keys to labels, de-duplicating keys that share one (lat/lng). */
function labelChangedFields(keys: string[]): string[] {
  const labels = keys.map((key) => EDIT_SUGGESTION_FIELD_LABELS[key] ?? key);
  return [...new Set(labels)];
}

interface NewEditSuggestionNotification {
  suggestionId: number;
  playgroundId: number;
  playgroundTitle: string;
  /** Raw keys from CreateEditSuggestionSchema that the submitter touched. */
  changedFields: string[];
  submitterName: string | null | undefined;
  submitAnonymously: boolean;
}

export async function notifyNewEditSuggestion({
  suggestionId,
  playgroundId,
  playgroundTitle,
  changedFields,
  submitterName,
  submitAnonymously,
}: NewEditSuggestionNotification): Promise<void> {
  const labels = labelChangedFields(changedFields);

  await postEmbed(
    {
      title: `✏️ Edit suggestion: ${playgroundTitle}`,
      url: absoluteUrl("/admin/review-edit-suggestions"),
      description: "Waiting for review in the admin dashboard.",
      color: EDIT_SUGGESTION_COLOR,
      fields: [
        field(
          "Suggested changes",
          labels.length > 0 ? labels.join(", ") : "—",
          false,
        ),
        field("Submitted by", submitterLabel(submitterName, submitAnonymously)),
        field("Playground", `#${playgroundId}`),
        field("Suggestion ID", String(suggestionId)),
      ],
      timestamp: new Date().toISOString(),
    },
    "notify_new_edit_suggestion",
  );
}
