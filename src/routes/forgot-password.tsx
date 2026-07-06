import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Waves, Mail, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — Surf Riders 2.0" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.string().trim().email().max(255).safeParse(email);
    if (!parsed.success) { toast.error("Invalid email"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) throw error;
      setSent(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-12">
      <div className="absolute inset-0 -z-10 bg-gradient-ocean opacity-50" />
      <div className="w-full max-w-md">
        <Link to="/auth" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
        <div className="glass rounded-3xl p-6 shadow-card sm:p-8">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-wave shadow-glow">
            <Waves className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-extrabold">Forgot your password?</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email and we'll send you a link to reset it.
          </p>

          {sent ? (
            <div className="mt-6 rounded-2xl border border-border bg-secondary/40 p-4 text-sm text-foreground">
              Check your inbox at <span className="font-semibold">{email}</span> for a reset link.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-2xl border border-border bg-input/50 py-3.5 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40" />
              </div>
              <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-wave px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.02] disabled:opacity-60">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Send reset link
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
