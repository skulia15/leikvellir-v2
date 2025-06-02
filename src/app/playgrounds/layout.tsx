import { getTranslation } from "~/lib/i18n/server";
import { defaultLocale } from "~/lib/i18n/config";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: getTranslation(defaultLocale, 'playground.pageTitle'),
    description: getTranslation(defaultLocale, 'playground.pageDescription'),
};

export default function PlaygroundsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
} 