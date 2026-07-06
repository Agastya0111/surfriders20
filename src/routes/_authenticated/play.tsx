import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Pause, Play, RotateCcw, Home, Coins, Heart, ArrowLeft, ArrowRight, ArrowUp, ArrowDown,
  Sparkles, ShoppingBag, Sword, Trophy, Zap, RotateCw, Award,
} from "lucide-react";
import { SurfGame, type GameState } from "@/game/engine";
import { FALLBACK_THEMES } from "@/game/themes";
import { getAvatar } from "@/game/avatars";
import { getWeapon, silverTargetForLevel, monsterForLevel, levelRewards } from "@/game/weapons";
import { completeLevel } from "@/lib/level.functions";
import { usePlayerProgress } from "@/hooks/use-player-progress";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/play")({
  head: () => ({ meta: [{ title: "Play — Surf Riders 2.0" }] }),
  component: PlayPage,
});

type Phase =
  | "loading"
  | "landscape-required"
  | "playing"
  | "level-complete"
  | "monster-battle"
  | "monster-victory"
  | "monster-defeat"
  | "game-over";

function PlayPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = Route.useRouteContext();
  const complete = useServerFn(completeLevel);

  const { data: progress } = usePlayerProgress(user.id);
  const profile = progress?.profile as
    | { current_level?: number; equipped_weapon?: string | null; selected_avatar?: string | null; silver_coins?: number; gold_coins?: number }
    | undefined;

  const level = profile?.current_level ?? 1;
  const silverTarget = silverTargetForLevel(level);
  const avatar = getAvatar(profile?.selected_avatar);
  const weapon = getWeapon(profile?.equipped_weapon);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<SurfGame | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [state, setState] = useState<GameState | null>(null);
  const [silverAtComplete, setSilverAtComplete] = useState(0);
  const [rewardsPreview] = useState(() => levelRewards(level));
  const [saving, setSaving] = useState(false);
  const [runId, setRunId] = useState(0);
  const [savedReward, setSavedReward] = useState<null | { goldGained: number; xpGained: number; bonusSilver: number; nextLevel: number }>(null);


  // Landscape gate
  const [isPortrait, setIsPortrait] = useState(false);
  useEffect(() => {
    const check = () => setIsPortrait(window.innerHeight > window.innerWidth);
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    // Best-effort orientation lock (only works on mobile fullscreen; ignore failures)
    const so = (screen as unknown as { orientation?: { lock?: (o: string) => Promise<void> } }).orientation;
    so?.lock?.("landscape").catch(() => {});
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  // Restore preserved post-level state when returning from armory/shop
  const RESTORE_KEY = "sr2:play-state";
  useEffect(() => {
    if (!progress) return;
    try {
      const raw = sessionStorage.getItem(RESTORE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { phase: Phase; silverAtComplete: number; level: number };
        sessionStorage.removeItem(RESTORE_KEY);
        if (saved.level === level && (saved.phase === "level-complete" || saved.phase === "monster-battle")) {
          setSilverAtComplete(saved.silverAtComplete);
          setPhase(saved.phase);
          return;
        }
      }
    } catch { /* ignore */ }
    const t = setTimeout(() => setPhase("playing"), 700);
    return () => clearTimeout(t);
  }, [progress, level]);

  const startEngine = useCallback(() => {
    if (!canvasRef.current) return;
    if (gameRef.current) gameRef.current.destroy();
    const theme = FALLBACK_THEMES.sunny_beach;
    const game = new SurfGame(
      canvasRef.current,
      {
        onStateChange: (s) => setState(s),
        onGameOver: () => setPhase("game-over"),
        onLevelComplete: (silver) => {
          setSilverAtComplete(silver);
          setPhase("level-complete");
        },
      },
      { theme, level, silverTarget, disableBoss: true },
    );
    gameRef.current = game;
    game.start();
    setState({ ...game.state });
  }, [level, silverTarget]);

  useEffect(() => {
    if (phase !== "playing" || !canvasRef.current) return;
    startEngine();
    return () => gameRef.current?.destroy();
    // runId forces a fresh engine on Restart Level even when phase is already "playing".
  }, [phase, startEngine, runId]);

  const onPause = () => gameRef.current?.pause();
  const onResume = () => gameRef.current?.resume();
  const onRestartLevel = () => {
    setSavedReward(null);
    setState(null);
    gameRef.current?.destroy();
    gameRef.current = null;
    setPhase("playing");
    setRunId((n) => n + 1);
  };
  const onHome = async () => {
    gameRef.current?.destroy();
    await navigate({ to: "/dashboard" });
  };


  const onFightMonster = () => setPhase("monster-battle");

  const submitLevelResult = useCallback(
    async (monsterDefeated: boolean) => {
      if (saving) return;
      setSaving(true);
      try {
        const res = await complete({
          data: { silverCollected: silverAtComplete, monsterDefeated, clientLevel: level },
        });
        setSavedReward({
          goldGained: res.goldGained,
          xpGained: res.xpGained,
          bonusSilver: res.bonusSilver,
          nextLevel: res.nextLevel,
        });
        qc.invalidateQueries({ queryKey: ["player-progress", user.id] });
        qc.invalidateQueries({ queryKey: ["armory", user.id] });
      } catch (e) {
        console.error(e);
        toast.error(e instanceof Error ? e.message : "Could not save progress.");
      } finally {
        setSaving(false);
      }
    },
    [complete, level, qc, saving, silverAtComplete, user.id],
  );

  const onContinueNextLevel = () => {
    setSavedReward(null);
    setState(null);
    gameRef.current?.destroy();
    // Player progress was invalidated → next mount reads new level from server.
    setPhase("loading");
    setTimeout(() => setPhase("playing"), 500);
  };

  if (isPortrait) return <LandscapeGate />;

  return (
    <div className="fixed inset-0 overflow-hidden bg-background select-none">
      {phase === "loading" && <LoadingScreen level={level} />}

      {phase !== "loading" && (
        <>
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full touch-none"
            style={{ touchAction: "none" }}
            aria-label="Surf Riders gameplay"
          />

          {state && phase === "playing" && state.status !== "gameover" && (
            <Hud
              state={state}
              avatar={avatar}
              weapon={weapon}
              goldCoins={profile?.gold_coins ?? 0}
              onPause={onPause}
            />
          )}

          {state?.status === "paused" && phase === "playing" && (
            <Overlay title="Paused" subtitle="Catch your breath, rider.">
              <OverlayButton onClick={onResume} icon={Play}>Resume</OverlayButton>
              <OverlayButton onClick={onRestartLevel} icon={RotateCcw} variant="ghost">Restart Level</OverlayButton>
              <OverlayButton onClick={onHome} icon={Home} variant="ghost">Exit</OverlayButton>
            </Overlay>
          )}

          {phase === "level-complete" && (
            <LevelCompleteOverlay
              level={level}
              silverCollected={silverAtComplete}
              silverTarget={silverTarget}
              rewards={rewardsPreview}
              onFight={onFightMonster}
              onShop={async () => {
                sessionStorage.setItem(
                  "sr2:play-state",
                  JSON.stringify({ phase: "level-complete", silverAtComplete, level }),
                );
                gameRef.current?.destroy();
                await navigate({ to: "/armory" });
              }}
            />
          )}

          {phase === "monster-battle" && (
            <MonsterBattle
              level={level}
              weapon={weapon}
              avatar={avatar}
              onVictory={async () => {
                await submitLevelResult(true);
                setPhase("monster-victory");
              }}
              onDefeat={async () => {
                await submitLevelResult(false);
                setPhase("monster-defeat");
              }}
            />
          )}

          {phase === "monster-victory" && savedReward && (
            <Overlay title="Victory!" subtitle={`Level ${level} complete.`}>
              <RewardsGrid
                gold={savedReward.goldGained}
                xp={savedReward.xpGained}
                bonusSilver={savedReward.bonusSilver}
              />
              <OverlayButton onClick={onContinueNextLevel} icon={Play}>Play Level {savedReward.nextLevel}</OverlayButton>
              <OverlayButton onClick={async () => { gameRef.current?.destroy(); await navigate({ to: "/armory" }); }} icon={ShoppingBag} variant="ghost">Visit Armory</OverlayButton>
              <OverlayButton onClick={onHome} icon={Home} variant="ghost">Dashboard</OverlayButton>
            </Overlay>
          )}

          {phase === "monster-defeat" && savedReward && (
            <Overlay title="Defeated" subtitle="The monster prevailed. Upgrade your weapon.">
              <RewardsGrid gold={savedReward.goldGained} xp={savedReward.xpGained} bonusSilver={0} />
              <OverlayButton onClick={async () => { gameRef.current?.destroy(); await navigate({ to: "/armory" }); }} icon={ShoppingBag}>Visit Armory</OverlayButton>
              <OverlayButton onClick={onRestartLevel} icon={RotateCcw} variant="ghost">Retry Level {level}</OverlayButton>
              <OverlayButton onClick={onHome} icon={Home} variant="ghost">Dashboard</OverlayButton>
            </Overlay>
          )}

          {phase === "game-over" && (
            <Overlay title="GAME OVER" subtitle="The wave got you. Progress is not lost.">
              <OverlayButton onClick={onRestartLevel} icon={RotateCw}>Retry</OverlayButton>
              <OverlayButton
                onClick={async () => {
                  gameRef.current?.destroy();
                  await navigate({ to: "/armory" });
                }}
                icon={ShoppingBag}
                variant="ghost"
              >
                Visit Shop
              </OverlayButton>
              <OverlayButton onClick={onHome} icon={Home} variant="ghost">Main Menu</OverlayButton>
            </Overlay>
          )}

          {phase === "playing" && state?.status === "playing" && (
            <MobileControls
              onLeft={() => dispatchKey("ArrowLeft")}
              onRight={() => dispatchKey("ArrowRight")}
              onJump={() => dispatchKey(" ")}
              onSlide={() => dispatchKey("ArrowDown")}
              onDash={() => dispatchKey("Shift")}
            />
          )}
        </>
      )}
    </div>
  );
}

function dispatchKey(key: string) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key }));
}

