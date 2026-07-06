import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { AVATARS } from "@/game/avatars";
import { selectAvatar } from "@/lib/level.functions";
import { usePlayerProgress } from "@/hooks/use-player-progress";

export const Route = createFileRoute("/_authenticated/avatar-select")({
  head: () => ({ meta: [{ title: "Choose Avatar — Surf Riders 2.0" }] }),
  component: AvatarSelectPage,
});

function AvatarSelectPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: progress } = usePlayerProgress(user.id);
  const currentKey = (progress?.profile as { selected_avatar?: string } | undefined)?.selected_avatar ?? "kai";
  const selectFn = useServerFn(selectAvatar);

  const pick = useMutation({
    mutationFn: (avatarKey: string) => selectFn({ data: { avatarKey } }),
    onSuccess: async () => {
      toast.success("Avatar updated");
      await qc.invalidateQueries({ queryKey: ["player-progress", user.id] });
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10 bg-gradient-ocean opacity-40" />
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="flex items-center gap-3">
          <Link to="/dashboard" className="grid h-10 w-10 place-items-center rounded-full glass" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs uppercase tracking-widest text-lagoon">Choose your rider</p>
            <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Select Avatar</h1>
          </div>
        </header>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AVATARS.map((a) => {
            const active = a.key === currentKey;
            return (
              <button
                key={a.key}
                onClick={() => pick.mutate(a.key)}
                disabled={pick.isPending}
                className={`glass relative flex items-start gap-3 rounded-2xl p-4 text-left transition ${active ? "ring-2 ring-lagoon" : "hover:-translate-y-0.5"}`}
              >
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-4xl" style={{ background: `${a.color}22` }}>
                  {a.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-lg font-extrabold">{a.name}</p>
                    {active && <span className="rounded-full bg-lagoon/20 px-2 py-0.5 text-[10px] font-bold text-lagoon"><Check className="inline h-3 w-3" /> Selected</span>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
