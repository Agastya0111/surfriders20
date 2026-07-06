import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Gift, Flame, Coins, Gem, Check } from "lucide-react";
import { toast } from "sonner";
import { getDailyStatus, claimDailyReward } from "@/lib/meta.functions";

export const Route = createFileRoute("/_authenticated/daily")({
  head: () => ({ meta: [{ title: "Daily Rewards — Surf Riders 2.0" }] }),
  component: DailyPage,
});

function DailyPage() {
  const fetcher = useServerFn(getDailyStatus);
  const claimFn = useServerFn(claimDailyReward);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["daily"], queryFn: () => fetcher() });

  const claim = useMutation({
    mutationFn: () => claimFn({}),
    onSuccess: (r) => {
      toast.success(`Day ${r.day}: +${r.coins} coins${r.gems ? `, +${r.gems} gems` : ""}`);
      qc.invalidateQueries({ queryKey: ["daily"] });
      qc.invalidateQueries({ queryKey: ["player-progress"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const streak = data?.streak ?? 0;
  const todayDay = ((streak % 7) || (data?.canClaim ? (streak % 7) + 1 : 7));

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10 bg-gradient-ocean opacity-40" />
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="flex items-center justify-between gap-3">
          <Link to="/dashboard" className="grid h-10 w-10 place-items-center rounded-full glass"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="flex items-center gap-2"><Gift className="h-5 w-5 text-coral" /><h1 className="font-display text-xl font-extrabold sm:text-2xl">Daily Rewards</h1></div>
          <span className="rounded-full glass px-3 py-1.5 text-sm font-bold"><Flame className="mr-1 inline h-4 w-4 text-sunset" />{streak} day</span>
        </header>

        <div className="mt-6 grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => {
            const day = i + 1;
            const claimed = day < todayDay || (day === todayDay && !data?.canClaim);
            const isToday = day === todayDay && data?.canClaim;
            return (
              <div key={day} className={`rounded-2xl p-3 text-center transition ${isToday ? "bg-gradient-wave text-primary-foreground shadow-glow animate-wave-pulse" : claimed ? "glass opacity-60" : "glass"}`}>
                <p className="text-[10px] uppercase tracking-widest opacity-80">Day {day}</p>
                <Coins className="mx-auto mt-2 h-5 w-5 text-sunset" />
                <p className="mt-1 text-sm font-bold">{50 * day}</p>
                {day === 7 && <p className="mt-1 text-[10px]"><Gem className="inline h-3 w-3 text-lagoon" /> 5</p>}
                {claimed && <Check className="mx-auto mt-1 h-3 w-3 text-lagoon" />}
              </div>
            );
          })}
        </div>

        <button disabled={!data?.canClaim || claim.isPending} onClick={() => claim.mutate()}
          className="mt-8 w-full rounded-full bg-gradient-wave py-4 font-display text-lg font-extrabold text-primary-foreground shadow-glow transition hover:scale-[1.01] disabled:opacity-50">
          {data?.canClaim ? "Claim today's reward" : "Come back tomorrow"}
        </button>
      </div>
    </div>
  );
}
