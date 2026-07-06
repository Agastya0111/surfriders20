import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Coins, Gem, ShoppingBag, Check } from "lucide-react";
import { toast } from "sonner";
import { getShopCatalog, purchaseItem } from "@/lib/meta.functions";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/shop")({
  head: () => ({ meta: [{ title: "Shop — Surf Riders 2.0" }] }),
  component: ShopPage,
});

const TABS = [
  { key: "surfboard", label: "Surfboards" },
  { key: "character", label: "Characters" },
  { key: "pet", label: "Pets" },
  { key: "trail", label: "Trails" },
  { key: "upgrade", label: "Upgrades" },
] as const;
type TabKey = typeof TABS[number]["key"];

function ShopPage() {
  const fetcher = useServerFn(getShopCatalog);
  const buyFn = useServerFn(purchaseItem);
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>("surfboard");

  const { data, isLoading } = useQuery({ queryKey: ["shop"], queryFn: () => fetcher() });

  const buy = useMutation({
    mutationFn: (vars: { itemKey: string; kind: "item" | "surfboard" }) => buyFn({ data: vars }),
    onSuccess: () => {
      toast.success("Purchased!");
      qc.invalidateQueries({ queryKey: ["shop"] });
      qc.invalidateQueries({ queryKey: ["player-progress"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ownedItemKeys = new Set((data?.owned ?? []).map((o) => o.item_key));
  const ownedBoardKeys = new Set((data?.ownedSurfboards ?? []).map((o) => o.surfboard_key));

  const list =
    tab === "surfboard"
      ? (data?.surfboards ?? []).map((b) => ({
          key: b.key, name: b.name, description: b.description ?? "",
          price_coins: b.price_coins, price_gems: b.price_gems ?? 0,
          rarity: b.rarity ?? "common", owned: ownedBoardKeys.has(b.key), kind: "surfboard" as const,
        }))
      : (data?.items ?? []).filter((i) => i.category === tab).map((i) => ({
          key: i.key, name: i.name, description: i.description ?? "",
          price_coins: i.price_coins ?? 0, price_gems: i.price_gems ?? 0,
          rarity: i.rarity ?? "common", owned: ownedItemKeys.has(i.key), kind: "item" as const,
        }));


  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10 bg-gradient-ocean opacity-40" />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <Header coins={data?.profile?.coins ?? 0} gems={data?.profile?.gems ?? 0} />

        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${tab === t.key ? "bg-gradient-wave text-primary-foreground shadow-glow" : "glass text-foreground hover:scale-[1.02]"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="mt-12 text-center text-muted-foreground">Loading shop…</div>
        ) : list.length === 0 ? (
          <div className="mt-12 text-center text-muted-foreground">More items coming soon.</div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((it) => (
              <div key={it.key} className="glass rounded-2xl p-4 shadow-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-lagoon">{it.rarity}</p>
                    <p className="font-display text-lg font-extrabold">{it.name}</p>
                  </div>
                  {it.owned && <span className="rounded-full bg-lagoon/20 px-2 py-0.5 text-[10px] font-bold text-lagoon"><Check className="inline h-3 w-3" /> Owned</span>}
                </div>
                <p className="mt-2 min-h-[3em] text-xs text-muted-foreground">{it.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm font-bold">
                    {it.price_coins > 0 && <span className="flex items-center gap-1"><Coins className="h-4 w-4 text-sunset" />{it.price_coins}</span>}
                    {it.price_gems > 0 && <span className="flex items-center gap-1"><Gem className="h-4 w-4 text-lagoon" />{it.price_gems}</span>}
                  </div>
                  <button disabled={it.owned || buy.isPending}
                    onClick={() => buy.mutate({ itemKey: it.key, kind: it.kind })}
                    className="rounded-full bg-gradient-wave px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow transition hover:scale-[1.02] disabled:opacity-40">
                    {it.owned ? "Owned" : "Buy"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Header({ coins, gems }: { coins: number; gems: number }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <Link to="/dashboard" className="grid h-10 w-10 place-items-center rounded-full glass"><ArrowLeft className="h-5 w-5" /></Link>
      <div className="flex items-center gap-2">
        <ShoppingBag className="h-5 w-5 text-lagoon" />
        <h1 className="font-display text-xl font-extrabold sm:text-2xl">Shop</h1>
      </div>
      <div className="flex items-center gap-2 text-sm font-bold">
        <span className="flex items-center gap-1 rounded-full glass px-3 py-1.5"><Coins className="h-4 w-4 text-sunset" />{coins.toLocaleString()}</span>
        <span className="flex items-center gap-1 rounded-full glass px-3 py-1.5"><Gem className="h-4 w-4 text-lagoon" />{gems.toLocaleString()}</span>
      </div>
    </header>
  );
}
