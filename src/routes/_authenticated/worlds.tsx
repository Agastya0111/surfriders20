import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Lock, Waves, Trophy, Play } from "lucide-react";
import { getWorlds } from "@/lib/meta.functions";
import { FALLBACK_THEMES } from "@/game/themes";

export const Route = createFileRoute("/_authenticated/worlds")({
  head: () => ({ meta: [{ title: "Worlds — Surf Riders 2.0" }] }),
  component: WorldsPage,
});

function WorldsPage() {
  const navigate = useNavigate();
  const fetcher = useServerFn(getWorlds);
  const { data, isLoading } = useQuery({ queryKey: ["worlds"], queryFn: () => fetcher() });
  const progMap = new Map((data?.progress ?? []).map((p) => [p.world_key, p]));

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10 bg-gradient-ocean opacity-40" />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="flex items-center justify-between gap-3">
          <Link to="/dashboard" className="grid h-10 w-10 place-items-center rounded-full glass"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="flex items-center gap-2"><Waves className="h-5 w-5 text-lagoon" /><h1 className="font-display text-xl font-extrabold sm:text-2xl">Worlds</h1></div>
          <span className="w-10" />
        </header>

        {isLoading ? (
          <p className="mt-12 text-center text-muted-foreground">Loading worlds…</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {(data?.worlds ?? []).map((w) => {
              const theme = FALLBACK_THEMES[w.key];
              const prog = progMap.get(w.key);
              const unlocked = prog?.unlocked ?? false;
              return (
                <div key={w.key} className="glass relative overflow-hidden rounded-3xl p-5 shadow-card transition hover:-translate-y-0.5">
                  <div className="absolute inset-0 -z-10 opacity-40" style={{ background: `linear-gradient(135deg, ${theme?.sky[0] ?? "#1a2e5a"}, ${theme?.water[1] ?? "#0a1838"})` }} />
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-foam/80">World {w.order_index}</p>
                      <p className="font-display text-2xl font-extrabold text-foam">{w.name}</p>
                      <p className="mt-1 text-xs text-foam/80">Boss: {theme?.bossName ?? "Unknown"}</p>
                    </div>
                    {!unlocked && <Lock className="h-5 w-5 text-foam/70" />}
                  </div>
                  {prog && (
                    <div className="mt-4 flex items-center gap-4 text-xs text-foam/90">
                      <span className="flex items-center gap-1"><Trophy className="h-4 w-4 text-sunset" />{(prog.best_score ?? 0).toLocaleString()}</span>
                      <span>{(prog.best_distance ?? 0)}m</span>
                      {prog.completed && <span className="rounded-full bg-lagoon/30 px-2 py-0.5 text-[10px] font-bold uppercase">Cleared</span>}
                    </div>
                  )}
                  <button disabled={!unlocked} onClick={() => navigate({ to: "/play", search: { world: w.key } })}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-wave px-4 py-2 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-40">
                    <Play className="h-4 w-4" />{unlocked ? "Surf this world" : "Locked"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
