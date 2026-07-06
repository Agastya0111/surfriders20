import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";
import { getPlayerProgress } from "@/lib/game-progress.functions";
import { updateSettings } from "@/lib/meta.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Surf Riders 2.0" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = Route.useRouteContext();
  const fetcher = useServerFn(getPlayerProgress);
  const updateFn = useServerFn(updateSettings);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["player-progress", user.id], queryFn: () => fetcher() });
  const s = data?.settings;

  const save = useMutation({
    mutationFn: (patch: Record<string, unknown>) => updateFn({ data: patch as never }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["player-progress", user.id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  function set(patch: Record<string, unknown>) { save.mutate(patch); }

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10 bg-gradient-ocean opacity-40" />
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="flex items-center justify-between gap-3">
          <Link to="/dashboard" className="grid h-10 w-10 place-items-center rounded-full glass"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="flex items-center gap-2"><SettingsIcon className="h-5 w-5 text-lagoon" /><h1 className="font-display text-xl font-extrabold sm:text-2xl">Settings</h1></div>
          <span className="w-10" />
        </header>

        {!s ? <p className="mt-12 text-center text-muted-foreground">Loading…</p> : (
          <div className="mt-6 space-y-6">
            <Section title="Audio">
              <Toggle label="Music" checked={s.music_enabled} onChange={(v) => set({ music_enabled: v })} />
              <Slider label="Music volume" value={s.music_volume} onChange={(v) => set({ music_volume: v })} />
              <Toggle label="Sound effects" checked={s.sound_enabled} onChange={(v) => set({ sound_enabled: v })} />
              <Slider label="SFX volume" value={s.sfx_volume} onChange={(v) => set({ sfx_volume: v })} />
            </Section>
            <Section title="Gameplay">
              <Select label="Graphics quality" value={s.graphics_quality} options={["low", "medium", "high"]} onChange={(v) => set({ graphics_quality: v })} />
              <Slider label="Touch sensitivity" min={0.3} max={2.5} step={0.1} value={s.touch_sensitivity} onChange={(v) => set({ touch_sensitivity: v })} />
              <Toggle label="Vibration" checked={s.vibration_enabled} onChange={(v) => set({ vibration_enabled: v })} />
            </Section>
            <Section title="Accessibility">
              <Toggle label="Reduce motion" checked={s.reduce_motion} onChange={(v) => set({ reduce_motion: v })} />
              <Toggle label="High contrast" checked={s.high_contrast} onChange={(v) => set({ high_contrast: v })} />
              <Toggle label="Large text" checked={s.large_text} onChange={(v) => set({ large_text: v })} />
              <Select label="Color-blind mode" value={s.color_blind_mode} options={["off", "protanopia", "deuteranopia", "tritanopia"]} onChange={(v) => set({ color_blind_mode: v })} />
            </Section>
            <Section title="Notifications">
              <Toggle label="Push notifications" checked={s.notifications_enabled} onChange={(v) => set({ notifications_enabled: v })} />
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-3xl p-5">
      <p className="mb-3 font-display text-lg font-extrabold">{title}</p>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl bg-background/40 p-3">
      <span className="text-sm font-medium">{label}</span>
      <button type="button" onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-gradient-wave" : "bg-secondary"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-foam transition ${checked ? "left-[1.4rem]" : "left-0.5"}`} />
      </button>
    </label>
  );
}

function Slider({ label, value, onChange, min = 0, max = 1, step = 0.05 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <label className="flex flex-col gap-2 rounded-2xl bg-background/40 p-3">
      <div className="flex items-center justify-between"><span className="text-sm font-medium">{label}</span><span className="text-xs text-muted-foreground tabular-nums">{value.toFixed(2)}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="accent-lagoon" />
    </label>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl bg-background/40 p-3">
      <span className="text-sm font-medium">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-full bg-background px-3 py-1.5 text-sm font-bold capitalize">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
