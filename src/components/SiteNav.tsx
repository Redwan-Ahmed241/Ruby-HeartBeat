import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Droplet, Menu, AlertCircle, LogOut, Building2, User } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { NotificationHub } from "@/components/NotificationHub";
import { AuthDialog } from "@/components/AuthDialog";
import { useCurrentUser, useLogout } from "@/hooks/useAuth";
import { useToggleAvailability } from "@/hooks/useDonor";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useLogout();
  const { data: user } = useCurrentUser();
  const toggleAvailabilityMutation = useToggleAvailability();

  const isDonor = user?.role === "DONOR";
  const isRecipient = user?.role === "RECIPIENT";
  const isHospitalAdmin = user?.role === "HOSPITAL_ADMIN";
  const isSysAdmin = user?.role === "SYSTEM_ADMIN";

  const isDonorAvailable = user?.donor?.availability_status === "AVAILABLE";

  const currentPath = location.pathname;
  const searchParams = (location.search as Record<string, string>) || {};
  const currentTab = searchParams["tab"];

  const isLinkActive = (path: string, tab?: string, isDefault?: boolean) => {
    if (currentPath !== path) return false;
    if (!tab) return true;
    if (currentTab === tab) return true;
    if (!currentTab && isDefault) return true;
    return false;
  };

  const getLinkClass = (path: string, tab?: string, isDefault?: boolean) =>
    cn(
      "rounded-md px-3 py-2 text-sm font-medium transition-colors",
      isLinkActive(path, tab, isDefault)
        ? "bg-primary-glow/60 opacity-100 font-semibold shadow-sm"
        : "opacity-85 hover:bg-primary-glow/40 hover:opacity-100",
    );

  const getMobileLinkClass = (path: string, tab?: string, isDefault?: boolean) =>
    cn(
      "rounded-md px-3 py-2 text-sm font-medium transition-colors",
      isLinkActive(path, tab, isDefault)
        ? "bg-primary-glow/60 opacity-100 font-semibold shadow-sm"
        : "opacity-90 hover:bg-primary-glow/40",
    );

  const handleAvailabilityToggle = (checked: boolean) => {
    toggleAvailabilityMutation.mutate({
      availability_status: checked ? "AVAILABLE" : "UNAVAILABLE",
    });
  };

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
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
        <div className="hidden items-center gap-2 md:flex">
          {/* 1. GUEST Navigation (Not Logged In) — Logo already links to "/" */}
          {!user && (
            <>
              <a
                href="/#eligibility"
                className="rounded-md px-3 py-2 text-sm font-medium opacity-85 transition-colors hover:bg-primary-glow/40 hover:opacity-100"
              >
                Eligibility
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
                className={getLinkClass("/donor", "overview", true)}
              >
                Dashboard
              </Link>
              <Link
                to="/donor"
                search={{ tab: "appointments" }}
                className={getLinkClass("/donor", "appointments")}
              >
                My Appointments
              </Link>
              <Link
                to="/donor"
                search={{ tab: "history" }}
                className={getLinkClass("/donor", "history")}
              >
                Donation History
              </Link>
              <Link
                to="/events"
                className={getLinkClass("/events")}
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
                className={getLinkClass("/recipient", "overview", true)}
              >
                Dashboard
              </Link>
              <Link
                to="/recipient"
                search={{ tab: "requests" }}
                className={getLinkClass("/recipient", "requests")}
              >
                My Requests
              </Link>
              <Link
                to="/request-blood"
                className={getLinkClass("/request-blood")}
              >
                Create Request
              </Link>
              <Link
                to="/recipient"
                search={{ tab: "requests" }}
                className={getLinkClass("/recipient", "requests")}
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
                className={getLinkClass("/hospital", "dashboard", true)}
              >
                Dashboard
              </Link>
              <Link
                to="/hospital"
                search={{ tab: "inventory" }}
                className={getLinkClass("/hospital", "inventory")}
              >
                Blood Inventory
              </Link>
              <Link
                to="/hospital"
                search={{ tab: "transactions" }}
                className={getLinkClass("/hospital", "transactions")}
              >
                Transactions
              </Link>
              <Link
                to="/hospital"
                search={{ tab: "appointments" }}
                className={getLinkClass("/hospital", "appointments")}
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
                className={getLinkClass("/admin")}
              >
                Dashboard
              </Link>
              <Link
                to="/admin/users"
                className={getLinkClass("/admin/users")}
              >
                Users
              </Link>
              <Link
                to="/admin/logs"
                className={getLinkClass("/admin/logs")}
              >
                Audit Logs
              </Link>
              <Link
                to="/admin/notices"
                className={getLinkClass("/admin/notices")}
              >
                Campaign Notices
              </Link>
            </>
          )}
        </div>

        {/* Right Actions Toolbar */}
        <div className="flex items-center gap-3">
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

          {(isDonor || isRecipient) && <NotificationHub />}

          {/* Unauthenticated Guest Actions: Login & Register buttons */}
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
            /* Authenticated User Actions: compact identity + logout */
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-primary-glow/60 bg-primary-glow/30 px-3 py-1.5 text-xs text-primary-foreground">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="font-semibold max-w-[120px] truncate">
                  {user.full_name.split(" ")[0]}
                </span>
                <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-medium tracking-wide shrink-0">
                  {isDonor ? "Donor" : isRecipient ? "Recipient" : isHospitalAdmin ? "Hospital" : "Admin"}
                </span>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleLogout}
                className="border-primary-glow/60 bg-primary-glow/20 text-xs font-semibold text-primary-foreground hover:bg-primary-glow/40 gap-1.5"
                title="Logout of current session"
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          )}

          {/* Mobile Navigation Trigger Button */}
          <button
            onClick={() => setOpen(!open)}
            className="flex size-9 items-center justify-center rounded-md border border-primary-glow/60 bg-primary-glow/20 md:hidden"
            aria-label="Toggle navigation menu"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Dropdown */}
      {open && (
        <div className="border-t border-border/40 bg-primary px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
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
              <Link to="/request-blood" onClick={() => setOpen(false)} className="mb-2">
                <Button size="sm" variant="destructive" className="w-full text-xs font-semibold">
                  <AlertCircle className="mr-1.5 size-3.5" />
                  Emergency Blood Request
                </Button>
              </Link>
            )}

            {!user ? (
              <>
                <a
                  href="/#eligibility"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium opacity-90 hover:bg-primary-glow/40"
                >
                  Eligibility
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
                  className={getMobileLinkClass("/donor", "overview", true)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/donor"
                  search={{ tab: "appointments" }}
                  onClick={() => setOpen(false)}
                  className={getMobileLinkClass("/donor", "appointments")}
                >
                  My Appointments
                </Link>
                <Link
                  to="/donor"
                  search={{ tab: "history" }}
                  onClick={() => setOpen(false)}
                  className={getMobileLinkClass("/donor", "history")}
                >
                  Donation History
                </Link>
                <Link
                  to="/events"
                  onClick={() => setOpen(false)}
                  className={getMobileLinkClass("/events")}
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
                  className={getMobileLinkClass("/recipient", "overview", true)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/recipient"
                  search={{ tab: "requests" }}
                  onClick={() => setOpen(false)}
                  className={getMobileLinkClass("/recipient", "requests")}
                >
                  My Requests
                </Link>
                <Link
                  to="/request-blood"
                  onClick={() => setOpen(false)}
                  className={getMobileLinkClass("/request-blood")}
                >
                  Create Request
                </Link>
                <Link
                  to="/recipient"
                  search={{ tab: "requests" }}
                  onClick={() => setOpen(false)}
                  className={getMobileLinkClass("/recipient", "requests")}
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
                  className={getMobileLinkClass("/hospital", "dashboard", true)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/hospital"
                  search={{ tab: "inventory" }}
                  onClick={() => setOpen(false)}
                  className={getMobileLinkClass("/hospital", "inventory")}
                >
                  Blood Inventory
                </Link>
                <Link
                  to="/hospital"
                  search={{ tab: "transactions" }}
                  onClick={() => setOpen(false)}
                  className={getMobileLinkClass("/hospital", "transactions")}
                >
                  Transactions
                </Link>
                <Link
                  to="/hospital"
                  search={{ tab: "appointments" }}
                  onClick={() => setOpen(false)}
                  className={getMobileLinkClass("/hospital", "appointments")}
                >
                  Appointments
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className={getMobileLinkClass("/admin")}
                >
                  Dashboard
                </Link>
                <Link
                  to="/admin/users"
                  onClick={() => setOpen(false)}
                  className={getMobileLinkClass("/admin/users")}
                >
                  Users
                </Link>
                <Link
                  to="/admin/logs"
                  onClick={() => setOpen(false)}
                  className={getMobileLinkClass("/admin/logs")}
                >
                  Audit Logs
                </Link>
                <Link
                  to="/admin/notices"
                  onClick={() => setOpen(false)}
                  className={getMobileLinkClass("/admin/notices")}
                >
                  Campaign Notices
                </Link>
              </>
            )}

            {/* Mobile Authenticated Identity & Logout */}
            {user && (
              <div className="mt-3 border-t border-primary-glow/40 pt-3 flex flex-col gap-2">
                <div className="flex items-center gap-2 px-2 text-xs font-medium">
                  <span className="size-2 rounded-full bg-emerald-400" />
                  <span className="truncate font-semibold">
                    {isHospitalAdmin
                      ? (user.hospital?.hospital_name || user.full_name)
                      : user.full_name}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    handleLogout();
                  }}
                  className="w-full border-primary-glow/60 bg-primary-glow/20 text-xs font-semibold text-primary-foreground hover:bg-primary-glow/40 gap-1.5"
                >
                  <LogOut className="size-3.5" />
                  <span>Logout</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
