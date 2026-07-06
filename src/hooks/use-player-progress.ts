import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPlayerProgress } from "@/lib/game-progress.functions";

export function usePlayerProgress(userId: string | undefined) {
  const fetcher = useServerFn(getPlayerProgress);
  return useQuery({
    queryKey: ["player-progress", userId],
    queryFn: () => fetcher(),
    enabled: !!userId,
    staleTime: 30_000,
  });
}
