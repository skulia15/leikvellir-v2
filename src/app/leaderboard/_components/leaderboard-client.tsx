"use client";

import { useSession } from "next-auth/react";

import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useT } from "~/lib/i18n";
import { api } from "~/trpc/react";
import {
  type LeaderboardBoard,
  type LeaderboardResponse,
  type LeaderboardRow,
} from "~/types";
import { LeaderboardOptInCard } from "./leaderboard-opt-in-card";

function BoardTable({
  board,
  initialData,
}: {
  board: LeaderboardBoard;
  initialData: LeaderboardResponse;
}) {
  const t = useT();
  const { data: session } = useSession();
  const { data } = api.checkIn.getLeaderboard.useQuery(
    { board, limit: 50 },
    { initialData },
  );

  const scoreKey =
    board === "explorers" ? "leaderboard.playgroundsVisited" : "leaderboard.checkInsCount";

  if (!data || data.rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {session ? t("leaderboard.emptyState") : t("leaderboard.emptyStateSignedOut")}
      </p>
    );
  }

  const renderRow = (row: LeaderboardRow, key: string) => (
    <TableRow key={key} className={row.isMe ? "bg-primary/5" : undefined}>
      <TableCell className="w-12 font-medium tabular-nums">{row.rank}</TableCell>
      <TableCell className="font-medium">
        <span className="flex items-center gap-2">
          {row.displayName}
          {row.isMe && (
            <Badge variant="secondary" className="text-[10px]">
              {t("leaderboard.you")}
            </Badge>
          )}
        </span>
      </TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {t(scoreKey, { count: row.score })}
      </TableCell>
    </TableRow>
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">{t("leaderboard.rank")}</TableHead>
          <TableHead>{t("leaderboard.player")}</TableHead>
          <TableHead className="text-right">
            {board === "explorers"
              ? t("leaderboard.tabExplorers")
              : t("leaderboard.tabActive")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.rows.map((row) => renderRow(row, `rank-${row.rank}-${row.displayName}`))}

        {/* Shown only when the viewer ranked outside the visible slice — seeing
            your own standing is the reason to come back. */}
        {data.me && (
          <>
            <TableRow>
              <TableCell colSpan={3} className="py-1 text-center text-xs text-muted-foreground">
                ⋯
              </TableCell>
            </TableRow>
            {renderRow(data.me, "me")}
          </>
        )}
      </TableBody>
    </Table>
  );
}

interface LeaderboardClientProps {
  initialExplorers: LeaderboardResponse;
  initialActive: LeaderboardResponse;
}

export default function LeaderboardClient({
  initialExplorers,
  initialActive,
}: LeaderboardClientProps) {
  const t = useT();
  const { data: session } = useSession();

  return (
    <div>
      {session && <LeaderboardOptInCard />}

      <Tabs defaultValue="explorers">
        <TabsList>
          <TabsTrigger value="explorers">{t("leaderboard.tabExplorers")}</TabsTrigger>
          <TabsTrigger value="active">{t("leaderboard.tabActive")}</TabsTrigger>
        </TabsList>

        <TabsContent value="explorers" className="mt-4">
          <p className="mb-3 text-sm text-muted-foreground">
            {t("leaderboard.explorersDescription")}
          </p>
          <BoardTable board="explorers" initialData={initialExplorers} />
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          <p className="mb-3 text-sm text-muted-foreground">
            {t("leaderboard.activeDescription")}
          </p>
          <BoardTable board="active" initialData={initialActive} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
