import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import { api } from "~/trpc/server";
import { getTranslation, getServerLocale } from "~/lib/i18n/server";
import ReviewPlaygroundsClient from "./_components/review-playgrounds-client";

export default async function ReviewPage() {
    const locale = await getServerLocale();
    const session = await getServerAuthSession();

    if (!session) {
        redirect("/signin");
    }

    // Only admins and super admins can access review page
    // Role/ban state come from the (request-cached) database session — no extra query
    const { role, isBanned } = session.user;
    if (isBanned || (role !== "admin" && role !== "super_admin")) {
        redirect("/");
    }

    // Get pending submissions and edit suggestions
    const [pendingSubmissions, pendingEditSuggestions] = await Promise.all([
        api.playground.getPendingSubmissions(),
        api.playground.getPendingEditSuggestions(),
    ]);

    return (
        <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold sm:text-3xl">{getTranslation(locale, 'admin.reviewPlaygroundSubmissions')}</h1>
                <p className="text-muted-foreground mt-2">
                    {getTranslation(locale, 'admin.reviewSubmissionsDescription')}
                </p>
            </div>

            <ReviewPlaygroundsClient 
                initialSubmissions={pendingSubmissions} 
                initialEditSuggestions={pendingEditSuggestions}
            />
        </div>
    );
} 