"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useT } from "~/lib/i18n";
import { api } from "~/trpc/react";
import { LeaderboardDisplayNameSchema } from "~/types";

/**
 * The entire settings surface for leaderboard participation. Two fields did
 * not justify a settings page, and putting the opt-in on the board itself
 * means people find it at the moment they care about it.
 */
export function LeaderboardOptInCard() {
  const t = useT();
  const utils = api.useUtils();

  const { data: profile, isLoading } = api.checkIn.getMyLeaderboardProfile.useQuery();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const update = api.checkIn.updateLeaderboardProfile.useMutation({
    onSuccess: (result) => {
      switch (result.status) {
        case "ok":
          setError(null);
          void utils.checkIn.getMyLeaderboardProfile.invalidate();
          void utils.checkIn.getLeaderboard.invalidate();
          break;
        case "name_taken":
          setError(t("leaderboard.nameTaken"));
          break;
        case "name_required":
          setError(t("leaderboard.nameRequired"));
          break;
      }
    },
    onError: () => toast.error(t("errors.somethingWentWrong")),
  });

  if (isLoading || !profile) return null;

  // Already listed — collapse to a single line rather than a form.
  if (profile.optIn) {
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {t("leaderboard.listedAs", { name: profile.displayName ?? "" })}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={update.isPending}
          onClick={() => update.mutate({ optIn: false })}
        >
          {t("leaderboard.leave")}
        </Button>
      </div>
    );
  }

  const handleJoin = () => {
    const parsed = LeaderboardDisplayNameSchema.safeParse(name);
    if (!parsed.success) {
      // Validated here as well as on the server so a typo does not cost a
      // round trip; the server remains the authority.
      setError(t("leaderboard.nameInvalid"));
      return;
    }
    setError(null);
    update.mutate({ optIn: true, displayName: parsed.data });
  };

  return (
    <Card className="mb-6 border-border/60">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base">{t("leaderboard.optInTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        <p className="text-sm text-muted-foreground">
          {t("leaderboard.optInDescription")}
        </p>

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[12rem] flex-1">
            <Label htmlFor="leaderboard-name" className="text-xs">
              {t("leaderboard.displayName")}
            </Label>
            <Input
              id="leaderboard-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("leaderboard.displayNamePlaceholder")}
              maxLength={32}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "leaderboard-name-error" : undefined}
            />
          </div>
          <Button onClick={handleJoin} disabled={update.isPending}>
            {t("leaderboard.join")}
          </Button>
        </div>

        {error && (
          <p id="leaderboard-name-error" role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
