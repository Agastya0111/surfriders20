import { Waves } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-border/50 bg-card/40">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 font-display text-lg font-extrabold">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-wave"><Waves className="h-4 w-4 text-primary-foreground" /></span>
              <span className="text-gradient-wave">Surf Riders 2.0</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Ride legendary waves across mythic ocean worlds. Built for mobile, designed for legends.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Game</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="#story" className="hover:text-foreground">Story</a></li>
              <li><a href="#features" className="hover:text-foreground">Features</a></li>
              <li><a href="#worlds" className="hover:text-foreground">Worlds</a></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Company</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Support</a></li>
              <li><a href="#" className="hover:text-foreground">Privacy</a></li>
              <li><a href="#" className="hover:text-foreground">Terms</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Surf Riders 2.0. Catch the wave.</p>
          <p>Made for the ocean.</p>
        </div>
      </div>
    </footer>
  );
}
