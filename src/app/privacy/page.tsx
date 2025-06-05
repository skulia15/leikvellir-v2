// app/privacy/page.tsx
import { type Metadata } from "next";
import { getTranslation } from "~/lib/i18n/server";
import { defaultLocale } from "~/lib/i18n/config";
import { PrivacyPageClient } from "./_components/privacy-page-client";

export const metadata: Metadata = {
  title: getTranslation(defaultLocale, 'privacy.privacyPolicy') + " - Leiksvæði",
  description: getTranslation(defaultLocale, 'privacy.overviewText'),
};

export default function PrivacyPolicyPage() {
  return <PrivacyPageClient />;
}
