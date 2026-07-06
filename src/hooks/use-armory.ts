import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getArmory } from "@/lib/level.functions";

export function useArmory(userId: string | undefined) {
  const fetcher = useServerFn(getArmory);
  return useQuery({
    queryKey: ["armory", userId],
    queryFn: () => fetcher(),
    enabled: !!userId,
    staleTime: 15_000,
  });
}
