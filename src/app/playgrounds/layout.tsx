import { Suspense } from "react";
import { getTranslation } from "~/lib/i18n/server";
import { defaultLocale } from "~/lib/i18n/config";
import type { Metadata } from "next";
import { api } from "~/trpc/server";
import { PlaygroundListSchema, FAQSchema } from "~/lib/seo/structured-data";

export const metadata: Metadata = {
    title: getTranslation(defaultLocale, 'playground.pageTitle'),
    description: getTranslation(defaultLocale, 'playground.pageDescription'),
};

/**
 * JSON-LD listing every approved playground.
 *
 * Split into its own async component so the layout can stream past it: an
 * `await` in the layout body blocks the shell for every route underneath,
 * which is a steep price for markup only crawlers read.
 */
async function PlaygroundListStructuredData() {
    try {
        const summaries = await api.playground.getSummaries();
        if (summaries.length === 0) return null;

        return (
            <PlaygroundListSchema
                playgrounds={summaries.map((playground) => ({
                    id: playground.id,
                    name: playground.title,
                    municipality: playground.municipality,
                }))}
            />
        );
    } catch {
        // Schema is non-critical — render page without it on failure
        return null;
    }
}

export default function PlaygroundsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const faqQuestions = [
        {
            question: getTranslation(defaultLocale, 'playground.faq.findNearby'),
            answer: getTranslation(defaultLocale, 'playground.faq.findNearbyAnswer'),
        },
        {
            question: getTranslation(defaultLocale, 'playground.faq.whatIsRolo'),
            answer: getTranslation(defaultLocale, 'playground.faq.whatIsRoloAnswer'),
        },
        {
            question: getTranslation(defaultLocale, 'playground.faq.addPlayground'),
            answer: getTranslation(defaultLocale, 'playground.faq.addPlaygroundAnswer'),
        },
    ];

    return (
        <>
            <Suspense fallback={null}>
                <PlaygroundListStructuredData />
            </Suspense>
            <FAQSchema questions={faqQuestions} />
            {children}
        </>
    );
}