function LandscapeGate() {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-gradient-ocean p-6 text-center">
      <div className="glass max-w-sm rounded-3xl p-6 shadow-card">
        <RotateCw className="mx-auto h-14 w-14 animate-float-slow text-lagoon" />
        <h2 className="mt-4 font-display text-2xl font-extrabold text-foam">Rotate your device</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Surf Riders 2.0 is designed for landscape. Turn your phone sideways to start surfing.
        </p>
        <Link to="/dashboard" className="mt-6 inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-xs text-foam">
          <Home className="h-4 w-4" /> Back to dashboard
        </Link>
      </div>
    </div>
  );
}

function LoadingScreen({ level }: { level: number }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-gradient-ocean">
      <div className="text-center">
        <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-gradient-wave shadow-glow animate-wave-pulse">
          <Sparkles className="h-10 w-10 text-primary-foreground" />
        </div>
        <p className="font-display text-2xl font-extrabold text-foam">Loading Level {level}…</p>
        <p className="mt-2 text-sm text-muted-foreground">Preparing the wave</p>
      </div>
    </div>
  );
}

function Hud({
  state, avatar, weapon, goldCoins, onPause,
}: {
  state: GameState;
  avatar: { name: string; emoji: string };
  weapon: { name: string; icon: string; damage: number };
  goldCoins: number;
  onPause: () => void;
}) {
  const pct = Math.min(100, Math.round((state.coins / Math.max(1, state.silverTarget)) * 100));
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-2 sm:p-3">
      {/* Top row: level objective */}
      <div className="pointer-events-auto mx-auto max-w-4xl">
        <div className="glass flex items-center gap-2 rounded-2xl px-3 py-2 shadow-card">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-wave font-display text-xs font-extrabold text-primary-foreground">
            L{state.level}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] uppercase tracking-widest text-lagoon">
              Collect {state.silverTarget.toLocaleString()} silver to complete
            </p>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-background/50">
                <div className="h-full bg-gradient-sunset transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="shrink-0 font-display text-xs font-extrabold tabular-nums text-foam">
                {state.coins.toLocaleString()} / {state.silverTarget.toLocaleString()}
              </span>
            </div>
          </div>
          <button
            onClick={onPause}
            aria-label="Pause"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-background/70 backdrop-blur transition hover:scale-105"
          >
            <Pause className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bottom-left compact stats + weapon */}
      <div className="pointer-events-none mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill label={avatar.emoji + " " + avatar.name} />
          <Pill icon={<Sword className="h-3.5 w-3.5 text-lagoon" />} label={`${weapon.icon} ${weapon.damage} dmg`} />
        </div>
        <div className="flex items-center gap-1.5">
          <Pill icon={<Coins className="h-3.5 w-3.5 text-slate-200 drop-shadow-[0_0_4px_rgba(220,235,255,0.9)]" />} label={`${state.coins.toLocaleString()} Ag`} />
          <Pill icon={<Coins className="h-3.5 w-3.5 text-sunset drop-shadow-[0_0_4px_rgba(255,180,80,0.9)]" />} label={`${goldCoins.toLocaleString()} Au`} />
          {state.shieldActive && <Pill icon={<span className="text-sm">🛡️</span>} label="Shield" />}
          <Hearts count={state.health} />
        </div>
      </div>
    </div>
  );
}

