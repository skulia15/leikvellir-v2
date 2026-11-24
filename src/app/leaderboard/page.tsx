import { api } from "~/trpc/server";
import { getServerLocale, getTranslation } from "~/lib/i18n/server";
import LeaderboardClient from "./_components/leaderboard-client";

/**
 * Unlike /my-submissions this page does NOT redirect signed-out visitors:
 * a leaderboard nobody can look at is not much of a leaderboard.
 */
export default async function LeaderboardPage() {
  const locale = await getServerLocale();
  // Fetched server-side and handed down as initial data, matching the pattern
  // in /my-submissions, so the board is painted rather than skeletoned.
  const [explorers, active] = await Promise.all([
    api.checkIn.getLeaderboard({ board: "explorers", limit: 50 }),
    api.checkIn.getLeaderboard({ board: "active", limit: 50 }),
  ]);

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-screen-2xl mx-auto px-2 sm:px-6 lg:px-8 py-6 pt-24">
        <div className="mb-6">
          <h1 className="text-2xl font-bold sm:text-3xl">
            {getTranslation(locale, "leaderboard.title")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {getTranslation(locale, "leaderboard.description")}
          </p>
        </div>

        <LeaderboardClient initialExplorers={explorers} initialActive={active} />
      </div>
    </div>
  );
}
