import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Loader2, Waves } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "New password — Surf Riders 2.0" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. Welcome back.");
      navigate({ to: "/dashboard", replace: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-12">
      <div className="absolute inset-0 -z-10 bg-gradient-ocean opacity-50" />
      <div className="w-full max-w-md">
        <div className="glass rounded-3xl p-6 shadow-card sm:p-8">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-wave shadow-glow">
            <Waves className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-extrabold">Set a new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choose something only you would know.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" autoComplete="new-password" className="w-full rounded-2xl border border-border bg-input/50 py-3.5 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40" />
            </div>
            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-wave px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.02] disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
