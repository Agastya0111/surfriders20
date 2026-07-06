import { createFileRoute, Link } from "@tanstack/react-router";
import { Waves, Sparkles, Gamepad2, Sword, ShieldCheck, Trophy, Play, ChevronRight } from "lucide-react";
import heroImg from "@/assets/hero-wave.jpg";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Surf Riders 2.0 — Level-Based Ocean Adventure" },
      { name: "description", content: "Surf across unlimited levels, collect silver, defeat sea monsters, and unlock legendary weapons. Play free in your browser." },
      { property: "og:title", content: "Surf Riders 2.0" },
      { property: "og:description", content: "A level-based ocean adventure. Surf, collect, battle, upgrade." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Gamepad2, title: "Unlimited Levels", desc: "Each level asks for 5,000 more silver than the last. Progress is saved to your account." },
  { icon: Sword, title: "Weapons & Battles", desc: "Buy stronger weapons with gold. Face a new monster at the end of every level." },
  { icon: Sparkles, title: "Choose Your Rider", desc: "Pick from six unique avatars, each with their own look and lore." },
  { icon: Trophy, title: "Global Leaderboards", desc: "Compare your best runs against riders around the world." },
  { icon: ShieldCheck, title: "Cloud Save", desc: "Your level, coins, avatar, and weapons sync to your account across devices." },
  { icon: Waves, title: "Landscape-First", desc: "Designed for landscape on mobile, tablet, and desktop with large touch controls." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden pt-28 pb-16 sm:pt-36">
        <div className="absolute inset-0 -z-10">
          <img src={heroImg} alt="Surfer riding a giant glowing wave at sunset" className="h-full w-full object-cover opacity-40" width={1920} height={1280} />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
        </div>

        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-coral animate-wave-pulse" />
            Level-based ocean adventure · Free to play
          </div>
          <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
            <span className="block">Surf. Collect.</span>
            <span className="block text-gradient-sunset">Defeat the tide.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Surf endless waves, collect silver coins to complete levels, then battle a sea monster with your chosen weapon. Every level makes the ocean wilder.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/auth" className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-wave px-8 py-4 text-base font-semibold text-primary-foreground shadow-glow transition hover:scale-105 sm:w-auto">
              <Play className="h-5 w-5 fill-current" />
              Play Now — Free
            </Link>
            <a href="#story" className="inline-flex w-full items-center justify-center gap-2 rounded-full glass px-8 py-4 text-base font-semibold text-foreground transition hover:scale-105 sm:w-auto">
              How it Works
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* STORY */}
      <section id="story" className="relative py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-lagoon">The Story</p>
              <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">
                The Pirate King stole the Seven Tide Crystals. <span className="text-gradient-wave">You take them back.</span>
              </h2>
              <p className="mt-6 text-muted-foreground">
                The Ocean Guardian has chosen a new rider. Each level, silver coins bank your progress, gold coins buy your next weapon, and a monster stands between you and the next tide.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Badge>Level-based</Badge>
                <Badge>Weapons</Badge>
                <Badge>Monster battles</Badge>
                <Badge>Cloud save</Badge>
              </div>
            </div>
            <div className="relative aspect-square overflow-hidden rounded-3xl border border-border bg-gradient-ocean shadow-card">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,oklch(0.78_0.16_200/0.3),transparent_60%)]" />
              <div className="absolute inset-0 flex items-end p-8">
                <div className="glass rounded-2xl p-5">
                  <div className="text-xs font-semibold uppercase tracking-widest text-lagoon">Level 1</div>
                  <div className="mt-1 font-display text-2xl font-extrabold">Collect 5,000 silver</div>
                  <p className="mt-2 text-sm text-muted-foreground">Ride the wave. Grab every coin. Beat the Rock Crab.</p>
                </div>
              </div>
              <Waves className="absolute -bottom-10 -right-10 h-64 w-64 text-lagoon/20 animate-float-slow" />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-lagoon">Features</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">
              Everything you need to <span className="text-gradient-sunset">climb the tide.</span>
            </h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="group glass rounded-3xl p-6 transition hover:-translate-y-1 hover:shadow-glow">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-wave shadow-glow">
                  <f.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="mt-5 font-display text-xl font-bold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="glass overflow-hidden rounded-3xl bg-gradient-ocean p-8 shadow-card sm:p-14">
            <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <h2 className="font-display text-3xl font-extrabold sm:text-4xl">Ready to paddle out?</h2>
                <p className="mt-3 text-muted-foreground">Create a free account. Pick your rider. Beat Level 1.</p>
              </div>
              <Link to="/auth" className="inline-flex items-center gap-2 rounded-full bg-gradient-wave px-8 py-4 text-base font-semibold text-primary-foreground shadow-glow transition hover:scale-105">
                <Play className="h-5 w-5 fill-current" />
                Start Riding Free
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">{children}</span>;
}
