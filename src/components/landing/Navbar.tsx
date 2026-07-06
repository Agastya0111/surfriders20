import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, Waves } from "lucide-react";

const links = [
  { href: "#story", label: "Story" },
  { href: "#features", label: "Features" },
  { href: "#worlds", label: "Worlds" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto mt-3 max-w-6xl px-4">
        <nav className="glass flex items-center justify-between rounded-full px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-wave shadow-glow">
              <Waves className="h-4 w-4 text-primary-foreground" />
            </span>
            <span className="text-gradient-wave">Surf Riders 2.0</span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="text-sm font-medium text-muted-foreground transition hover:text-foreground">
                {l.label}
              </a>
            ))}
          </div>
          <div className="hidden md:flex">
            <Link to="/auth" className="rounded-full bg-gradient-wave px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-105">
              Play Now
            </Link>
          </div>
          <button onClick={() => setOpen(!open)} className="md:hidden grid h-10 w-10 place-items-center rounded-full glass" aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
        {open && (
          <div className="glass mt-2 rounded-3xl p-4 md:hidden">
            <div className="flex flex-col gap-1">
              {links.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground">
                  {l.label}
                </a>
              ))}
              <Link to="/auth" onClick={() => setOpen(false)} className="mt-2 rounded-xl bg-gradient-wave px-4 py-3 text-center text-sm font-semibold text-primary-foreground">
                Play Now
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
