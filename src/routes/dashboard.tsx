import { createFileRoute, Link, useSearch, useNavigate } from "@tanstack/react-router";
import { useState, lazy, Suspense } from "react";
import {
  HeartPulse,
  Calendar,
  History,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Loader2,
  MapPin,
  Trophy,
  AlertCircle,
  PlusCircle,
  ClipboardList,
  Phone,
  Droplet,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Siren,
  ExternalLink,
  Flame,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AuthDialog } from "@/components/AuthDialog";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  useDonorEligibility,
  useDonorHistory,
  useToggleAvailability,
} from "@/hooks/useDonor";
import {
  useBloodRequests,
  useCompleteRequest,
  useReopenRequest,
  useCancelRequest,
  useConfirmMatchCompletion,
} from "@/hooks/useRequests";
import { formatBloodGroup } from "@/lib/formatters";
import { getDonorTier } from "@/lib/gamification";
import { TopDonorsLeaderboard } from "@/components/TopDonorsLeaderboard";
import { ActivityLedger } from "@/components/ActivityLedger";
import { formatExactWithRelative } from "@/lib/dateUtils";
import type { BloodRequestResponse } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const DonorMap = lazy(() => import("@/components/DonorMap"));

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search: Record<string, unknown>): { tab?: "donate" | "request" } => ({
    tab: search["tab"] === "request" ? "request" : "donate",
  }),
  head: () => ({
    meta: [
      { title: "Dashboard — LifeDrop" },
      {
        name: "description",
        content: "Unified blood donor and recipient management dashboard.",
      },
    ],
  }),
  component: UnifiedDashboardPage,
});

const URGENCY_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  EMERGENCY: "destructive",
  URGENT: "secondary",
  NORMAL: "outline",
};

