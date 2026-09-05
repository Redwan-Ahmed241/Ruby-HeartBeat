import { Link } from "@tanstack/react-router";
import { Droplet, Menu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { NotificationHub } from "@/components/NotificationHub";

const tabs = [
  { to: "/find-donors", label: "Find Donors" },
  { to: "/request-blood", label: "Request Blood" },
  { to: "/inventory", label: "Blood Inventory" },
  { to: "/admin", label: "Admin Control" },
  { to: "/", label: "My Profile" },
] as const;

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Droplet className="size-5" />
          <span>LifeDrop</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              activeOptions={{ exact: t.to === "/" }}
              className="rounded-md px-3 py-2 text-sm font-medium opacity-80 transition-colors hover:bg-primary-glow/40 hover:opacity-100"
              activeProps={{ className: "bg-primary-glow/60 opacity-100" }}
            >
              {t.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <NotificationHub />
          <button
            aria-label="Toggle menu"
            onClick={() => setOpen((o) => !o)}
            className="rounded-md p-2 transition-colors hover:bg-primary-glow/40 md:hidden"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </nav>

      <div className={cn("border-t border-primary-glow/40 md:hidden", open ? "block" : "hidden")}>
        <div className="flex flex-col px-4 pb-3 pt-2">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              activeOptions={{ exact: t.to === "/" }}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium opacity-80"
              activeProps={{ className: "bg-primary-glow/60 opacity-100" }}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
