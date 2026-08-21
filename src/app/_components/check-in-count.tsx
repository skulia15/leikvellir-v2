"use client";

import { Users } from "lucide-react";

import { Skeleton } from "~/components/ui/skeleton";
import { useT } from "~/lib/i18n";
import { api } from "~/trpc/react";

interface CheckInCountProps {
  playgroundId: number;
  /** Shown to signed-in users when nobody has checked in yet. */
  showBeTheFirst?: boolean;
  className?: string;
}

/**
 * Renders nothing at zero rather than "0 people have checked in" — an explicit
 * zero reads as "this place is unpopular" rather than "this feature is new",
 * which is exactly the wrong impression on launch day.
 */
export function CheckInCount({
  playgroundId,
  showBeTheFirst = false,
  className,
}: CheckInCountProps) {
  const t = useT();
  const { data: stats, isLoading } = api.checkIn.getPlaygroundStats.useQuery({ playgroundId });

  if (isLoading) {
    return <Skeleton className={`h-4 w-32 ${className ?? ""}`} />;
  }

  if (!stats || stats.totalCheckIns === 0) {
    if (!showBeTheFirst) return null;
    return (
      <span className={`flex items-center gap-1.5 text-sm text-muted-foreground ${className ?? ""}`}>
        <Users className="h-4 w-4" />
        {t("checkIn.beTheFirst")}
      </span>
    );
  }

  return (
    <span className={`flex items-center gap-1.5 text-sm text-muted-foreground ${className ?? ""}`}>
      <Users className="h-4 w-4" />
      {t("checkIn.peopleCheckedIn", { count: stats.uniqueVisitors })}
    </span>
  );
}
