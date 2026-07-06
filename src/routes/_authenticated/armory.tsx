import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Coins, Check, Sword } from "lucide-react";
import { toast } from "sonner";
import { WEAPONS, RARITY_COLOR, getWeapon } from "@/game/weapons";
import { purchaseWeapon, equipWeapon } from "@/lib/level.functions";
import { useArmory } from "@/hooks/use-armory";

export const Route = createFileRoute("/_authenticated/armory")({
  head: () => ({ meta: [{ title: "Armory — Surf Riders 2.0" }] }),
  component: ArmoryPage,
});

function ArmoryPage() {
  const { user } = Route.useRouteContext();
  const { data } = useArmory(user.id);
  const qc = useQueryClient();
  const buyFn = useServerFn(purchaseWeapon);
  const equipFn = useServerFn(equipWeapon);

  const owned = new Set(data?.ownedWeapons ?? []);
  const gold = data?.profile?.gold_coins ?? 0;
  const equippedKey = data?.profile?.equipped_weapon ?? "wooden_sword";
  const equipped = getWeapon(equippedKey);

  const buy = useMutation({
    mutationFn: (weaponKey: string) => buyFn({ data: { weaponKey } }),
    onSuccess: () => {
      toast.success("Weapon purchased and equipped");
      qc.invalidateQueries({ queryKey: ["armory", user.id] });
      qc.invalidateQueries({ queryKey: ["player-progress", user.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const equip = useMutation({
    mutationFn: (weaponKey: string) => equipFn({ data: { weaponKey } }),
    onSuccess: () => {
      toast.success("Weapon equipped");
      qc.invalidateQueries({ queryKey: ["armory", user.id] });
      qc.invalidateQueries({ queryKey: ["player-progress", user.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10 bg-gradient-ocean opacity-40" />
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <Link to="/dashboard" className="grid h-10 w-10 place-items-center rounded-full glass" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-lagoon">Weapons</p>
            <h1 className="truncate font-display text-2xl font-extrabold sm:text-3xl">Armory</h1>
          </div>
          <span className="flex items-center gap-1.5 rounded-full glass px-3 py-1.5 text-sm font-bold">
            <Coins className="h-4 w-4 text-sunset" /> {gold.toLocaleString()}
          </span>
        </header>

        <div className="mt-4 glass flex items-center gap-3 rounded-2xl p-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-background/40 text-2xl">{equipped.icon}</div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-widest text-lagoon">Equipped</p>
            <p className="truncate font-display text-base font-extrabold">{equipped.name}</p>
          </div>
          <p className="shrink-0 text-xs font-bold text-foam">{equipped.damage} dmg · {equipped.speed.toFixed(1)}/s</p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {WEAPONS.map((w) => {
            const isOwned = owned.has(w.key);
            const isEquipped = w.key === equippedKey;
            const canAfford = gold >= w.cost;
            return (
              <div key={w.key} className="glass flex flex-col rounded-2xl p-4 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-[10px] uppercase tracking-widest ${RARITY_COLOR[w.rarity]}`}>{w.rarity}</p>
                    <p className="font-display text-lg font-extrabold">{w.icon} {w.name}</p>
                  </div>
                  {isEquipped && <span className="shrink-0 rounded-full bg-lagoon/20 px-2 py-0.5 text-[10px] font-bold text-lagoon"><Check className="inline h-3 w-3" /> Equipped</span>}
                </div>
                <p className="mt-1 min-h-[2.5em] text-xs text-muted-foreground">{w.description}</p>
                <div className="mt-2 grid grid-cols-2 gap-1 text-[11px]">
                  <span className="rounded-lg bg-background/40 px-2 py-1"><Sword className="mr-1 inline h-3 w-3 text-coral" />{w.damage} dmg</span>
                  <span className="rounded-lg bg-background/40 px-2 py-1">{w.speed.toFixed(1)} atk/s</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-sm font-bold">
                    <Coins className="h-4 w-4 text-sunset" />
                    {w.cost === 0 ? "Starter" : w.cost.toLocaleString()}
                  </span>
                  {isOwned ? (
                    <button
                      onClick={() => equip.mutate(w.key)}
                      disabled={isEquipped || equip.isPending}
                      className="rounded-full bg-secondary px-4 py-2 text-xs font-bold text-foreground transition hover:bg-secondary/80 disabled:opacity-40"
                    >
                      {isEquipped ? "Equipped" : "Equip"}
                    </button>
                  ) : (
                    <button
                      onClick={() => buy.mutate(w.key)}
                      disabled={!canAfford || buy.isPending}
                      className="rounded-full bg-gradient-wave px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow transition hover:scale-[1.02] disabled:opacity-40"
                    >
                      {canAfford ? "Buy" : "Need gold"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-2">
          <Link to="/play" className="flex-1 rounded-full bg-gradient-wave py-3 text-center font-bold text-primary-foreground shadow-glow">Back to Playing</Link>
          <Link to="/dashboard" className="flex-1 rounded-full glass py-3 text-center font-bold">Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
