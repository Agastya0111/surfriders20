import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, Lock, Check, Footprints, Coins, Swords } from "lucide-react";
import { toast } from "sonner";
import { getSkillTree, unlockSkill } from "@/lib/meta.functions";

export const Route = createFileRoute("/_authenticated/skills")({
  head: () => ({ meta: [{ title: "Skill Tree — Surf Riders 2.0" }] }),
  component: SkillsPage,
});

const BRANCHES = [
  { key: "movement", label: "Movement", icon: Footprints, color: "text-lagoon" },
  { key: "treasure", label: "Treasure", icon: Coins, color: "text-sunset" },
  { key: "combat", label: "Combat", icon: Swords, color: "text-coral" },
] as const;

function SkillsPage() {
  const fetcher = useServerFn(getSkillTree);
  const unlockFn = useServerFn(unlockSkill);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["skills"], queryFn: () => fetcher() });

  const unlock = useMutation({
    mutationFn: (skillKey: string) => unlockFn({ data: { skillKey } }),
    onSuccess: () => {
      toast.success("Skill unlocked!");
      qc.invalidateQueries({ queryKey: ["skills"] });
      qc.invalidateQueries({ queryKey: ["player-progress"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unlockedSet = new Set((data?.unlocked ?? []).map((u) => u.skill_key));

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10 bg-gradient-ocean opacity-40" />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="flex items-center justify-between gap-3">
          <Link to="/dashboard" className="grid h-10 w-10 place-items-center rounded-full glass"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-lagoon" /><h1 className="font-display text-xl font-extrabold sm:text-2xl">Skill Tree</h1></div>
          <span className="rounded-full glass px-3 py-1.5 text-sm font-bold">
            <Sparkles className="mr-1 inline h-4 w-4 text-sunset" />
            {data?.skillPoints ?? 0} SP
          </span>
        </header>

        {isLoading ? (
          <p className="mt-12 text-center text-muted-foreground">Loading skills…</p>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {BRANCHES.map((b) => {
              const Icon = b.icon;
              const skills = (data?.skills ?? []).filter((s) => s.branch === b.key);
              return (
                <div key={b.key} className="glass rounded-3xl p-4">
                  <div className="flex items-center gap-2"><Icon className={`h-5 w-5 ${b.color}`} /><p className="font-display text-lg font-extrabold">{b.label}</p></div>
                  <div className="mt-3 flex flex-col gap-2">
                    {skills.map((s) => {
                      const owned = unlockedSet.has(s.key);
                      const prereqMet = !s.prerequisite_key || unlockedSet.has(s.prerequisite_key);
                      const affordable = (data?.skillPoints ?? 0) >= s.cost_points;
                      const canUnlock = !owned && prereqMet && affordable;
                      return (
                        <div key={s.key} className="rounded-2xl bg-background/40 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Tier {s.tier}</p>
                              <p className="truncate font-bold">{s.name}</p>
                              <p className="text-xs text-muted-foreground">{s.description}</p>
                            </div>
                            <div className="shrink-0">
                              {owned ? (
                                <span className="rounded-full bg-lagoon/20 px-2 py-1 text-[10px] font-bold text-lagoon"><Check className="inline h-3 w-3" /></span>
                              ) : (
                                <button disabled={!canUnlock || unlock.isPending} onClick={() => unlock.mutate(s.key)}
                                  className="rounded-full bg-gradient-wave px-3 py-1.5 text-[11px] font-bold text-primary-foreground shadow-glow disabled:opacity-40">
                                  {!prereqMet ? <Lock className="inline h-3 w-3" /> : `${s.cost_points} SP`}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {skills.length === 0 && <p className="text-xs text-muted-foreground">No skills yet.</p>}
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
