import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Droplet, Menu, AlertCircle, LogOut } from "lucide-react";
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

  const isRegularUser = !!user && (user.role === "DONOR" || user.role === "RECIPIENT");
  const isSysAdmin = user?.role === "SYSTEM_ADMIN";
  const isHospitalAdmin = user?.role === "HOSPITAL_ADMIN";

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
    <header className="sticky top-0 z-40 border-b border-border/60 bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]">
      <nav className="w-full max-w-7xl 2xl:max-w-[1500px] mx-auto flex items-center justify-between gap-x-3 lg:gap-x-6 flex-wrap md:flex-nowrap px-4 sm:px-6 lg:px-8 py-3">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold tracking-tight text-lg shrink-0">
          <div className="flex size-8 items-center justify-center rounded-lg bg-background text-primary shadow-sm">
            <Droplet className="size-5 fill-current" />
          </div>
          <span>LifeDrop</span>
        </Link>

        {/* Dynamic Desktop Navigation Links */}
        <div className="hidden items-center gap-x-2 xl:gap-x-4 lg:flex flex-wrap">
          {/* 1. GUEST Navigation (Not Logged In) — Logo already links to "/" */}
          {!user && (
            <>
              <a
                href="/#eligibility"
                className="rounded-md px-3 py-2 text-sm font-medium opacity-85 transition-colors hover:bg-primary-glow/40 hover:opacity-100"
              >
                Eligibility
              </a>
              <Link
                to="/centers"
                className={getLinkClass("/centers")}
              >
                Partner Blood Banks
              </Link>
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

          {/* 2. UNIFIED MEMBER Navigation (Dual Capability: Donor + Recipient) */}
          {isRegularUser && (
            <>
              <Link
                to="/donor"
                search={{ tab: "overview" }}
                className={getLinkClass("/donor", "overview", true)}
              >
                Donor Dashboard
              </Link>
              <Link
                to="/recipient"
                search={{ tab: "overview" }}
                className={getLinkClass("/recipient", "overview", true)}
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
                to="/events"
                className={getLinkClass("/events")}
              >
                Events
              </Link>
              <Link
                to="/centers"
                className={getLinkClass("/centers")}
              >
                Partner Blood Banks
              </Link>
            </>
          )}

          {/* 3. HOSPITAL_ADMIN Navigation */}
          {isHospitalAdmin && (
            <>
              <Link
                to="/hospital"
                className={getLinkClass("/hospital")}
              >
                Hospital Dashboard
              </Link>
              <Link
                to="/centers"
                className={getLinkClass("/centers")}
              >
                Partner Blood Banks
              </Link>
            </>
          )}

          {/* 4. SYSTEM_ADMIN Navigation */}
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
                to="/centers"
                className={getLinkClass("/centers")}
              >
                Partner Blood Banks
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
          {/* Donor Availability Toggle Switch for Unified Members */}
          {isRegularUser && (
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-primary-glow/60 bg-primary-glow/30 px-3 py-1 text-xs">
              <span className="font-medium">{isDonorAvailable ? "Available to Donate" : "Unavailable"}</span>
              <Switch
                checked={isDonorAvailable}
                onCheckedChange={handleAvailabilityToggle}
                disabled={toggleAvailabilityMutation.isPending}
                className="scale-75 data-[state=checked]:bg-emerald-500"
                aria-label="Toggle donor availability"
              />
            </div>
          )}

          {/* Emergency Request CTA button for Unified Members */}
          {isRegularUser && (
            <Link to="/request-blood" search={{ urgency: "EMERGENCY" }}>
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

          {isRegularUser && <NotificationHub />}

          {/* Unauthenticated Guest Actions: Login & Register buttons with High Contrast */}
          {!user ? (
            <div className="flex items-center gap-2">
              <AuthDialog
                defaultTab="login"
                trigger={
                  <button
                    type="button"
                    className="px-5 py-2 text-sm font-semibold text-white border border-white/40 rounded-full hover:bg-white hover:text-[#800000] focus:ring-2 focus:ring-white/50 transition-all duration-200"
                  >
                    Login
                  </button>
                }
              />
              <AuthDialog
                defaultTab="register"
                trigger={
                  <button
                    type="button"
                    className="px-5 py-2 text-sm font-semibold text-[#800000] bg-white rounded-full hover:bg-red-50 shadow-sm transition-all duration-200"
                  >
                    Register
                  </button>
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
                  {isRegularUser ? "Member" : "Admin"}
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
            className="flex size-9 items-center justify-center rounded-md border border-white/40 bg-white/10 text-white lg:hidden"
            aria-label="Toggle navigation menu"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Dropdown */}
      {open && (
        <div className="border-t border-border/40 bg-primary px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {/* Donor Mobile Switch */}
            {isRegularUser && (
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

            {/* Emergency Mobile CTA */}
            {isRegularUser && (
              <Link to="/request-blood" search={{ urgency: "EMERGENCY" }} onClick={() => setOpen(false)} className="mb-2">
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
                <Link
                  to="/centers"
                  onClick={() => setOpen(false)}
                  className={getMobileLinkClass("/centers")}
                >
                  Partner Blood Centers
                </Link>
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
            ) : isRegularUser ? (
              <>
                <Link
                  to="/donor"
                  search={{ tab: "overview" }}
                  onClick={() => setOpen(false)}
                  className={getMobileLinkClass("/donor", "overview", true)}
                >
                  Donor Dashboard
                </Link>
                <Link
                  to="/recipient"
                  search={{ tab: "overview" }}
                  onClick={() => setOpen(false)}
                  className={getMobileLinkClass("/recipient", "overview", true)}
                >
                  My Blood Requests
                </Link>
                <Link
                  to="/request-blood"
                  onClick={() => setOpen(false)}
                  className={getMobileLinkClass("/request-blood")}
                >
                  Create Blood Request
                </Link>
                <Link
                  to="/events"
                  onClick={() => setOpen(false)}
                  className={getMobileLinkClass("/events")}
                >
                  Events
                </Link>
                <Link
                  to="/centers"
                  onClick={() => setOpen(false)}
                  className={getMobileLinkClass("/centers")}
                >
                  Partner Blood Banks
                </Link>
              </>
            ) : isHospitalAdmin ? (
              <>
                <Link
                  to="/hospital"
                  onClick={() => setOpen(false)}
                  className={getMobileLinkClass("/hospital")}
                >
                  Hospital Dashboard
                </Link>
                <Link
                  to="/centers"
                  onClick={() => setOpen(false)}
                  className={getMobileLinkClass("/centers")}
                >
                  Partner Blood Banks
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
                  to="/centers"
                  onClick={() => setOpen(false)}
                  className={getMobileLinkClass("/centers")}
                >
                  Partner Blood Banks
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
                  <span className="truncate font-semibold max-w-[200px]">
                    {user.full_name}
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
