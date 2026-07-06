import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Award, Check, Lock } from "lucide-react";
import { getAchievements } from "@/lib/meta.functions";

export const Route = createFileRoute("/_authenticated/achievements")({
  head: () => ({ meta: [{ title: "Achievements — Surf Riders 2.0" }] }),
  component: AchievementsPage,
});

function AchievementsPage() {
  const fetcher = useServerFn(getAchievements);
  const { data, isLoading } = useQuery({ queryKey: ["achievements"], queryFn: () => fetcher() });
  const unlockedSet = new Set((data?.unlocked ?? []).map((u) => u.achievement_key));

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10 bg-gradient-ocean opacity-40" />
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="flex items-center justify-between gap-3">
          <Link to="/dashboard" className="grid h-10 w-10 place-items-center rounded-full glass"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="flex items-center gap-2"><Award className="h-5 w-5 text-sunset" /><h1 className="font-display text-xl font-extrabold sm:text-2xl">Achievements</h1></div>
          <span className="text-sm font-bold text-muted-foreground">{unlockedSet.size}/{data?.achievements.length ?? 0}</span>
        </header>

        {isLoading ? (
          <p className="mt-12 text-center text-muted-foreground">Loading…</p>
        ) : (
          <div className="mt-6 grid gap-3">
            {(data?.achievements ?? []).map((a) => {
              const owned = unlockedSet.has(a.key);
              return (
                <div key={a.key} className={`glass flex items-center gap-4 rounded-2xl p-4 ${owned ? "" : "opacity-70"}`}>
                  <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${owned ? "bg-gradient-wave" : "bg-secondary"}`}>
                    {owned ? <Check className="h-5 w-5 text-primary-foreground" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-extrabold">{a.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.description}</p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    {a.reward_coins > 0 && <p>+{a.reward_coins} coins</p>}
                    {a.reward_gems > 0 && <p>+{a.reward_gems} gems</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
