// app/privacy/page.tsx
import { type Metadata } from "next";
import { getTranslation } from "~/lib/i18n/server";
import { defaultLocale } from "~/lib/i18n/config";
import { generateMetadata as generateSEOMetadata } from "~/lib/seo/metadata";
import { PrivacyPageClient } from "./_components/privacy-page-client";

export const metadata: Metadata = generateSEOMetadata({
  title: `${getTranslation(defaultLocale, 'privacy.privacyPolicy')} - Leiksvæði`,
  exactTitle: true,
  description: getTranslation(defaultLocale, 'privacy.overviewText'),
  path: '/privacy',
});

export default function PrivacyPolicyPage() {
  return <PrivacyPageClient />;
}
