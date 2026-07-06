import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Trophy, Medal, ArrowLeft, Sword, Coins, Star, Users, Lock } from "lucide-react";
import { getGlobalLeaderboard, type LeaderboardRow } from "@/lib/leaderboard.functions";
import { getAvatar } from "@/game/avatars";

export const Route = createFileRoute("/_authenticated/leaderboards")({
  head: () => ({ meta: [{ title: "Leaderboards — Surf Riders 2.0" }] }),
  component: LeaderboardsPage,
});

function LeaderboardsPage() {
  const [tab, setTab] = useState<"global" | "friends">("global");
  const fetchGlobal = useServerFn(getGlobalLeaderboard);
  const { data, isLoading, error } = useQuery({
    queryKey: ["leaderboards", "global-v2"],
    queryFn: () => fetchGlobal(),
    staleTime: 30_000,
  });

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10 bg-gradient-ocean opacity-40" />
      <div className="mx-auto w-full max-w-5xl px-3 py-6 sm:px-6 sm:py-10">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-lagoon hover:text-foam">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <header className="mt-4 flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-wave shadow-glow">
            <Trophy className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-lagoon">Leaderboards</p>
            <h1 className="truncate font-display text-2xl font-extrabold sm:text-3xl">Top Surfers</h1>
          </div>
        </header>

        <div className="mt-4 flex gap-2">
          <TabBtn active={tab === "global"} onClick={() => setTab("global")} icon={Trophy}>
            Global
          </TabBtn>
          <TabBtn active={tab === "friends"} onClick={() => setTab("friends")} icon={Users}>
            Friends
            <Lock className="ml-1 h-3 w-3 opacity-60" />
          </TabBtn>
        </div>

        {tab === "friends" && (
          <div className="mt-6 glass rounded-3xl p-8 text-center shadow-card">
            <Users className="mx-auto h-8 w-8 text-lagoon" />
            <p className="mt-3 font-display text-lg font-extrabold text-foam">Friends leaderboards</p>
            <p className="mt-1 text-sm text-muted-foreground">Coming soon — invite your crew to surf together.</p>
          </div>
        )}

        {tab === "global" && (
          <div className="mt-4 glass rounded-3xl shadow-card">
            {isLoading && <p className="p-6 text-center text-sm text-muted-foreground">Loading the wave…</p>}
            {error && <p className="p-6 text-center text-sm text-coral">Could not load leaderboards.</p>}
            {data && data.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">No scores yet. Be the first.</p>
            )}
            {data && data.length > 0 && (
              <>
                {/* Desktop / tablet table */}
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full text-sm">
                    <thead className="text-[10px] uppercase tracking-widest text-lagoon">
                      <tr className="border-b border-border/40">
                        <th className="px-3 py-3 text-left">Rank</th>
                        <th className="px-3 py-3 text-left">Player</th>
                        <th className="px-3 py-3 text-right">Level</th>
                        <th className="px-3 py-3 text-right">Score</th>
                        <th className="px-3 py-3 text-right">Gold</th>
                        <th className="px-3 py-3 text-right">Monsters</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row, i) => (
                        <Row key={i} row={row} index={i} me={!!row.user_id} />
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile stacked list */}
                <ol className="divide-y divide-border/40 sm:hidden">
                  {data.map((row, i) => (
                    <MobileRow key={i} row={row} index={i} me={!!row.user_id} />
                  ))}
                </ol>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({
  active, onClick, icon: Icon, children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
        active ? "bg-gradient-wave text-primary-foreground shadow-glow" : "bg-background/50 text-foam hover:bg-background/70"
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function RankBadge({ index }: { index: number }) {
  const cls =
    index === 0 ? "bg-sunset/20 text-sunset"
    : index === 1 ? "bg-foam/20 text-foam"
    : index === 2 ? "bg-coral/20 text-coral"
    : "bg-secondary text-muted-foreground";
  return (
    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display font-extrabold ${cls}`}>
      {index < 3 ? <Medal className="h-4 w-4" /> : index + 1}
    </span>
  );
}

function AvatarChip({ row }: { row: LeaderboardRow }) {
  const a = getAvatar(row.selected_avatar);
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-background/60 text-lg">
      {a.emoji}
    </span>
  );
}

function Row({ row, index, me }: { row: LeaderboardRow; index: number; me: boolean }) {
  return (
    <tr className={`border-b border-border/20 ${me ? "bg-lagoon/10" : ""}`}>
      <td className="px-3 py-3"><RankBadge index={index} /></td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <AvatarChip row={row} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-foam">
              {row.username} {me && <span className="ml-1 rounded-full bg-lagoon/30 px-1.5 py-0.5 text-[10px] font-bold text-foam">YOU</span>}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-right"><span className="inline-flex items-center gap-1 font-bold text-foam"><Star className="h-3.5 w-3.5 text-sunset" />{row.current_level}</span></td>
      <td className="px-3 py-3 text-right font-display font-extrabold tabular-nums text-foam">{row.highest_score.toLocaleString()}</td>
      <td className="px-3 py-3 text-right"><span className="inline-flex items-center gap-1 tabular-nums text-sunset"><Coins className="h-3.5 w-3.5" />{row.gold_coins.toLocaleString()}</span></td>
      <td className="px-3 py-3 text-right"><span className="inline-flex items-center gap-1 tabular-nums text-coral"><Sword className="h-3.5 w-3.5" />{row.monsters_defeated}</span></td>
    </tr>
  );
}

function MobileRow({ row, index, me }: { row: LeaderboardRow; index: number; me: boolean }) {
  return (
    <li className={`grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 ${me ? "bg-lagoon/10" : ""}`}>
      <RankBadge index={index} />
      <AvatarChip row={row} />
      <div className="min-w-0">
        <p className="truncate font-semibold text-foam">
          {row.username} {me && <span className="ml-1 rounded-full bg-lagoon/30 px-1.5 py-0.5 text-[10px] font-bold text-foam">YOU</span>}
        </p>
        <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 text-sunset" />Lv {row.current_level}</span>
          <span className="inline-flex items-center gap-1"><Coins className="h-3 w-3 text-sunset" />{row.gold_coins.toLocaleString()}</span>
          <span className="inline-flex items-center gap-1"><Sword className="h-3 w-3 text-coral" />{row.monsters_defeated}</span>
        </div>
      </div>
      <span className="font-display text-base font-extrabold tabular-nums text-foam">{row.highest_score.toLocaleString()}</span>
    </li>
  );
}
