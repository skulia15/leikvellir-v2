import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import { api } from "~/trpc/server";
import { getTranslation, getServerLocale } from "~/lib/i18n/server";
import MySubmissionsClient from "./_components/my-submissions-client";

export default async function MySubmissionsPage() {
    const locale = await getServerLocale();
    const session = await getServerAuthSession();

    if (!session) {
        redirect("/signin");
    }

    // Fetch user's own submissions and edit suggestions
    const [submissions, editSuggestions] = await Promise.all([
        api.playground.getMySubmissions(),
        api.playground.getMyEditSuggestions(),
    ]);

    return (
        <div className="bg-background min-h-screen">
            <div className="max-w-screen-2xl mx-auto px-2 sm:px-6 lg:px-8 py-6 pt-24">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold sm:text-3xl">
                        {getTranslation(locale, 'mySubmissions.title')}
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        {getTranslation(locale, 'mySubmissions.description')}
                    </p>
                </div>

                <MySubmissionsClient
                    initialSubmissions={submissions}
                    initialEditSuggestions={editSuggestions}
                />
            </div>
        </div>
    );
}
