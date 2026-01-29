import { getTranslation } from "~/lib/i18n/server";
import { defaultLocale } from "~/lib/i18n/config";
import type { Metadata } from "next";
import { api } from "~/trpc/server";
import { PlaygroundListSchema, FAQSchema } from "~/lib/seo/structured-data";

export const metadata: Metadata = {
    title: getTranslation(defaultLocale, 'playground.pageTitle'),
    description: getTranslation(defaultLocale, 'playground.pageDescription'),
};

export default async function PlaygroundsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    let playgrounds: Array<{ id: number; name: string; municipality?: string | null }> = [];
    try {
        const allPlaygrounds = await api.playground.getAll();
        playgrounds = allPlaygrounds.map(p => ({
            id: p.id,
            name: p.title,
            municipality: p.municipality,
        }));
    } catch {
        // Schema is non-critical — render page without it on failure
    }

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
            {playgrounds.length > 0 && (
                <PlaygroundListSchema playgrounds={playgrounds} />
            )}
            <FAQSchema questions={faqQuestions} />
            {children}
        </>
    );
}