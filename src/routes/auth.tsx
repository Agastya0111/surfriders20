import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Waves, Mail, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Surf Riders 2.0" }, { name: "description", content: "Sign in or create your Surf Riders 2.0 account." }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
});

// Only same-origin relative paths are allowed as a post-auth redirect target.
function safeNext(next: string | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const returnTo = safeNext(next);

  function goPostAuth() {
    if (returnTo) {
      window.location.href = returnTo;
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) goPostAuth();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        const emailRedirectTo = window.location.origin + (returnTo ?? "/dashboard");
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo },
        });
        if (error) throw error;
        toast.success("Account created. Paddling out...");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back, rider.");
      }
      goPostAuth();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-12">
      <div className="absolute inset-0 -z-10 bg-gradient-ocean opacity-50" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,oklch(0.78_0.16_200/0.25),transparent_60%)]" />

      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 font-display text-xl font-extrabold">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-wave shadow-glow">
            <Waves className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="text-gradient-wave">Surf Riders 2.0</span>
        </Link>

        <div className="glass rounded-3xl p-6 shadow-card sm:p-8">
          <div className="flex gap-1 rounded-full bg-secondary/60 p-1">
            <button onClick={() => setMode("signin")} className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${mode === "signin" ? "bg-gradient-wave text-primary-foreground shadow-glow" : "text-muted-foreground"}`}>
              Sign in
            </button>
            <button onClick={() => setMode("signup")} className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${mode === "signup" ? "bg-gradient-wave text-primary-foreground shadow-glow" : "text-muted-foreground"}`}>
              Create account
            </button>
          </div>

          <h1 className="mt-6 font-display text-2xl font-extrabold">
            {mode === "signin" ? "Welcome back" : "Start your ride"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to continue your story." : "Free forever. Your save syncs across devices."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field icon={Mail} type="email" placeholder="Email" value={email} onChange={setEmail} autoComplete="email" />
            <Field icon={Lock} type="password" placeholder="Password" value={password} onChange={setPassword} autoComplete={mode === "signup" ? "new-password" : "current-password"} />

            {mode === "signin" && (
              <div className="text-right">
                <Link to="/forgot-password" className="text-xs font-medium text-lagoon hover:text-foam">
                  Forgot password?
                </Link>
              </div>
            )}

            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-wave px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.02] disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to the wave.
        </p>
      </div>
    </div>
  );
}

function Field({ icon: Icon, type, placeholder, value, onChange, autoComplete }: { icon: React.ComponentType<{ className?: string }>; type: string; placeholder: string; value: string; onChange: (v: string) => void; autoComplete?: string }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        className="w-full rounded-2xl border border-border bg-input/50 py-3.5 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
      />
    </div>
  );
}
