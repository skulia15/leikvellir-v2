import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import { api } from "~/trpc/server";
import ReviewPlaygroundsClient from "./_components/review-playgrounds-client";

export default async function ReviewPage() {
    const session = await getServerAuthSession();

    if (!session) {
        redirect("/api/auth/signin");
    }

    // Get pending submissions
    const pendingSubmissions = await api.playground.getPendingSubmissions();

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Review Playground Submissions</h1>
                <p className="text-muted-foreground mt-2">
                    Review and approve or reject playground submissions from users.
                </p>
            </div>

            <ReviewPlaygroundsClient initialData={pendingSubmissions} />
        </div>
    );
} 