function Pill({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-background/70 px-2.5 py-1 backdrop-blur">
      {icon}
      <span className="text-[11px] font-bold tabular-nums text-foam">{label}</span>
    </div>
  );
}

function Hearts({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-background/70 px-2 py-1 backdrop-blur">
      {Array.from({ length: 3 }).map((_, i) => (
        <Heart key={i} className={`h-3.5 w-3.5 ${i < count ? "fill-coral text-coral" : "text-muted-foreground"}`} />
      ))}
    </div>
  );
}

function Overlay({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-background/70 backdrop-blur-md">
      <div className="glass mx-4 w-full max-w-md rounded-3xl p-5 shadow-card sm:p-6">
        <h2 className="text-center font-display text-2xl font-extrabold text-gradient-wave sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1 text-center text-sm text-muted-foreground">{subtitle}</p>}
        <div className="mt-4 flex flex-col gap-2">{children}</div>
      </div>
    </div>
  );
}

function OverlayButton({
  onClick, icon: Icon, variant = "primary", disabled, children,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "primary" | "ghost";
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const cls =
    variant === "primary"
      ? "bg-gradient-wave text-primary-foreground shadow-glow hover:scale-[1.02]"
      : "bg-secondary text-foreground hover:bg-secondary/80";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full min-h-11 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition disabled:opacity-40 ${cls}`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function LevelCompleteOverlay({
  level, silverCollected, silverTarget, rewards, onFight, onShop,
}: {
  level: number;
  silverCollected: number;
  silverTarget: number;
  rewards: { gold: number; xp: number; bonusSilver: number };
  onFight: () => void;
  onShop: () => void;
}) {
  return (
    <Overlay title="LEVEL COMPLETE!" subtitle={`Level ${level} silver target reached.`}>
      <div className="rounded-2xl bg-background/40 p-3 text-center">
        <p className="text-[10px] uppercase tracking-widest text-lagoon">Silver Coins Collected</p>
        <p className="mt-1 font-display text-2xl font-extrabold text-foam">
          {silverCollected.toLocaleString()} / {silverTarget.toLocaleString()}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-2xl bg-background/40 p-3">
          <p className="text-[10px] uppercase tracking-widest text-lagoon">Gold on Victory</p>
          <p className="mt-1 font-display text-lg font-extrabold text-sunset">+{rewards.gold}</p>
        </div>
        <div className="rounded-2xl bg-background/40 p-3">
          <p className="text-[10px] uppercase tracking-widest text-lagoon">XP on Victory</p>
          <p className="mt-1 font-display text-lg font-extrabold text-foam">+{rewards.xp}</p>
        </div>
      </div>
      <p className="mt-1 text-center text-xs text-muted-foreground">Defeat the guardian monster to earn full rewards and unlock the next level.</p>
      <OverlayButton onClick={onFight} icon={Sword}>Continue</OverlayButton>
      <OverlayButton onClick={onShop} icon={ShoppingBag} variant="ghost">Visit Shop</OverlayButton>
      <Link
        to="/dashboard"
        className="mt-1 flex w-full min-h-11 items-center justify-center gap-2 rounded-full bg-secondary px-5 py-3 text-sm font-bold text-foreground transition hover:bg-secondary/80"
      >
        <Home className="h-4 w-4" /> Main Menu
      </Link>
    </Overlay>
  );
}

function RewardsGrid({ gold, xp, bonusSilver }: { gold: number; xp: number; bonusSilver: number }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      <div className="rounded-2xl bg-background/40 p-2">
        <Coins className="mx-auto h-4 w-4 text-sunset" />
        <p className="mt-1 font-display text-base font-extrabold text-sunset">+{gold}</p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Gold</p>
      </div>
      <div className="rounded-2xl bg-background/40 p-2">
        <Award className="mx-auto h-4 w-4 text-foam" />
        <p className="mt-1 font-display text-base font-extrabold text-foam">+{xp}</p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">XP</p>
      </div>
      <div className="rounded-2xl bg-background/40 p-2">
        <Trophy className="mx-auto h-4 w-4 text-lagoon" />
        <p className="mt-1 font-display text-base font-extrabold text-lagoon">+{bonusSilver}</p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Bonus Ag</p>
      </div>
    </div>
  );
}

function MonsterBattle({
  level, weapon, avatar, onVictory, onDefeat,
}: {
  level: number;
  weapon: { name: string; icon: string; damage: number; speed: number };
  avatar: { name: string; emoji: string };
  onVictory: () => void;
  onDefeat: () => void;
}) {
  const monster = monsterForLevel(level);
  const [monsterHp, setMonsterHp] = useState(monster.hp);
  const [playerHp, setPlayerHp] = useState(100);
  const [flash, setFlash] = useState<"hit" | "hurt" | null>(null);
  const settled = useRef(false);

  // Monster attacks on interval
  useEffect(() => {
    const iv = setInterval(() => {
      if (settled.current) return;
      setPlayerHp((h) => {
        const n = Math.max(0, h - monster.damage);
        setFlash("hurt");
        setTimeout(() => setFlash(null), 200);
        return n;
      });
    }, monster.interval * 1000);
    return () => clearInterval(iv);
  }, [monster.damage, monster.interval]);

  // Win / lose watcher
  useEffect(() => {
    if (settled.current) return;
    if (monsterHp <= 0) { settled.current = true; setTimeout(onVictory, 500); }
    else if (playerHp <= 0) { settled.current = true; setTimeout(onDefeat, 500); }
  }, [monsterHp, playerHp, onVictory, onDefeat]);

  const attack = () => {
    if (settled.current) return;
    const dmg = Math.round(weapon.damage * (0.9 + Math.random() * 0.2));
    setMonsterHp((h) => Math.max(0, h - dmg));
    setFlash("hit");
    setTimeout(() => setFlash(null), 150);
  };

  const monsterPct = Math.round((monsterHp / monster.hp) * 100);
  const playerPct = Math.round(playerHp);

  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-background/85 backdrop-blur-md">
      <div className={`glass mx-4 w-full max-w-lg rounded-3xl p-5 shadow-card ${flash === "hurt" ? "ring-2 ring-coral" : ""}`}>
        <p className="text-center text-[10px] uppercase tracking-widest text-lagoon">Level {level} Monster</p>
        <h2 className="mt-1 text-center font-display text-2xl font-extrabold text-foam">{monster.name}</h2>

        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="text-center">
            <div className="text-5xl animate-[bounce_1.6s_ease-in-out_infinite]">{avatar.emoji}</div>
            <p className="mt-1 text-xs font-bold text-foam">{avatar.name}</p>
            <Bar pct={playerPct} color="from-lagoon to-foam" />
            <p className="mt-0.5 text-[10px] text-muted-foreground">{playerHp}/100 HP</p>
          </div>
          <div className="grid place-items-center text-sm font-black text-coral animate-pulse">VS</div>
          <div className={`text-center transition-transform duration-150 ${flash === "hit" ? "scale-125 -translate-x-1" : ""}`}>
            <div
              className={`text-5xl inline-block ${flash === "hit" ? "" : "animate-[wiggle_0.9s_ease-in-out_infinite]"}`}
              style={{ filter: flash === "hit" ? "brightness(1.6) saturate(1.6)" : "drop-shadow(0 4px 6px rgba(0,0,0,0.4))" }}
            >
              {monster.emoji}
            </div>
            <p className="mt-1 text-xs font-bold text-foam">{monster.name}</p>
            <Bar pct={monsterPct} color="from-coral to-sunset" />
            <p className="mt-0.5 text-[10px] text-muted-foreground">{monsterHp}/{monster.hp} HP</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-background/40 p-3 text-center">
          <p className="text-[10px] uppercase tracking-widest text-lagoon">Weapon</p>
          <p className="mt-0.5 font-display text-base font-extrabold text-foam">
            {weapon.icon} {weapon.name} · {weapon.damage} dmg
          </p>
        </div>

        <button
          onClick={attack}
          className="mt-4 flex w-full min-h-14 items-center justify-center gap-2 rounded-full bg-gradient-wave px-6 py-4 font-display text-base font-extrabold text-primary-foreground shadow-glow transition active:scale-95"
        >
          <Zap className="h-5 w-5" /> ATTACK ({weapon.damage} dmg)
        </button>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Tap to strike. Monster attacks every {monster.interval.toFixed(1)}s for {monster.damage} dmg.
        </p>
      </div>
    </div>
  );
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-background/50">
      <div className={`h-full bg-gradient-to-r ${color} transition-all`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

function MobileControls({
  onLeft, onRight, onJump, onSlide, onDash,
}: {
  onLeft: () => void;
  onRight: () => void;
  onJump: () => void;
  onSlide: () => void;
  onDash: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-2 p-3 lg:hidden">
      <div className="pointer-events-auto flex gap-2">
        <CtrlBtn onClick={onLeft} aria="Move left"><ArrowLeft className="h-6 w-6" /></CtrlBtn>
        <CtrlBtn onClick={onRight} aria="Move right"><ArrowRight className="h-6 w-6" /></CtrlBtn>
      </div>
      <div className="pointer-events-auto">
        <CtrlBtn onClick={onDash} aria="Dash" wide>
          <Zap className="h-5 w-5" /> Dash
        </CtrlBtn>
      </div>
      <div className="pointer-events-auto flex gap-2">
        <CtrlBtn onClick={onSlide} aria="Slide"><ArrowDown className="h-6 w-6" /></CtrlBtn>
        <CtrlBtn onClick={onJump} aria="Jump"><ArrowUp className="h-6 w-6" /></CtrlBtn>
      </div>
    </div>
  );
}

function CtrlBtn({
  onClick, aria, wide, children,
}: {
  onClick: () => void;
  aria: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={aria}
      onTouchStart={(e) => { e.preventDefault(); onClick(); }}
      onClick={onClick}
      className={`flex h-14 ${wide ? "px-5" : "w-14"} items-center justify-center gap-1.5 rounded-full bg-background/70 text-sm font-bold text-foam backdrop-blur active:scale-95`}
    >
      {children}
    </button>
  );
}
