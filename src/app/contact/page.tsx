import { type Metadata } from "next";
import { getTranslation } from "~/lib/i18n/server";
import { defaultLocale } from "~/lib/i18n/config";
import { generateMetadata as generateSEOMetadata } from "~/lib/seo/metadata";
import { ContactPageClient } from "./_components/contact-page-client";

export async function generateMetadata(): Promise<Metadata> {
  // Use server-side translation with default locale for metadata
  const title = getTranslation(defaultLocale, 'contact.pageTitle');
  const description = getTranslation(defaultLocale, 'contact.pageDescription');

  return generateSEOMetadata({
    title,
    exactTitle: true,
    description,
    path: '/contact',
  });
}

export default function ContactPage() {
  return <ContactPageClient />;
}