export default function UnifiedDashboardPage() {
  const search = useSearch({ from: "/dashboard" });
  const navigate = useNavigate();
  const activeTab = search.tab === "request" ? "request" : "donate";

  const { data: user, isLoading: userLoading } = useCurrentUser();
  const toggleAvailabilityMutation = useToggleAvailability();
  const { data: eligibility, isLoading: eligLoading } = useDonorEligibility();
  const { data: historyItems, isLoading: historyLoading } = useDonorHistory();
  const { data: allRequests, isLoading: requestsLoading } = useBloodRequests();

  // Leaderboard dialog modal
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  // Map dialog modal
  const [selectedMapRequest, setSelectedMapRequest] = useState<BloodRequestResponse | null>(null);

  const handleTabChange = (newTab: "donate" | "request") => {
    navigate({
      to: "/dashboard",
      search: { tab: newTab },
      replace: true,
    });
  };

  const isAvailable = user?.donor?.availability_status === "AVAILABLE";

  const handleAvailabilityToggle = (checked: boolean) => {
    toggleAvailabilityMutation.mutate({
      availability_status: checked ? "AVAILABLE" : "UNAVAILABLE",
    });
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-background flex flex-col">
        <SiteNav />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-background flex flex-col">
        <SiteNav />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <Droplet className="size-16 text-primary mb-4 fill-current animate-pulse" />
          <h2 className="text-2xl font-bold mb-2">Sign in to Access Dashboard</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Access your unified donor and recipient dashboard to respond to urgent requests or manage your blood requests.
          </p>
          <AuthDialog />
        </div>
      </div>
    );
  }

  // Filter requests for Tab 1 (Open Urgent Requests to Donate)
  // Sort EMERGENCY first, then URGENT, then NORMAL
  const openDonateRequests = (allRequests || [])
    .filter((r) => r.status === "OPEN")
    .sort((a, b) => {
      const pA = a.urgency === "EMERGENCY" ? 1 : a.urgency === "URGENT" ? 2 : 3;
      const pB = b.urgency === "EMERGENCY" ? 1 : b.urgency === "URGENT" ? 2 : 3;
      if (pA !== pB) return pA - pB;
      return new Date(b.request_date || 0).getTime() - new Date(a.request_date || 0).getTime();
    });

  const emergencyCount = openDonateRequests.filter((r) => r.urgency === "EMERGENCY").length;

  // Filter requests for Tab 2 (User's Own Created Requests)
  const myRequests = (allRequests || []).filter(
    (r) => r.recipient_id === user.user_id
  );
  const myActiveRequests = myRequests.filter(
    (r) => r.status === "OPEN" || r.status === "ACCEPTED" || r.status === "PROCESSING"
  );

  // Donor Gamification calculation
  const donationCount = Math.max(user?.donor?.total_donations ?? 0, historyItems?.length ?? 0);
  const tierInfo = getDonorTier(donationCount);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background flex flex-col">
      <SiteNav />

      {/* Top Header & Two-Tab Segmented Switcher */}
      <div className="border-b border-border/80 bg-background/95 backdrop-blur-sm sticky top-14 z-30 shadow-xs">
        <div className="max-w-7xl 2xl:max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Welcome, {user.full_name}
                </h1>
                {user.nid_or_birth_cert && (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[11px] font-bold gap-1">
                    <ShieldCheck className="size-3.5" /> ID Verified
                  </Badge>
                )}
                {user.donor?.blood_group && (
                  <Badge variant="outline" className="border-primary/40 text-primary font-bold">
                    {formatBloodGroup(user.donor.blood_group, "symbol")}
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Unified LifeDrop Hub • Dual Donor & Recipient Capabilities
              </p>
            </div>

            {/* Segmented Control Switcher */}
            <div className="flex items-center gap-3">
              <div className="inline-flex rounded-xl p-1 bg-muted border border-border/60 shadow-xs">
                <button
                  type="button"
                  onClick={() => handleTabChange("donate")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer",
                    activeTab === "donate"
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Droplet className="size-4 fill-current text-primary" />
                  <span>Donate Blood</span>
                  {emergencyCount > 0 && (
                    <span className="flex size-2 rounded-full bg-red-600 animate-ping" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange("request")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer",
                    activeTab === "request"
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <PlusCircle className="size-4 text-primary" />
                  <span>Request Blood</span>
                  {myActiveRequests.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      {myActiveRequests.length}
                    </Badge>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl 2xl:max-w-[1500px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1">
        {activeTab === "donate" ? (
          /* ========================================================================= */
          /* TAB 1: DONATE BLOOD WORKSPACE                                             */
          /* ========================================================================= */
          <div className="space-y-8">
            {/* Top Cards: Eligibility & Gamification Tier */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Live Eligibility & Cooldown Status */}
              <Card className="shadow-xs border border-border/80 md:col-span-2">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <HeartPulse className="size-5 text-primary" />
                      Donor Status & Eligibility
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Live medical eligibility and automated cooldown tracking
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium">Availability:</span>
                    <Switch
                      checked={isAvailable}
                      onCheckedChange={handleAvailabilityToggle}
                      disabled={toggleAvailabilityMutation.isPending}
                    />
                    <Badge
                      variant={isAvailable ? "default" : "secondary"}
                      className={cn("text-[10px]", isAvailable && "bg-emerald-600 hover:bg-emerald-700")}
                    >
                      {isAvailable ? "AVAILABLE" : "UNAVAILABLE"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {eligLoading ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                      <Loader2 className="size-4 animate-spin" /> Checking eligibility...
                    </div>
                  ) : eligibility?.cooldown_active ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                          <Clock className="size-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-amber-700 dark:text-amber-300">
                              Cooldown Active (90-Day Rest Period)
                            </h4>
                            <Badge className="bg-amber-600 text-white text-[10px]">COOLDOWN</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Thank you for donating! Next eligible date:{" "}
                            <strong className="text-foreground font-semibold">
                              {eligibility.next_eligible_date ?? "Within 90 days"}
                            </strong>
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-amber-500/40 text-amber-600 shrink-0 text-xs">
                        Resting
                      </Badge>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                          <CheckCircle2 className="size-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                              Eligible & Ready to Save Lives
                            </h4>
                            <Badge className="bg-emerald-600 text-white text-[10px]">ACTIVE DONOR</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            You meet all health criteria. Turn availability on to receive urgent donor match notifications.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs border-emerald-600/30 text-emerald-700 dark:text-emerald-300">
                          Weight: {user.donor?.weight ?? 65}kg
                        </Badge>
                        <Badge variant="outline" className="text-xs border-emerald-600/30 text-emerald-700 dark:text-emerald-300">
                          Hb: {user.donor?.medical_info?.hemoglobin_level ?? 14.2} g/dL
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Health Profile Pill Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                    <div className="rounded-lg bg-muted/60 p-2.5">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Blood Group</span>
                      <p className="text-sm font-bold text-primary mt-0.5">
                        {formatBloodGroup(user.donor?.blood_group ?? "O_POSITIVE", "symbol")}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/60 p-2.5">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Location Zone</span>
                      <p className="text-xs font-semibold text-foreground truncate mt-0.5">
                        {user.donor?.address ? user.donor.address.split(",")[0] : "Dhaka Central"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/60 p-2.5">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Total Donations</span>
                      <p className="text-sm font-bold text-foreground mt-0.5">{donationCount} verified</p>
                    </div>
                    <div className="rounded-lg bg-muted/60 p-2.5">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Last Donated</span>
                      <p className="text-xs font-semibold text-foreground truncate mt-0.5">
                        {user.donor?.last_donation_date ?? "None recorded"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Level & Ranking Progression */}
              <Card className="shadow-xs border border-border/80 flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Trophy className="size-5 text-amber-500" />
                      Donor Ranking Tier
                    </CardTitle>
                    <span className="text-2xl">{tierInfo.icon}</span>
                  </div>
                  <CardDescription className="text-xs">
                    Standardized LifeDrop Honor Program
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-foreground text-lg flex items-center gap-1.5">
                        <span>{tierInfo.name}</span>
                        <span className="text-xs font-normal text-muted-foreground">Tier</span>
                      </span>
                      <Badge variant="outline" className="text-xs font-semibold">
                        {donationCount} {donationCount === 1 ? "Donation" : "Donations"}
                      </Badge>
                    </div>

                    {/* Progress to next tier */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>{tierInfo.name}</span>
                        <span>{tierInfo.nextTierThreshold ? `Next: ${tierInfo.nextTierThreshold} donations` : "Max Honor"}</span>
                      </div>
                      <Progress
                        value={tierInfo.progressPercent}
                        className="h-2"
                      />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-semibold mt-2"
                    onClick={() => setLeaderboardOpen(true)}
                  >
                    <Trophy className="size-3.5 text-amber-500 mr-1.5" />
                    View Top Donors Leaderboard
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Pinned Urgent & Emergency Blood Requests Feed */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                    <Siren className="size-5 text-red-600 animate-pulse" />
                    Urgent & Emergency Blood Requests
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Real-time network feed. Emergency requests are pinned at the top with direct response links.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {openDonateRequests.length} Open Requests
                  </Badge>
                  {emergencyCount > 0 && (
                    <Badge variant="destructive" className="text-xs animate-pulse">
                      {emergencyCount} CRITICAL EMERGENCY
                    </Badge>
                  )}
                </div>
              </div>

              {requestsLoading ? (
                <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="size-5 animate-spin text-primary" /> Loading requests...
                </div>
              ) : openDonateRequests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <Droplet className="size-10 text-muted-foreground/50 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-foreground">No Open Requests at This Moment</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    All current blood requests have been fulfilled! Keep your availability switch on to receive alerts when emergency requests arrive.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {openDonateRequests.map((req) => {
                    const isEmergency = req.urgency === "EMERGENCY";
                    const isUrgent = req.urgency === "URGENT";

                    return (
                      <div
                        key={req.request_id}
                        className={cn(
                          "relative rounded-xl border p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all duration-200 bg-card shadow-xs",
                          isEmergency
                            ? "border-red-500/80 shadow-red-500/10 shadow-md ring-1 ring-red-500/30 dark:bg-red-950/10"
                            : isUrgent
                            ? "border-amber-500/50 dark:bg-amber-950/10"
                            : "border-border hover:border-primary/40"
                        )}
                      >
                        {/* Emergency Pinned Banner */}
                        {isEmergency && (
                          <div className="absolute -top-3 left-4 inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                            <Flame className="size-3 fill-current animate-bounce" /> PINNED CRITICAL
                          </div>
                        )}

                        <div className="space-y-3 pt-1">
                          {/* Top Row: Blood Group & Urgency Badge */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-black text-primary">
                                {formatBloodGroup(req.blood_group, "symbol")}
                              </span>
                              <Badge variant="outline" className="text-[10px]">
                                {req.component_type.replace("_", " ")}
                              </Badge>
                            </div>
                            <Badge
                              variant={URGENCY_VARIANT[req.urgency] ?? "outline"}
                              className={cn(
                                "text-[10px] uppercase font-bold",
                                isEmergency && "animate-pulse"
                              )}
                            >
                              {req.urgency}
                            </Badge>
                          </div>

                          {/* Hospital & Location */}
                          <div className="space-y-1.5 text-xs text-muted-foreground">
                            <div className="flex items-start gap-1.5">
                              <MapPin className="size-3.5 text-primary shrink-0 mt-0.5" />
                              <span className="font-semibold text-foreground leading-tight">
                                {req.hospital_name || req.required_location}
                              </span>
                            </div>
                            <p className="text-[11px] pl-5">{req.area_zone || "Dhaka Zone"}</p>
                            <p className="text-[11px] pl-5">
                              Units needed: <strong className="text-foreground">{req.quantity} bag(s)</strong> (
                              {req.volume_ml ?? Number(req.quantity) * 450} mL)
                            </p>
                            <p className="text-[11px] pl-5 text-muted-foreground flex items-center gap-1">
                              <Clock className="size-3 text-muted-foreground shrink-0" />
                              <span>Posted: <strong className="text-foreground">{formatExactWithRelative(req.request_date)}</strong></span>
                            </p>
                          </div>

                          {/* Direct Public Call action if is_contact_public is true */}
                          {req.is_contact_public && req.attendant_phone_number && !req.attendant_phone_number.includes("*") && (
                            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/40 p-2 flex items-center justify-between gap-2">
                              <span className="font-mono text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-1">
                                <Phone className="size-3 text-emerald-600" />
                                {req.attendant_phone_number}
                              </span>
                              <a href={`tel:${req.attendant_phone_number}`}>
                                <Button size="sm" className="h-6 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2">
                                  Call Directly
                                </Button>
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Direct Response CTA */}
                        <div className="pt-2 border-t border-border/60">
                          <Link
                            to="/request/$requestId"
                            params={{ requestId: req.request_id }}
                            className={cn(
                              "w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors shadow-xs",
                              isEmergency
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : "bg-primary hover:bg-primary/90 text-primary-foreground"
                            )}
                          >
                            <span>Respond & View Landing</span>
                            <ChevronRight className="size-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Unified Activity & Donation Ledger (Task 2) */}
            <div className="pt-4 border-t border-border">
              <ActivityLedger defaultTab="donated" />
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* TAB 2: REQUEST BLOOD WORKSPACE                                            */
          /* ========================================================================= */
          <div className="space-y-8">
            {/* Quick Action CTA Banner */}
            <div className="rounded-2xl border border-primary/20 bg-linear-to-r from-primary/10 via-background to-primary/5 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground text-[10px]">RECIPIENT PORTAL</Badge>
                  <h2 className="text-lg sm:text-xl font-bold text-foreground">Need Blood for a Patient?</h2>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
                  Post an urgent or standard blood request. The Intelligent Matching Engine will immediately alert eligible, nearby donors with zero delay.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link
                  to="/request-blood"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                >
                  <PlusCircle className="size-4" />
                  <span>Create Blood Request</span>
                </Link>
              </div>
            </div>

            {/* My Requests Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
                    <ClipboardList className="size-5 text-primary" />
                    My Created Blood Requests
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Manage active requests, contact accepted donors, or re-open search.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {myRequests.length} Total Request(s)
                </Badge>
              </div>

              {requestsLoading ? (
                <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="size-5 animate-spin text-primary" /> Loading your requests...
                </div>
              ) : myRequests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <ClipboardList className="size-10 text-muted-foreground/50 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-foreground">No Blood Requests Created Yet</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto mb-4">
                    If you or a family member requires blood transfusion, click below to launch a request.
                  </p>
                  <Link
                    to="/request-blood"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <PlusCircle className="size-4" />
                    <span>Create Request Now</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {myRequests.map((req) => (
                    <DashboardRequestRow
                      key={req.request_id}
                      req={req}
                      onViewMap={(request) => setSelectedMapRequest(request)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Expanded Activity & Request Ledger (Task 2) */}
            <div className="pt-4 border-t border-border">
              <ActivityLedger defaultTab="received" />
            </div>
          </div>
        )}
      </main>

      {/* Modal 1: Top Donors Leaderboard Dialog */}
      <Dialog open={leaderboardOpen} onOpenChange={setLeaderboardOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Trophy className="size-5 text-amber-500" />
              LifeDrop Top Donors Leaderboard
            </DialogTitle>
            <DialogDescription className="text-xs">
              Recognizing verified life-savers across Bangladesh
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <TopDonorsLeaderboard limit={20} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Hospital & Donor Leaflet Map Dialog */}
      {selectedMapRequest && (
        <Dialog open={!!selectedMapRequest} onOpenChange={(open) => !open && setSelectedMapRequest(null)}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                Hospital & Donor Approximate Location
              </DialogTitle>
              <DialogDescription className="text-xs">
                {selectedMapRequest.hospital_name || selectedMapRequest.required_location} • {selectedMapRequest.area_zone}
              </DialogDescription>
            </DialogHeader>
            <div className="h-[350px] w-full rounded-lg overflow-hidden border border-border">
              <Suspense
                fallback={
                  <div className="h-full w-full flex items-center justify-center bg-muted">
                    <Loader2 className="size-6 animate-spin text-primary" />
                  </div>
                }
              >
                {(() => {
                  const acceptedMatch = selectedMapRequest.accepted_donor_id && selectedMapRequest.matches
                    ? selectedMapRequest.matches.find((m) => m.donor_id === selectedMapRequest.accepted_donor_id)
                    : undefined;

                  const donorLoc = acceptedMatch
                    ? {
                        lat: acceptedMatch.approx_latitude ?? (selectedMapRequest.latitude + 0.015),
                        lng: acceptedMatch.approx_longitude ?? (selectedMapRequest.longitude + 0.015),
                        label: selectedMapRequest.accepted_donor?.full_name || acceptedMatch.donor_name_initial,
                        bloodGroup: acceptedMatch.blood_group,
                        isApproximate: true,
                      }
                    : undefined;

                  return (
                    <DonorMap
                      hospitalLocation={{
                        lat: selectedMapRequest.latitude,
                        lng: selectedMapRequest.longitude,
                        name: selectedMapRequest.hospital_name || selectedMapRequest.required_location,
                        area: selectedMapRequest.area_zone,
                      }}
                      donorLocation={donorLoc}
                      radiusKm={10}
                    />
                  );
                })()}
              </Suspense>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/**
 * Individual Request Card inside Tab 2 [Request Blood]
 */
function DashboardRequestRow({
  req,
  onViewMap,
}: {
  req: BloodRequestResponse;
  onViewMap: (r: BloodRequestResponse) => void;
}) {
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");

  const completeMutation = useCompleteRequest();
  const reopenMutation = useReopenRequest();
  const cancelMutation = useCancelRequest();
  const confirmMatchMutation = useConfirmMatchCompletion();

  const activeMatch = req.matches?.find(
    (m) => m.donor_id === req.accepted_donor_id || m.response_status === "ACCEPTED"
  );

  const handleCompleteConfirm = async () => {
    try {
      if (activeMatch) {
        await confirmMatchMutation.mutateAsync(activeMatch.match_id);
      } else {
        await completeMutation.mutateAsync(req.request_id);
      }
      setCompleteDialogOpen(false);
    } catch {
      // Toast handled by mutation
    }
  };

  const handleCancelConfirm = async () => {
    try {
      await cancelMutation.mutateAsync(req.request_id);
      setCancelDialogOpen(false);
    } catch {
      // Toast handled by mutation
    }
  };

  const handleReopenConfirm = async () => {
    try {
      await reopenMutation.mutateAsync({
        requestId: req.request_id,
        reason: reopenReason || undefined,
      });
      setReopenDialogOpen(false);
      setReopenReason("");
    } catch {
      // Toast handled by mutation
    }
  };

  const renderStatusBadge = () => {
    switch (req.status) {
      case "OPEN":
        return <Badge className="bg-blue-600 text-white text-[10px]">OPEN</Badge>;
      case "ACCEPTED":
        return <Badge className="bg-emerald-600 text-white text-[10px]">ACCEPTED</Badge>;
      case "PROCESSING":
        return <Badge className="bg-amber-600 text-white text-[10px]">PROCESSING</Badge>;
      case "COMPLETED":
        return <Badge className="bg-purple-600 text-white text-[10px]">COMPLETED</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive" className="text-[10px]">CANCELLED</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{req.status}</Badge>;
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs flex flex-col gap-3">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-primary">
              {formatBloodGroup(req.blood_group, "symbol")}
            </span>
            <Badge variant={URGENCY_VARIANT[req.urgency] ?? "outline"} className="text-[10px]">
              {req.urgency}
            </Badge>
            {renderStatusBadge()}
          </div>
          <p className="text-xs text-muted-foreground">
            Hospital: <strong className="text-foreground">{req.hospital_name || req.required_location}</strong> •{" "}
            {req.area_zone} • {req.quantity} unit(s) ({req.volume_ml ?? Number(req.quantity) * 450} mL)
          </p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Clock className="size-3 text-muted-foreground shrink-0" />
            <span>Posted: <strong className="text-foreground">{formatExactWithRelative(req.request_date)}</strong></span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-semibold cursor-pointer"
            onClick={() => onViewMap(req)}
          >
            <MapPin className="size-3.5 text-primary mr-1" /> View Map
          </Button>

          <Link
            to="/request/$requestId"
            params={{ requestId: req.request_id }}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors"
          >
            <span>Landing Page</span>
            <ExternalLink className="size-3 text-muted-foreground" />
          </Link>
        </div>
      </div>

      {/* Special State 1: Request is ACCEPTED by a Donor */}
      {req.status === "ACCEPTED" && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-500/20 text-emerald-600 shrink-0">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-200">
                  Donor Accepted! Call them to coordinate donation.
                </h4>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                  {req.accepted_donor ? (
                    <>
                      <strong>{req.accepted_donor.full_name}</strong> from{" "}
                      {req.accepted_donor.area_zone || "Nearby"} • Contact:{" "}
                      <strong className="underline">{req.accepted_donor.phone}</strong>
                    </>
                  ) : (
                    "Volunteer donor matched and verified."
                  )}
                </p>
              </div>
            </div>

            {req.accepted_donor?.phone && (
              <a
                href={`tel:${req.accepted_donor.phone}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors shrink-0"
              >
                <Phone className="size-3.5" /> Call Donor
              </a>
            )}
          </div>

          {/* Mutual Completion Status details (Part 2.2) */}
          {activeMatch && (
            <div className="rounded-lg bg-background/80 border border-emerald-500/30 p-2.5 text-xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="font-medium">Mutual Verification Status:</span>
                <span className="font-semibold text-foreground">
                  {activeMatch.donor_confirmed_completion && activeMatch.recipient_confirmed_completion
                    ? "Both Parties Confirmed"
                    : activeMatch.recipient_confirmed_completion
                    ? "Waiting for Donor confirmation..."
                    : activeMatch.donor_confirmed_completion
                    ? "Donor Confirmed! Awaiting your confirmation."
                    : "Pending completion confirmation"}
                </span>
              </div>
            </div>
          )}

          {/* Action buttons: Complete Donation (Phase 6) & Re-Open (Phase 8) */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-500/20">
            <Button
              size="sm"
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
              disabled={activeMatch?.recipient_confirmed_completion || confirmMatchMutation.isPending || completeMutation.isPending}
              onClick={() => setCompleteDialogOpen(true)}
            >
              <CheckCircle2 className="size-3.5 mr-1" />
              {activeMatch?.recipient_confirmed_completion
                ? "Waiting for Donor Confirmation..."
                : "Confirm Donation Completed"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="text-xs text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
              onClick={() => setReopenDialogOpen(true)}
            >
              <RotateCcw className="size-3.5 mr-1" />
              Cancel Match & Re-Open Search
            </Button>
          </div>
        </div>
      )}

      {/* Special State 2: Request is OPEN and looking for donors */}
      {req.status === "OPEN" && (
        <div className="rounded-lg bg-muted/40 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-blue-500 animate-ping" />
            <span>Search Active — Intelligent Matching Engine alerting nearby candidates.</span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 font-semibold cursor-pointer"
              onClick={() => setCancelDialogOpen(true)}
            >
              Cancel Request
            </Button>
            <Link
              to="/request/$requestId"
              params={{ requestId: req.request_id }}
              className="font-semibold text-primary hover:underline ml-1"
            >
              Direct Emergency Link →
            </Link>
          </div>
        </div>
      )}

      {/* Special State 3: Completed Banner */}
      {req.status === "COMPLETED" && (
        <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-3 text-xs text-purple-950 dark:text-purple-100 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-purple-600 shrink-0" />
            <span className="font-medium">
              Donation verified & completed! Donor credited and placed on mandatory 90-day recovery cooldown.
            </span>
          </div>
          <Badge className="bg-purple-600 text-white text-[10px]">Fulfilled</Badge>
        </div>
      )}

      {/* Special State 4: Cancelled Banner */}
      {req.status === "CANCELLED" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-muted-foreground flex items-center justify-between gap-2">
          <span>Search cancelled by recipient. Donors are no longer alerted.</span>
          <Badge variant="destructive" className="text-[10px]">CANCELLED</Badge>
        </div>
      )}

      {/* Confirm Completed Donation Modal (Phase 6) */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              Confirm Blood Donation Completion
            </DialogTitle>
            <DialogDescription className="text-xs">
              This marks the request as COMPLETED, officially credits the donor&apos;s verified donation history, and starts their 90-day medical recovery cooldown.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setCompleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              onClick={handleCompleteConfirm}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Confirm Completion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel & Re-Open Modal (Phase 8) */}
      <Dialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <RotateCcw className="size-5" />
              Cancel Match & Re-Open Blood Search?
            </DialogTitle>
            <DialogDescription className="text-xs">
              The matched donor will be released with <strong>zero penalty</strong> (no cooldown applied). The request will instantly return to <strong>OPEN</strong> status on the urgent feed for other donors to accept.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-xs font-semibold text-foreground">Cancellation Reason (Optional):</label>
            <input
              type="text"
              placeholder="e.g. Donor unable to arrive in time, patient needed blood sooner"
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setReopenDialogOpen(false)}>
              Keep Match
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleReopenConfirm}
              disabled={reopenMutation.isPending}
            >
              {reopenMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Cancel Match & Re-Open"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Request Confirmation Modal (Part 1.3) */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <AlertCircle className="size-5" />
              Cancel Blood Request Search?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to cancel this search? Donors will stop receiving alerts.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-muted-foreground">
            Cancelling this search will immediately release all pending donor matches, stop broadcast alerts, and free up your daily patient request quota.
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setCancelDialogOpen(false)}>
              Keep Search Active
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancelConfirm}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Confirm Cancel Search"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
