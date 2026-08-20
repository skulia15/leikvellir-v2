"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Check, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { useT } from "~/lib/i18n";
import { api } from "~/trpc/react";
import { formatDistance, getFreshPosition, GeoError } from "~/lib/geo-utils";

interface CheckInButtonProps {
  playgroundId: number;
  /** Only approved playgrounds accept check-ins. */
  playgroundStatus: string;
  className?: string;
  /** Defaults to lg (h-11 = 44px). Check-in is used one-handed, outdoors,
   *  sometimes gloved — it should never be below the 44px touch target. */
  size?: "default" | "lg";
  variant?: "default" | "outline";
}

/**
 * Two things worth knowing before editing this:
 *
 * 1. The position is requested inside the click handler, never on mount. A
 *    high-accuracy fix on page load would wake the GPS on every playground
 *    page and prompt people who never intended to check in.
 * 2. Whether the user is already checked in comes from the server, not from
 *    local state, so a reload still shows the truth.
 */
export function CheckInButton({
  playgroundId,
  playgroundStatus,
  className,
  size = "lg",
  variant = "default",
}: CheckInButtonProps) {
  const t = useT();
  const { data: session } = useSession();
  const router = useRouter();
  const utils = api.useUtils();

  const [isLocating, setIsLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data: stats } = api.checkIn.getPlaygroundStats.useQuery(
    { playgroundId },
    { enabled: playgroundStatus === "approved" },
  );

  // Only used to decide whether the success toast should mention the
  // leaderboard, so it is cheap to keep stale for a long while.
  const { data: leaderboardProfile } = api.checkIn.getMyLeaderboardProfile.useQuery(
    undefined,
    { enabled: !!session, staleTime: 10 * 60 * 1000 },
  );

  const createCheckIn = api.checkIn.create.useMutation({
    onSuccess: (result) => {
      switch (result.status) {
        case "success":
          setMessage(null);
          toast.success(t("checkIn.successToast"), {
            // The opt-in lives on the leaderboard page, so this is how people
            // discover it — but only if they are not already listed.
            action: leaderboardProfile && !leaderboardProfile.optIn
              ? {
                  label: t("leaderboard.join"),
                  onClick: () => router.push("/leaderboard"),
                }
              : undefined,
          });
          break;
        case "already_checked_in_today":
          setMessage(null);
          break;
        case "too_far":
          setMessage(
            t("checkIn.tooFar", {
              distance: formatDistance(result.distanceMeters / 1000),
            }),
          );
          break;
        case "accuracy_too_poor":
          setMessage(t("checkIn.accuracyTooPoor"));
          break;
        case "daily_limit_reached":
          setMessage(t("checkIn.dailyLimitReached"));
          break;
        case "not_available":
          setMessage(t("checkIn.notAvailable"));
          break;
      }

      void utils.checkIn.getPlaygroundStats.invalidate({ playgroundId });
      void utils.checkIn.getMyPlaygroundIds.invalidate();
    },
    onError: () => {
      setMessage(t("errors.somethingWentWrong"));
    },
  });

  if (playgroundStatus !== "approved") return null;

  if (!session) {
    return (
      <Button asChild variant={variant} size={size} className={className}>
        <Link href={`/signin?callbackUrl=/playground/${playgroundId}`}>
          <MapPin className="mr-2 h-4 w-4" />
          {t("checkIn.signInToCheckIn")}
        </Link>
      </Button>
    );
  }

  const alreadyCheckedIn = stats?.viewerCheckedInToday ?? false;
  const isBusy = isLocating || createCheckIn.isPending;

  const handleClick = async () => {
    setMessage(null);
    setIsLocating(true);

    try {
      const position = await getFreshPosition();
      createCheckIn.mutate({
        playgroundId,
        latitude: position.lat,
        longitude: position.lng,
        accuracy: position.accuracy,
      });
    } catch (error) {
      if (error instanceof GeoError) {
        setMessage(
          {
            denied: t("checkIn.permissionDenied"),
            timeout: t("checkIn.locationTimeout"),
            unavailable: t("checkIn.locationUnavailable"),
            unsupported: t("checkIn.locationUnsupported"),
          }[error.kind],
        );
      } else {
        setMessage(t("checkIn.locationUnavailable"));
      }
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <div className={className}>
      <Button
        onClick={handleClick}
        disabled={isBusy || alreadyCheckedIn}
        variant={alreadyCheckedIn ? "outline" : variant}
        size={size}
        aria-busy={isBusy}
        className="w-full"
      >
        {isBusy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : alreadyCheckedIn ? (
          <Check className="mr-2 h-4 w-4" />
        ) : (
          <MapPin className="mr-2 h-4 w-4" />
        )}
        {isLocating
          ? t("checkIn.locating")
          : createCheckIn.isPending
            ? t("checkIn.checkingIn")
            : alreadyCheckedIn
              ? t("checkIn.checkedInToday")
              : t("checkIn.checkIn")}
      </Button>

      {message && (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  );
}
