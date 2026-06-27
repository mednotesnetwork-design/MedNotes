import { createContext, useContext } from "react";
import { useGetLeaderboard, useGetLeaderboardChampions } from "@workspace/api-client-react";
import { getProgressionRank } from "@/lib/gamification";
import type { ProgressionRankKey } from "@/lib/gamification";

interface LeaderboardContextValue {
  getRank:         (authorName: string | null | undefined) => ProgressionRankKey;
  isOnLeaderboard: (authorName: string | null | undefined) => boolean;
  getChampionTitle:(authorName: string | null | undefined) => string | null;
}

const LeaderboardContext = createContext<LeaderboardContextValue>({
  getRank:          () => "beginner",
  isOnLeaderboard:  () => false,
  getChampionTitle: () => null,
});

export function LeaderboardProvider({ children }: { children: React.ReactNode }) {
  /* Weekly champions — the 7 title-category winners */
  const { data: champions } = useGetLeaderboardChampions();

  /* Full leaderboard for rank lookup (all-time points) */
  const { data: leaderboard } = useGetLeaderboard(
    { category: "points", period: "all" },
  );

  /* champion set: authorName → titleKey */
  const championMap = new Map(
    (champions ?? []).map((c) => [c.authorName, c.titleKey])
  );

  /* rank map: authorName → entry (for progression rank) */
  const rankMap = new Map(
    (leaderboard ?? []).map((e) => [e.authorName, e])
  );

  function getRank(authorName: string | null | undefined): ProgressionRankKey {
    if (!authorName) return "beginner";
    const entry = rankMap.get(authorName);
    if (!entry) return "beginner";
    return (
      (entry.progressionRank as ProgressionRankKey | undefined) ??
      getProgressionRank(entry.points ?? 0)
    );
  }

  /** True if the author won any of the 7 weekly title categories */
  function isOnLeaderboard(authorName: string | null | undefined): boolean {
    return !!authorName && championMap.has(authorName);
  }

  /** Returns the titleKey the author won this week, or null */
  function getChampionTitle(authorName: string | null | undefined): string | null {
    if (!authorName) return null;
    return championMap.get(authorName) ?? null;
  }

  return (
    <LeaderboardContext.Provider value={{ getRank, isOnLeaderboard, getChampionTitle }}>
      {children}
    </LeaderboardContext.Provider>
  );
}

export function useLeaderboard() {
  return useContext(LeaderboardContext);
}
