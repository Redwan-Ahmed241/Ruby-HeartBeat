import { Link } from "@tanstack/react-router";
import { Droplet, Menu, AlertCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { NotificationHub } from "@/components/NotificationHub";
import { AuthDialog } from "@/components/AuthDialog";
import { useCurrentUser } from "@/hooks/useAuth";
import { useToggleAvailability } from "@/hooks/useDonor";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const toggleAvailabilityMutation = useToggleAvailability();

  const isDonor = user?.role === "DONOR";
  const isRecipient = user?.role === "RECIPIENT";
  const isHospitalAdmin = user?.role === "HOSPITAL_ADMIN";
  const isSysAdmin = user?.role === "SYSTEM_ADMIN";

  const isDonorAvailable = user?.donor?.availability_status === "AVAILABLE";

  const handleAvailabilityToggle = (checked: boolean) => {
    toggleAvailabilityMutation.mutate({
      availability_status: checked ? "AVAILABLE" : "UNAVAILABLE",
    });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold tracking-tight text-lg">
          <div className="flex size-8 items-center justify-center rounded-lg bg-background text-primary shadow-sm">
            <Droplet className="size-5 fill-current" />
          </div>
          <span>LifeDrop</span>
        </Link>

        {/* Dynamic Desktop Navigation Links */}
        <div className="hidden items-center gap-1 md:flex">
          {/* 1. GUEST Navigation (Not Logged In) */}
          {!user && (
            <>
              <Link
                to="/"
                activeOptions={{ exact: true }}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-85 transition-colors hover:bg-primary-glow/40 hover:opacity-100"
                activeProps={{ className: "bg-primary-glow/60 opacity-100 font-semibold" }}
              >
                Home
              </Link>
              <a
                href="/#eligibility"
                className="rounded-md px-3 py-2 text-sm font-medium opacity-85 transition-colors hover:bg-primary-glow/40 hover:opacity-100"
              >
                Eligibility Calculator
              </a>
              <a
                href="/#events"
                className="rounded-md px-3 py-2 text-sm font-medium opacity-85 transition-colors hover:bg-primary-glow/40 hover:opacity-100"
              >
                Campaigns
              </a>
              <a
                href="/#about"
                className="rounded-md px-3 py-2 text-sm font-medium opacity-85 transition-colors hover:bg-primary-glow/40 hover:opacity-100"
              >
                About
              </a>
            </>
          )}

          {/* 2. DONOR Navigation */}
          {isDonor && (
            <>
              <Link
                to="/donor"
                search={{ tab: "overview" }}
                activeOptions={{ exact: true }}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-85 transition-colors hover:bg-primary-glow/40 hover:opacity-100"
                activeProps={{ className: "bg-primary-glow/60 opacity-100 font-semibold" }}
              >
                Dashboard
              </Link>
              <Link
                to="/donor"
                search={{ tab: "appointments" }}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-85 transition-colors hover:bg-primary-glow/40 hover:opacity-100"
                activeProps={{ className: "bg-primary-glow/60 opacity-100 font-semibold" }}
              >
                My Appointments
              </Link>
              <Link
                to="/donor"
                search={{ tab: "history" }}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-85 transition-colors hover:bg-primary-glow/40 hover:opacity-100"
                activeProps={{ className: "bg-primary-glow/60 opacity-100 font-semibold" }}
              >
                Donation History
              </Link>
              <Link
                to="/events"
                className="rounded-md px-3 py-2 text-sm font-medium opacity-85 transition-colors hover:bg-primary-glow/40 hover:opacity-100"
                activeProps={{ className: "bg-primary-glow/60 opacity-100 font-semibold" }}
              >
                Events
              </Link>
            </>
          )}

          {/* 3. RECIPIENT Navigation */}
          {isRecipient && (
            <>
              <Link
                to="/recipient"
                search={{ tab: "overview" }}
                activeOptions={{ exact: true }}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-85 transition-colors hover:bg-primary-glow/40 hover:opacity-100"
                activeProps={{ className: "bg-primary-glow/60 opacity-100 font-semibold" }}
              >
                Dashboard
              </Link>
              <Link
                to="/requests/new"
                className="rounded-md px-3 py-2 text-sm font-medium opacity-85 transition-colors hover:bg-primary-glow/40 hover:opacity-100"
                activeProps={{ className: "bg-primary-glow/60 opacity-100 font-semibold" }}
              >
                Create Request
              </Link>
              <Link
                to="/recipient"
                search={{ tab: "requests" }}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-85 transition-colors hover:bg-primary-glow/40 hover:opacity-100"
                activeProps={{ className: "bg-primary-glow/60 opacity-100 font-semibold" }}
              >
                My Requests
              </Link>
            </>
          )}

          {/* 4. HOSPITAL_ADMIN Navigation */}
          {isHospitalAdmin && (
            <>
              <Link
                to="/hospital"
                search={{ tab: "dashboard" }}
                activeOptions={{ exact: true }}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-85 transition-colors hover:bg-primary-glow/40 hover:opacity-100"
                activeProps={{ className: "bg-primary-glow/60 opacity-100 font-semibold" }}
              >
                Dashboard
              </Link>
              <Link
                to="/hospital"
                search={{ tab: "inventory" }}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-85 transition-colors hover:bg-primary-glow/40 hover:opacity-100"
                activeProps={{ className: "bg-primary-glow/60 opacity-100 font-semibold" }}
              >
                Blood Inventory
              </Link>
              <Link
                to="/hospital"
                search={{ tab: "transactions" }}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-85 transition-colors hover:bg-primary-glow/40 hover:opacity-100"
                activeProps={{ className: "bg-primary-glow/60 opacity-100 font-semibold" }}
              >
                Transactions
              </Link>
              <Link
                to="/hospital"
                search={{ tab: "appointments" }}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-85 transition-colors hover:bg-primary-glow/40 hover:opacity-100"
                activeProps={{ className: "bg-primary-glow/60 opacity-100 font-semibold" }}
              >
                Appointments
              </Link>
            </>
          )}

          {/* 5. SYSTEM_ADMIN Navigation */}
          {isSysAdmin && (
            <>
              <Link
                to="/admin"
                activeOptions={{ exact: true }}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-85 transition-colors hover:bg-primary-glow/40 hover:opacity-100"
                activeProps={{ className: "bg-primary-glow/60 opacity-100 font-semibold" }}
              >
                Dashboard
              </Link>
              <Link
                to="/admin/users"
                className="rounded-md px-3 py-2 text-sm font-medium opacity-85 transition-colors hover:bg-primary-glow/40 hover:opacity-100"
                activeProps={{ className: "bg-primary-glow/60 opacity-100 font-semibold" }}
              >
                Users
              </Link>
              <Link
                to="/admin/logs"
                className="rounded-md px-3 py-2 text-sm font-medium opacity-85 transition-colors hover:bg-primary-glow/40 hover:opacity-100"
                activeProps={{ className: "bg-primary-glow/60 opacity-100 font-semibold" }}
              >
                Audit Logs
              </Link>
              <Link
                to="/admin/notices"
                className="rounded-md px-3 py-2 text-sm font-medium opacity-85 transition-colors hover:bg-primary-glow/40 hover:opacity-100"
                activeProps={{ className: "bg-primary-glow/60 opacity-100 font-semibold" }}
              >
                Campaign Notices
              </Link>
            </>
          )}
        </div>

        {/* Right Actions Toolbar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Donor Availability Toggle Switch */}
          {isDonor && (
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-primary-glow/60 bg-primary-glow/30 px-3 py-1 text-xs">
              <span className="font-medium">{isDonorAvailable ? "Available" : "Unavailable"}</span>
              <Switch
                checked={isDonorAvailable}
                onCheckedChange={handleAvailabilityToggle}
                disabled={toggleAvailabilityMutation.isPending}
                className="scale-75 data-[state=checked]:bg-emerald-500"
                aria-label="Toggle donor availability"
              />
            </div>
          )}

          {/* Recipient Emergency Request CTA button */}
          {isRecipient && (
            <Link to="/request-blood">
              <Button
                size="sm"
                variant="destructive"
                className="hidden sm:inline-flex items-center gap-1.5 shadow-sm text-xs font-semibold"
              >
                <AlertCircle className="size-3.5" />
                Emergency Request
              </Button>
            </Link>
          )}

          {/* Guest Actions: Login & Register buttons */}
          {!user ? (
            <div className="flex items-center gap-2">
              <AuthDialog
                defaultTab="login"
                trigger={
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-primary-glow/60 bg-primary-glow/20 text-xs font-semibold text-primary-foreground hover:bg-primary-glow/40"
                  >
                    Login
                  </Button>
                }
              />
              <AuthDialog
                defaultTab="register"
                defaultRole="DONOR"
                trigger={
                  <Button
                    size="sm"
                    className="bg-background text-primary hover:bg-background/90 text-xs font-bold shadow-sm"
                  >
                    Register
                  </Button>
                }
              />
            </div>
          ) : (
            <AuthDialog />
          )}

          {(isDonor || isRecipient) && <NotificationHub />}

          {/* Mobile hamburger toggle */}
          <button
            aria-label="Toggle menu"
            onClick={() => setOpen((o) => !o)}
            className="rounded-md p-2 transition-colors hover:bg-primary-glow/40 md:hidden"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Navigation */}
      <div className={cn("border-t border-primary-glow/40 md:hidden", open ? "block" : "hidden")}>
        <div className="flex flex-col px-4 pb-3 pt-2 space-y-1">
          {/* Donor Mobile Switch */}
          {isDonor && (
            <div className="flex items-center justify-between rounded-md bg-primary-glow/30 px-3 py-2 text-xs mb-2">
              <span className="font-semibold">
                Donor Status: {isDonorAvailable ? "Available to Donate" : "Unavailable"}
              </span>
              <Switch
                checked={isDonorAvailable}
                onCheckedChange={handleAvailabilityToggle}
                disabled={toggleAvailabilityMutation.isPending}
                className="scale-90 data-[state=checked]:bg-emerald-500"
              />
            </div>
          )}

          {/* Recipient Emergency Mobile CTA */}
          {isRecipient && (
            <Link to="/requests/emergency" onClick={() => setOpen(false)} className="mb-2">
              <Button size="sm" variant="destructive" className="w-full text-xs font-semibold">
                <AlertCircle className="mr-1.5 size-3.5" />
                Emergency Blood Request
              </Button>
            </Link>
          )}

          {!user ? (
            <>
              <Link
                to="/"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-90 hover:bg-primary-glow/40"
              >
                Home
              </Link>
              <a
                href="/#eligibility"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-90 hover:bg-primary-glow/40"
              >
                Eligibility Calculator
              </a>
              <a
                href="/#events"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-90 hover:bg-primary-glow/40"
              >
                Campaigns
              </a>
              <a
                href="/#about"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-90 hover:bg-primary-glow/40"
              >
                About
              </a>
            </>
          ) : isDonor ? (
            <>
              <Link
                to="/donor"
                search={{ tab: "overview" }}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-90 hover:bg-primary-glow/40"
              >
                Dashboard
              </Link>
              <Link
                to="/donor"
                search={{ tab: "appointments" }}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-90 hover:bg-primary-glow/40"
              >
                My Appointments
              </Link>
              <Link
                to="/donor"
                search={{ tab: "history" }}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-90 hover:bg-primary-glow/40"
              >
                Donation History
              </Link>
              <Link
                to="/events"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-90 hover:bg-primary-glow/40"
              >
                Events
              </Link>
            </>
          ) : isRecipient ? (
            <>
              <Link
                to="/recipient"
                search={{ tab: "overview" }}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-90 hover:bg-primary-glow/40"
              >
                Dashboard
              </Link>
              <Link
                to="/requests/new"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-90 hover:bg-primary-glow/40"
              >
                Create Request
              </Link>
              <Link
                to="/recipient"
                search={{ tab: "requests" }}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-90 hover:bg-primary-glow/40"
              >
                My Requests
              </Link>
            </>
          ) : isHospitalAdmin ? (
            <>
              <Link
                to="/hospital"
                search={{ tab: "dashboard" }}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-90 hover:bg-primary-glow/40"
              >
                Dashboard
              </Link>
              <Link
                to="/hospital"
                search={{ tab: "inventory" }}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-90 hover:bg-primary-glow/40"
              >
                Blood Inventory
              </Link>
              <Link
                to="/hospital"
                search={{ tab: "transactions" }}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-90 hover:bg-primary-glow/40"
              >
                Transactions
              </Link>
              <Link
                to="/hospital"
                search={{ tab: "appointments" }}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-90 hover:bg-primary-glow/40"
              >
                Appointments
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-90 hover:bg-primary-glow/40"
              >
                Dashboard
              </Link>
              <Link
                to="/admin/users"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-90 hover:bg-primary-glow/40"
              >
                Users
              </Link>
              <Link
                to="/admin/logs"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-90 hover:bg-primary-glow/40"
              >
                Audit Logs
              </Link>
              <Link
                to="/admin/notices"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium opacity-90 hover:bg-primary-glow/40"
              >
                Campaign Notices
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
