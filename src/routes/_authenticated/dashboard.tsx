import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Coins, Trophy, Play, Settings, LogOut, ShoppingBag, ChevronRight, Zap, Sword, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlayerProgress } from "@/hooks/use-player-progress";
import { silverTargetForLevel, getWeapon } from "@/game/weapons";
import { getAvatar } from "@/game/avatars";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Surf Riders 2.0" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: progress } = usePlayerProgress(user.id);
  const profile = progress?.profile as
    | { username?: string; silver_coins?: number; gold_coins?: number; current_level?: number; equipped_weapon?: string | null; selected_avatar?: string | null; highest_score?: number }
    | undefined;
  const prog = progress?.progress;

  const level = profile?.current_level ?? 1;
  const silver = profile?.silver_coins ?? 0;
  const gold = profile?.gold_coins ?? 0;
  const target = silverTargetForLevel(level);
  const pct = Math.min(100, Math.round((silver / target) * 100));

  const avatar = getAvatar(profile?.selected_avatar);
  const weapon = getWeapon(profile?.equipped_weapon);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10 bg-gradient-ocean opacity-40" />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/avatar-select" aria-label="Choose avatar" className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-wave text-3xl shadow-glow transition hover:scale-105">
              {avatar.emoji}
            </Link>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest text-lagoon">Rider Lv {prog?.level ?? 1} · {avatar.name}</p>
              <h1 className="truncate font-display text-xl font-extrabold sm:text-2xl">
                {profile?.username ?? user.email?.split("@")[0]}
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                <Sword className="mr-1 inline h-3 w-3 text-lagoon" />
                {weapon.icon} {weapon.name} · {weapon.damage} dmg
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link to="/settings" className="grid h-11 w-11 place-items-center rounded-full glass transition hover:scale-105" aria-label="Settings">
              <Settings className="h-5 w-5" />
            </Link>
            <button onClick={handleSignOut} className="grid h-11 w-11 place-items-center rounded-full glass transition hover:scale-105" aria-label="Sign out">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Level progress card */}
        <section className="mt-6 glass rounded-3xl p-4 shadow-card sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-lagoon">Current Objective</p>
              <p className="font-display text-lg font-extrabold sm:text-xl">
                Collect {target.toLocaleString()} silver — Level {level}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-gradient-wave px-3 py-1.5 font-display text-xs font-extrabold text-primary-foreground">
              L{level}
            </span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-background/50">
            <div className="h-full bg-gradient-sunset transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-right text-xs text-muted-foreground">
            {silver.toLocaleString()} / {target.toLocaleString()} silver banked
          </p>
        </section>

        {/* Currency stats */}
        <section className="mt-4 grid grid-cols-3 gap-3">
          <StatCard label="Silver" value={silver} sub="Coins" icon={Coins} tint="text-slate-300" />
          <StatCard label="Gold" value={gold} sub="Coins" icon={Coins} tint="text-sunset" />
          <StatCard label="Best" value={profile?.highest_score ?? 0} sub="Score" icon={Trophy} tint="text-lagoon" />
        </section>

        {/* Continue */}
        <section className="mt-6">
          <button onClick={() => navigate({ to: "/play" })} className="group flex w-full items-center justify-between overflow-hidden rounded-3xl bg-gradient-wave p-5 text-left shadow-glow transition hover:scale-[1.01]">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-background/20 backdrop-blur">
                <Play className="h-7 w-7 fill-primary-foreground text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/80">Continue</p>
                <p className="font-display text-xl font-extrabold text-primary-foreground">Play Level {level}</p>
              </div>
            </div>
            <ChevronRight className="h-6 w-6 text-primary-foreground transition group-hover:translate-x-1" />
          </button>
        </section>

        {/* Tiles */}
        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <Tile to="/armory" icon={ShoppingBag} title="Armory" desc="Buy weapons with gold." accent="text-sunset" />
          <Tile to="/avatar-select" icon={User} title="Avatar" desc="Change your character." accent="text-lagoon" />
          <Tile to="/leaderboards" icon={Trophy} title="Leaderboards" desc="Global top riders." accent="text-coral" />
        </section>
        <section className="mt-3 grid gap-3 sm:grid-cols-3">
          <Tile to="/skills" icon={Zap} title="Skill Tree" desc="Movement · Treasure · Combat." accent="text-coral" />
          <Tile to="/daily" icon={Trophy} title="Daily Rewards" desc="Streak bonuses every day." accent="text-sunset" />
          <Tile to="/achievements" icon={Trophy} title="Achievements" desc="Earn coins & gems." accent="text-lagoon" />
        </section>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Signed in as {user.email} · <Link to="/" className="text-lagoon hover:text-foam">Home</Link>
        </p>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, tint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; sub: string; tint: string }) {
  return (
    <div className="glass rounded-2xl p-3 shadow-card">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${tint}`} />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 font-display text-xl font-extrabold sm:text-2xl">{value.toLocaleString()}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{sub}</p>
    </div>
  );
}

function Tile({ to, icon: Icon, title, desc, accent }: { to: string; icon: React.ComponentType<{ className?: string }>; title: string; desc: string; accent: string }) {
  return (
    <Link to={to} className="glass rounded-2xl p-4 text-left transition hover:-translate-y-0.5">
      <Icon className={`h-6 w-6 ${accent}`} />
      <p className="mt-3 font-display text-base font-extrabold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </Link>
  );
}
