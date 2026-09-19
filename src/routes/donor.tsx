import { createFileRoute, Link, useSearch, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  HeartPulse,
  Calendar,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Loader2,
  Save,
  MapPin,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  useUpdateDonorProfile,
  useUpsertMedicalInfo,
} from "@/hooks/useDonor";
import {
  toDisplayBloodGroup,
  CANONICAL_BLOOD_GROUPS,
} from "@/lib/api/types";
import { formatBloodGroup } from "@/lib/formatters";
import { toast } from "sonner";
import { useDonorHistory } from "@/hooks/useDonor";
import { useMyRegisteredEvents } from "@/hooks/useAdmin";
import { HOSPITALS } from "@/lib/donor-data";
import { getDonorTier } from "@/lib/gamification";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/donor")({
  validateSearch: (search: Record<string, unknown>): { tab?: "overview" | "history" } => ({
    tab: search["tab"] === "history" ? "history" : "overview",
  }),
  head: () => ({
    meta: [
      { title: "Donor Dashboard — LifeDrop" },
      {
        name: "description",
        content: "Manage donor availability, eligibility, and donation history.",
      },
    ],
  }),
  component: DonorDashboardPage,
});

const UI_GROUPS = CANONICAL_BLOOD_GROUPS;

function DonorDashboardPage() {
  const search = useSearch({ from: "/donor" });
  const navigate = useNavigate();
  const activeTab = search["tab"] === "history" ? "history" : "overview";

  const handleTabChange = (newTab: string) => {
    navigate({
      to: "/donor",
      search: { tab: newTab as "overview" | "history" },
    });
  };

  const { data: user, isLoading: userLoading } = useCurrentUser();
  const donor = user?.donor;

  // Local form state
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [weight, setWeight] = useState("68");
  const [address, setAddress] = useState("Banani, Dhaka");
  const [gender, setGender] = useState("Male");
  const [lastDonation, setLastDonation] = useState("");
  const [hemoglobin, setHemoglobin] = useState("14.0");

  // Health Metrics Modal & Active Eligibility state
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [modalHemoglobin, setModalHemoglobin] = useState("14.0");
  const [modalSystolic, setModalSystolic] = useState("120");
  const [modalDiastolic, setModalDiastolic] = useState("80");
  const [modalPulse, setModalPulse] = useState("72");
  const [modalNotes, setModalNotes] = useState("");

  useEffect(() => {
    if (donor) {
      setBloodGroup(toDisplayBloodGroup(donor.blood_group));
      setWeight(donor.weight ? String(donor.weight) : "68");
      setAddress(donor.address || "Banani, Dhaka");
      setGender(donor.gender || "Male");
      setLastDonation(donor.last_donation_date || "");
      if (donor.medical_info?.hemoglobin_level) {
        setHemoglobin(String(donor.medical_info.hemoglobin_level));
        setModalHemoglobin(String(donor.medical_info.hemoglobin_level));
      }
    }
  }, [donor]);

  const {
    data: eligibility,
    isLoading: eligLoading,
    refetch: refetchEligibility,
  } = useDonorEligibility(!!user && (user.role === "DONOR" || user.role === "RECIPIENT"));

  const updateProfileMutation = useUpdateDonorProfile();
  const upsertMedicalMutation = useUpsertMedicalInfo();

  const { data: registeredEvents } = useMyRegisteredEvents(!!user && (user.role === "DONOR" || user.role === "RECIPIENT"));
  const { data: donationHistory } = useDonorHistory(!!user && (user.role === "DONOR" || user.role === "RECIPIENT"));

  const scheduledEventsCount = registeredEvents?.length || 0;
  const lifetimeCount = donationHistory?.length || 0;
  const tierInfo = getDonorTier(lifetimeCount);

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      await updateProfileMutation.mutateAsync({
        gender,
        weight: Number(weight),
        address,
        last_donation_date: lastDonation || null,
      });

      if (hemoglobin) {
        await upsertMedicalMutation.mutateAsync({
          hemoglobin_level: Number(hemoglobin),
        });
      }

      await refetchEligibility();
    } catch {
      // handled in hook
    }
  };

  // Clinical Eligibility Rule Engine
  const numWeight = Number(weight) || 0;
  const numHemoglobin = Number(hemoglobin) || 0;
  const isWeightPassed = numWeight >= 50;
  const isHemoglobinPassed = numHemoglobin >= 12.5;
  const isClinicallyPassed = isWeightPassed && isHemoglobinPassed;

  const isEligible = eligibility
    ? eligibility.is_eligible && isClinicallyPassed
    : isClinicallyPassed;

  const handleRecheckEligibility = async () => {
    setIsCheckingEligibility(true);
    try {
      if (numHemoglobin) {
        await upsertMedicalMutation.mutateAsync({
          hemoglobin_level: numHemoglobin,
        });
      }
      const res = await refetchEligibility();
      if (res.data) {
        if (res.data.weight) setWeight(String(res.data.weight));
        if (res.data.hemoglobin_level) setHemoglobin(String(res.data.hemoglobin_level));
        if (res.data.last_donation_date) setLastDonation(res.data.last_donation_date);
      }
      toast.success("Eligibility status updated successfully.");
    } catch {
      toast.error("Failed to re-check eligibility with medical service.");
    } finally {
      setIsCheckingEligibility(false);
    }
  };

  const handleSaveHealthMetrics = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const notesCombined = [
        modalNotes?.trim(),
        modalSystolic ? `BP: ${modalSystolic}/${modalDiastolic}` : null,
        modalPulse ? `Pulse: ${modalPulse} bpm` : null,
      ].filter(Boolean).join(" | ");

      await upsertMedicalMutation.mutateAsync({
        hemoglobin_level: Number(modalHemoglobin),
        other_notes: notesCombined || undefined,
      });
      setHemoglobin(modalHemoglobin);
      await refetchEligibility();
      setHealthModalOpen(false);
      toast.success("Health metrics submitted and eligibility updated!");
    } catch {
      // handled in mutation
    }
  };

  // Route Guard check
  if (userLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteNav />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user || (user.role !== "DONOR" && user.role !== "SYSTEM_ADMIN")) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 mb-4">
            <ShieldAlert className="size-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Donor Dashboard Access Restricted</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            {user
              ? `You are logged in as ${user.role}. This portal is reserved for registered Donors.`
              : "You must be authenticated as a Donor to access this dashboard, review eligibility, and toggle emergency availability."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <AuthDialog defaultTab="login" defaultRole="DONOR" />
            <Link to="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-background flex flex-col">
      <SiteNav />
      <main className="w-full max-w-7xl 2xl:max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex-1">
        {/* Header with Dynamic Gamification Tier & Progress */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Donor Dashboard</h1>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-bold px-3 py-1 flex items-center gap-1.5 shadow-sm border transition-all",
                  tierInfo.badgeColor
                )}
              >
                <span>{tierInfo.icon}</span>
                <span>{tierInfo.title} • {lifetimeCount} {lifetimeCount === 1 ? "Donation" : "Donations"} Completed</span>
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Manage clinical eligibility, donation records, and emergency availability.
            </p>

            {/* Dynamic Tier Progress Bar */}
            {tierInfo.nextTier && (
              <div className="mt-2 max-w-md bg-card/70 border border-border/70 rounded-xl p-3 shadow-xs">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span className="font-medium text-foreground">
                    Progress to <span className="font-semibold text-primary">{tierInfo.nextTier} Donor</span>
                  </span>
                  <span className="font-semibold text-foreground">
                    {tierInfo.currentCount} / {tierInfo.nextTierThreshold} ({tierInfo.progressPercent}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, tierInfo.progressPercent))}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">{tierInfo.remainingToNext} more</span> {tierInfo.remainingToNext === 1 ? "donation" : "donations"} to reach {tierInfo.nextTier} Donor status
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              onClick={handleSaveProfile}
              disabled={updateProfileMutation.isPending || upsertMedicalMutation.isPending}
              size="sm"
            >
              {updateProfileMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              Save Changes
            </Button>
          </div>
        </div>

        {/* Quick Stats Grid with Fluid Auto-fitting Columns */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <HeartPulse className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Blood Group</p>
                <p className="text-xl font-bold text-primary">{formatBloodGroup(bloodGroup, "symbol")}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div
                className={`flex size-10 items-center justify-center rounded-lg ${
                  isEligible
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {isEligible ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Eligibility Status</p>
                <p
                  className={`text-base font-bold ${isEligible ? "text-emerald-600" : "text-destructive"}`}
                >
                  {isEligible ? "Eligible to Donate" : "Cooldown / Ineligible"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <Calendar className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Registered Drives</p>
                <p className="text-xl font-bold">{scheduledEventsCount} Campaigns</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                <History className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Total Lifetime Donations
                </p>
                <p className="text-xl font-bold flex items-center gap-1.5">
                  <span>{lifetimeCount} Times</span>
                  <span className="text-xs font-medium text-muted-foreground">({tierInfo.icon} {tierInfo.name})</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Tab Switcher: Overview vs History */}
        <div className="mt-8 flex items-center gap-2 border-b border-border/60 pb-3">
          <Button
            variant={activeTab === "overview" ? "default" : "outline"}
            size="sm"
            onClick={() => handleTabChange("overview")}
            className="text-xs font-semibold"
          >
            Dashboard Overview
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "outline"}
            size="sm"
            onClick={() => handleTabChange("history")}
            className="text-xs font-semibold"
          >
            Donation History ({lifetimeCount})
          </Button>
        </div>

        {/* Views: Profile & Eligibility, Active Commitments, and Donation History */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-4">
          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
              {/* Profile Details Card */}
              <Card className="shadow-[var(--shadow-elegant)]">
                <CardHeader>
                  <CardTitle>Profile Details</CardTitle>
                  <CardDescription>
                    Demographic and clinical parameters synced with backend
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="group">Blood Group</Label>
                    <Select value={bloodGroup} onValueChange={setBloodGroup}>
                      <SelectTrigger id="group">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {UI_GROUPS.map((g) => (
                          <SelectItem key={g} value={g}>
                            {formatBloodGroup(g, "symbol")} ({formatBloodGroup(g, "full")})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger id="gender">
                        <SelectValue placeholder="Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="weight">Body Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      min={20}
                      max={300}
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="hemoglobin">Hemoglobin (g/dL)</Label>
                    <Input
                      id="hemoglobin"
                      type="number"
                      step="0.1"
                      min={5}
                      max={25}
                      value={hemoglobin}
                      onChange={(e) => setHemoglobin(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="last">Last Donation Date</Label>
                    <Input
                      id="last"
                      type="date"
                      value={lastDonation}
                      onChange={(e) => setLastDonation(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="address">Address / Area</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Banani, Dhaka"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Eligibility Status Card */}
              <Card
                className={
                  isEligible
                    ? "border-emerald-500/40 bg-emerald-500/5 shadow-[var(--shadow-elegant)]"
                    : "border-destructive/40 bg-destructive/5 shadow-[var(--shadow-elegant)]"
                }
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <HeartPulse className="size-5 text-primary" />
                      Eligibility check
                    </CardTitle>
                    <CardDescription>
                      Based on standard blood donation guidelines
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 gap-1 text-primary border-primary/40 hover:bg-primary/10"
                    onClick={() => {
                      setModalHemoglobin(hemoglobin);
                      setHealthModalOpen(true);
                    }}
                  >
                    Update Health Metrics
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    {eligLoading || isCheckingEligibility ? (
                      <Loader2 className="size-8 animate-spin text-primary" />
                    ) : isEligible ? (
                      <CheckCircle2 className="size-8 text-emerald-600" />
                    ) : (
                      <XCircle className="size-8 text-destructive" />
                    )}
                    <div>
                      <p
                        className={`text-lg font-semibold ${
                          isEligible ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                        }`}
                      >
                        {isEligible
                          ? "Qualified for Blood Donation"
                          : "Temporary Clinical Deferral"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isEligible
                          ? "All safety protocols and cooldown windows satisfied."
                          : !isWeightPassed
                            ? "Weight below minimum 50 kg requirement."
                            : !isHemoglobinPassed
                              ? "Hemoglobin level below clinical 12.5 g/dL threshold."
                              : "Active cooldown window since last donation (90 days required)."}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-border/40 py-2">
                      <span className="text-muted-foreground">Weight Standard (&ge; 50 kg)</span>
                      <span
                        className={
                          isWeightPassed
                            ? "text-emerald-600 font-semibold"
                            : "text-destructive font-semibold"
                        }
                      >
                        {weight} kg ({isWeightPassed ? "Passed" : "Underweight"})
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border/40 py-2">
                      <span className="text-muted-foreground">
                        Hemoglobin Level (&ge; 12.5 g/dL)
                      </span>
                      <span
                        className={
                          isHemoglobinPassed
                            ? "text-emerald-600 font-semibold"
                            : "text-destructive font-semibold"
                        }
                      >
                        {hemoglobin} g/dL ({isHemoglobinPassed ? "Passed" : "Low"})
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-muted-foreground">Cooldown Window</span>
                      <span className="text-foreground font-medium">
                        {lastDonation ? `${lastDonation}` : "No recorded donation (Eligible)"}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-semibold gap-1.5"
                    disabled={isCheckingEligibility || eligLoading}
                    onClick={handleRecheckEligibility}
                  >
                    {isCheckingEligibility ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        Re-checking Clinical Data...
                      </>
                    ) : (
                      "Re-check Eligibility"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Consolidated Active Commitments & Registered Drives */}
            <div className="mt-8">
              <ActiveCommitmentsCard />
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6">
            <div className="w-full overflow-x-auto">
              <DonationHistoryTab />
            </div>
          </TabsContent>
        </Tabs>

        {/* Update Health Metrics Modal Dialog */}
        <Dialog open={healthModalOpen} onOpenChange={setHealthModalOpen}>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSaveHealthMetrics}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <HeartPulse className="size-5 text-primary" /> Update Health Metrics
                </DialogTitle>
                <DialogDescription>
                  Submit updated clinical vitals directly to the LifeDrop medical verification engine.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="metric-hb">Hemoglobin Level (g/dL)</Label>
                  <Input
                    id="metric-hb"
                    type="number"
                    step="0.1"
                    min={5}
                    max={25}
                    value={modalHemoglobin}
                    onChange={(e) => setModalHemoglobin(e.target.value)}
                    placeholder="e.g. 13.5"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">Standard clinical threshold is &ge; 12.5 g/dL.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="metric-sbp">Systolic BP (mmHg)</Label>
                    <Input
                      id="metric-sbp"
                      type="number"
                      value={modalSystolic}
                      onChange={(e) => setModalSystolic(e.target.value)}
                      placeholder="120"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="metric-dbp">Diastolic BP (mmHg)</Label>
                    <Input
                      id="metric-dbp"
                      type="number"
                      value={modalDiastolic}
                      onChange={(e) => setModalDiastolic(e.target.value)}
                      placeholder="80"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="metric-pulse">Pulse Rate (bpm)</Label>
                  <Input
                    id="metric-pulse"
                    type="number"
                    value={modalPulse}
                    onChange={(e) => setModalPulse(e.target.value)}
                    placeholder="72"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="metric-notes">Clinical Notes (Optional)</Label>
                  <Input
                    id="metric-notes"
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    placeholder="e.g. Routine pre-donation checkup"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setHealthModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={upsertMedicalMutation.isPending}>
                  {upsertMedicalMutation.isPending && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Submit Health Readings
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

function ActiveCommitmentsCard() {
  const { data: user } = useCurrentUser();
  const isDonor = !!user && (user.role === "DONOR" || user.role === "RECIPIENT");
  const { data: registeredEvents, isLoading } = useMyRegisteredEvents(isDonor);

  const hasEvents = registeredEvents && registeredEvents.length > 0;

  return (
    <Card className="shadow-[var(--shadow-elegant)]">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="size-5 text-primary" /> Registered Campaign Drives
            </CardTitle>
            <CardDescription>
              Your upcoming registered voluntary blood donation drives and campaigns
            </CardDescription>
          </div>
          <div>
            <Link to="/events">
              <Button size="sm" variant="outline">Browse Donation Drives</Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin text-primary" /> Loading registered drives...
          </div>
        ) : hasEvents ? (
          <div className="space-y-3">
            {registeredEvents?.map((ev) => (
              <div
                key={ev.event_id}
                className="flex items-start justify-between rounded-lg border border-border bg-card p-4 shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-semibold border-emerald-500 text-emerald-600">
                      Campaign Drive
                    </Badge>
                    <Badge variant="secondary">{ev.status}</Badge>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{ev.title}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="size-3" />
                    {ev.location}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" />
                    {new Date(ev.start_date).toLocaleDateString()} — {new Date(ev.end_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No registered donation drives found. Browse upcoming campaigns to participate.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DonationHistoryTab() {
  const { data: user } = useCurrentUser();
  const isDonor = !!user && (user.role === "DONOR" || user.role === "RECIPIENT");
  const { data: history, isLoading } = useDonorHistory(isDonor);

  return (
    <Card className="shadow-[var(--shadow-elegant)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-5 text-primary" /> Donation History
        </CardTitle>
        <CardDescription>
          Verified records of your blood units donated and lives impacted
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin text-primary" /> Loading history...
          </div>
        ) : history && history.length > 0 ? (
          <div className="space-y-3">
            {history.map((h) => (
              <div
                key={h.history_id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 bg-card p-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-foreground">{h.center_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {h.component_type.replace("_", " ")} · {h.quantity} unit(s) · Donated on{" "}
                    {new Date(h.donation_date).toLocaleDateString()}
                  </p>
                </div>
                <Badge className="bg-emerald-600 text-white text-xs">Completed</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No donation history recorded yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
