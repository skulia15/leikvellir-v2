import { Suspense } from "react";
import { getTranslation } from "~/lib/i18n/server";
import { defaultLocale } from "~/lib/i18n/config";
import type { Metadata } from "next";
import { publicApi } from "~/trpc/server";
import { PlaygroundListSchema } from "~/lib/seo/structured-data";
import { generateMetadata as generateSEOMetadata } from "~/lib/seo/metadata";

// ISR: static, regenerated at most every 5 min (mutations also purge via revalidatePath)
export const revalidate = 300;

export const metadata: Metadata = generateSEOMetadata({
    title: getTranslation(defaultLocale, 'playground.pageTitle'),
    exactTitle: true,
    description: getTranslation(defaultLocale, 'playground.pageDescription'),
    path: '/playgrounds',
});

/**
 * JSON-LD listing every approved playground.
 *
 * Split into its own async component so the layout can stream past it: an
 * `await` in the layout body blocks the shell for every route underneath,
 * which is a steep price for markup only crawlers read.
 */
async function PlaygroundListStructuredData() {
    try {
        const summaries = await publicApi.playground.getSummaries();
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
    return (
        <>
            <Suspense fallback={null}>
                <PlaygroundListStructuredData />
            </Suspense>
            {children}
        </>
    );
}
