import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import {
  Droplet,
  HeartPulse,
  ShieldCheck,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Users,
  Clock,
  ArrowRight,
  Sparkles,
  Lock,
  Building2,
  Share2,
  Save,
  Loader2,
  Activity,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuthDialog } from "@/components/AuthDialog";
import { useCurrentUser } from "@/hooks/useAuth";
import { useCampaignNotices } from "@/hooks/useAdmin";
import { useDonorEligibility, useUpdateDonorProfile, useUpsertMedicalInfo } from "@/hooks/useDonor";
import { BLOOD_GROUPS, HOSPITALS, MAP_DONORS, type MapDonor } from "@/lib/donor-data";
import { BLOOD_GROUP_UI_MAP, toApiBloodGroup, toDisplayBloodGroup } from "@/lib/api/types";
import { toast } from "sonner";

const DonorMap = lazy(() => import("@/components/DonorMap"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LifeDrop — Automated Blood Donor Management & Emergency Dispatch" },
      {
        name: "description",
        content:
          "Connecting volunteer blood donors, emergency recipients, and hospital blood banks with verified privacy safeguards and automated clinical screening.",
      },
      { property: "og:title", content: "LifeDrop — Blood Donor Management System" },
      {
        property: "og:description",
        content:
          "Emergency blood matching, proximity radar, clinical eligibility calculator, and hospital inventory control.",
      },
    ],
  }),
  component: LandingPage,
});

const UI_GROUPS = Object.values(BLOOD_GROUP_UI_MAP);
const RADII = [5, 10, 25, 50];

export function LandingPage() {
  const { data: user } = useCurrentUser();
  const isRecipient = user?.role === "RECIPIENT";
  const isSysAdmin = user?.role === "SYSTEM_ADMIN";
  const isAuthorizedRecipient = isRecipient || isSysAdmin;

  // 1. Nearby Donor Map State (Interactive for authorized recipients)
  const [radiusIndex, setRadiusIndex] = useState(1);
  const [mapGroups, setMapGroups] = useState<string[]>([]);
  const radiusKm = RADII[radiusIndex] ?? 10;

  const mapDonors = useMemo(
    () =>
      MAP_DONORS.filter(
        (d) => d.distanceKm <= radiusKm && (mapGroups.length === 0 || mapGroups.includes(d.group)),
      ),
    [radiusKm, mapGroups],
  );

  const toggleGroup = (g: string) =>
    setMapGroups((gs) => (gs.includes(g) ? gs.filter((x) => x !== g) : [...gs, g]));

  const requestContact = (d: MapDonor) =>
    toast.success(`Contact authorization requested from ${d.name} (${d.group})`);

  // 2. Interactive Eligibility Calculator State (Fully interactive for guests + donors)
  const [calcAge, setCalcAge] = useState<string>("24");
  const [calcWeight, setCalcWeight] = useState<string>("68");
  const [calcHemoglobin, setCalcHemoglobin] = useState<string>("14.0");
  const [calcLastDonation, setCalcLastDonation] = useState<string>("");
  const [calcBloodGroup, setCalcBloodGroup] = useState<string>("O+");
  const [calcGender, setCalcGender] = useState<string>("Male");

  // Client-side instant evaluation for guests
  const evaluation = useMemo(() => {
    const age = Number(calcAge);
    const weight = Number(calcWeight);
    const hgb = Number(calcHemoglobin);
    const reasons: string[] = [];

    if (isNaN(age) || age < 18 || age > 65) {
      reasons.push("Donors must be between 18 and 65 years of age.");
    }
    if (isNaN(weight) || weight < 50) {
      reasons.push("Minimum body weight requirement is 50 kg (prevents donor hypovolemia).");
    }
    if (isNaN(hgb) || hgb < 12.5) {
      reasons.push("Hemoglobin must be at least 12.5 g/dL (ensures adequate iron stores).");
    }
    if (calcLastDonation) {
      const lastDate = new Date(calcLastDonation);
      const diffDays = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays < 90) {
        reasons.push(
          `Recovery cooldown active: ${Math.ceil(90 - diffDays)} days remaining (90 days interval required).`,
        );
      }
    }

    return {
      isEligible: reasons.length === 0,
      reasons,
    };
  }, [calcAge, calcWeight, calcHemoglobin, calcLastDonation]);

  // Optional live query when logged in as donor
  const { data: serverEligibility, refetch: refetchServerEligibility } = useDonorEligibility(
    !!user && user.role === "DONOR",
  );
  const updateProfileMutation = useUpdateDonorProfile();
  const upsertMedicalMutation = useUpsertMedicalInfo();

  const handleSaveToProfile = async () => {
    if (!user) {
      toast.error("Please sign in to your account first.");
      return;
    }
    try {
      await updateProfileMutation.mutateAsync({
        gender: calcGender,
        weight: Number(calcWeight),
        last_donation_date: calcLastDonation || null,
      });
      if (calcHemoglobin) {
        await upsertMedicalMutation.mutateAsync({
          hemoglobin_level: Number(calcHemoglobin),
        });
      }
      await refetchServerEligibility();
      toast.success("Saved clinical parameters to your live donor profile!");
    } catch {
      // handled
    }
  };

  // 3. Upcoming Campaigns Query
  const { data: campaigns, isLoading: campaignsLoading } = useCampaignNotices();

  const handleShareCampaign = (title: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success(`Campaign link copied for "${title}"!`);
    }
  };

  const handleRsvpCampaign = (title: string) => {
    toast.success(`RSVP confirmed for "${title}"!`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-primary/10 via-background to-background py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center text-center">
            {/* Top Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" />
              <span>Real-Time Healthcare Blood Network & Emergency Dispatch</span>
            </div>

            {/* Main Headline */}
            <h1 className="mt-6 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground">
              Connecting Critical Blood Donors with Lives in Need,{" "}
              <span className="text-primary">in Minutes</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-5 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
              LifeDrop synchronizes verified volunteer donors, emergency recipients, and hospital
              blood banks. Backed by verified privacy safeguards, proximity radar, and automated
              clinical verification.
            </p>

            {/* Hero CTAs */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              {/* "Request Blood" CTA */}
              {!user ? (
                <Link to="/login" search={{ redirect: "/requests/new" }}>
                  <Button size="lg" className="gap-2 shadow-md">
                    <Droplet className="size-4" /> Request Blood
                  </Button>
                </Link>
              ) : (
                <Link to="/requests/new">
                  <Button size="lg" className="gap-2 shadow-md">
                    <Droplet className="size-4" /> Request Blood
                  </Button>
                </Link>
              )}

              {/* "Become a Donor" CTA */}
              <Link to="/register" search={{ role: "DONOR" }}>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 border-primary/40 hover:bg-primary/5"
                >
                  <HeartPulse className="size-4 text-primary" /> Become a Donor
                </Button>
              </Link>

              {/* Interactive Anchor for Calculator */}
              <a href="#eligibility">
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Check Eligibility
                </Button>
              </a>
            </div>

            {/* Core Platform Pillars */}
            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-4xl w-full text-left">
              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <ShieldCheck className="size-4" /> Privacy Protected
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Masked donor PII and shielded coordinates
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                  <HeartPulse className="size-4" /> Clinical Engine
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Automated 90-day cooldown & hemoglobin checks
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
                  <Building2 className="size-4" /> Hospital Sync
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Whole blood, plasma & platelets stock tracking
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2 text-rose-600 font-semibold text-sm">
                  <Activity className="size-4" /> Rapid Dispatch
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Instant urgent notification to verified donors
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Nearby Donor Search (Map) Section with Privacy Gate */}
      <section id="nearby-donors" className="py-16 border-b border-border/40">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-xs uppercase font-semibold text-primary border-primary"
                >
                  Geospatial Radar
                </Badge>
                {isAuthorizedRecipient && (
                  <Badge variant="default" className="text-xs">
                    Authorized Clearance: {user?.role}
                  </Badge>
                )}
              </div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mt-1 text-foreground">
                Nearby Donor Search (Map)
              </h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                Proximity-based volunteer matching connecting hospital centers and donors within
                5-50 km radius.
              </p>
            </div>

            {isAuthorizedRecipient && (
              <Link to="/requests/emergency">
                <Button size="sm" variant="destructive" className="text-xs font-semibold">
                  <AlertCircle className="mr-1.5 size-4" /> Emergency Dispatch
                </Button>
              </Link>
            )}
          </div>

          {/* PRIVACY GATE: If authorized (RECIPIENT or SYSTEM_ADMIN), show real interactive map */}
          {isAuthorizedRecipient ? (
            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
              {/* Map Controls */}
              <Card className="h-fit shadow-[var(--shadow-elegant)]">
                <CardHeader>
                  <CardTitle className="text-base">Radar Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Proximity Radius</Label>
                      <span className="text-sm font-semibold text-primary">{radiusKm} km</span>
                    </div>
                    <Slider
                      value={[radiusIndex]}
                      onValueChange={([v]) => setRadiusIndex(v ?? 1)}
                      min={0}
                      max={3}
                      step={1}
                      aria-label="Proximity radius"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      {RADII.map((r) => (
                        <span key={r}>{r}km</span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Filter Blood Groups</Label>
                    <div className="flex flex-wrap gap-2">
                      {BLOOD_GROUPS.map((g) => {
                        const on = mapGroups.includes(g);
                        return (
                          <button key={g} onClick={() => toggleGroup(g)} aria-pressed={on}>
                            <Badge variant={on ? "default" : "outline"} className="cursor-pointer">
                              {g}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 text-xs text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground">
                      {mapDonors.length} active donors in {radiusKm} km
                    </p>
                    <p>Connected Hospital Banks: {HOSPITALS.length}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Interactive Leaflet Map */}
              <Card className="overflow-hidden shadow-[var(--shadow-elegant)]">
                <CardContent className="p-0">
                  <ClientOnly fallback={<Skeleton className="h-[480px] w-full" />}>
                    <Suspense fallback={<Skeleton className="h-[480px] w-full" />}>
                      <DonorMap
                        donors={mapDonors}
                        radiusKm={radiusKm}
                        onRequestContact={requestContact}
                      />
                    </Suspense>
                  </ClientOnly>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* PRIVACY GATE OVERLAY: Guest or Non-Recipient Role View */
            <div className="relative overflow-hidden rounded-2xl border border-border/80 shadow-[var(--shadow-elegant)] bg-card">
              {/* Illustrative Blurred Radar Simulation in the background */}
              <div className="h-[420px] w-full bg-slate-900/90 relative overflow-hidden select-none pointer-events-none filter blur-[3px] opacity-40">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.25)_0,transparent_70%)]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-72 rounded-full border border-primary/30" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-44 rounded-full border border-primary/40" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-16 rounded-full border border-primary/60 bg-primary/10 animate-ping" />
                {/* Mock Donor Pins */}
                <div className="absolute top-1/3 left-1/4 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] text-white">
                  <MapPin className="size-3" /> O+ Donor (2.1 km)
                </div>
                <div className="absolute top-2/3 right-1/3 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] text-white">
                  <MapPin className="size-3" /> A- Donor (4.8 km)
                </div>
                <div className="absolute bottom-1/4 left-1/3 flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] text-white">
                  <Building2 className="size-3" /> Central Blood Center
                </div>
              </div>

              {/* Centered Overlay Card */}
              <div className="absolute inset-0 flex items-center justify-center p-6 bg-background/60 backdrop-blur-md">
                <div className="max-w-lg rounded-xl border border-border bg-card/95 p-8 text-center shadow-2xl space-y-4">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Lock className="size-7" />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-foreground">
                      Donor Location Privacy Shield
                    </h3>
                    <p className="mt-2 text-sm text-foreground/80 font-medium">
                      Log in as a Recipient to view and search real-time donors nearby (Privacy
                      Protected)
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Exact residential locations and telephone numbers are encrypted. Only verified
                      recipients and hospital dispatchers with legitimate medical requests can
                      trigger donor proximity radar.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                    {!user ? (
                      <>
                        <Link to="/login" search={{ redirect: "/recipient" }}>
                          <Button className="gap-2">
                            <Users className="size-4" /> Sign In as Recipient
                          </Button>
                        </Link>
                        <Link to="/register" search={{ role: "RECIPIENT" }}>
                          <Button variant="outline">Register as Recipient</Button>
                        </Link>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          You are currently signed in as <strong>{user.role}</strong>. Sign in with a
                          Recipient account to access the proximity radar.
                        </p>
                        <AuthDialog
                          defaultRole="RECIPIENT"
                          trigger={
                            <Button size="sm" className="gap-2">
                              Switch to Recipient Account
                            </Button>
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. Interactive "Are You Eligible to Donate?" Calculator */}
      <section id="eligibility" className="py-16 bg-muted/20 border-b border-border/40">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <Badge
              variant="outline"
              className="text-xs uppercase font-semibold text-primary border-primary mb-2"
            >
              Clinical Assessment
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Are You Eligible to Donate?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Test your eligibility with our real-time clinical validator before heading to a
              donation center.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
            {/* Interactive Calculator Form */}
            <Card className="shadow-[var(--shadow-elegant)]">
              <CardHeader>
                <CardTitle className="text-lg">Interactive Eligibility Parameters</CardTitle>
                <CardDescription>
                  Adjust values to evaluate medical safety standards instantly
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="c-age">Age (Years)</Label>
                  <Input
                    id="c-age"
                    type="number"
                    min={16}
                    max={80}
                    value={calcAge}
                    onChange={(e) => setCalcAge(e.target.value)}
                  />
                  <span className="text-[11px] text-muted-foreground">Standard: 18 - 65 years</span>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="c-weight">Body Weight (kg)</Label>
                  <Input
                    id="c-weight"
                    type="number"
                    min={30}
                    max={250}
                    value={calcWeight}
                    onChange={(e) => setCalcWeight(e.target.value)}
                  />
                  <span className="text-[11px] text-muted-foreground">Minimum: 50 kg</span>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="c-hgb">Hemoglobin Level (g/dL)</Label>
                  <Input
                    id="c-hgb"
                    type="number"
                    step="0.1"
                    min={8}
                    max={22}
                    value={calcHemoglobin}
                    onChange={(e) => setCalcHemoglobin(e.target.value)}
                  />
                  <span className="text-[11px] text-muted-foreground">Minimum: 12.5 g/dL</span>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="c-group">Blood Group</Label>
                  <Select value={calcBloodGroup} onValueChange={setCalcBloodGroup}>
                    <SelectTrigger id="c-group">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {UI_GROUPS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g} ({toApiBloodGroup(g)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-[11px] text-muted-foreground">Universal or compatible</span>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="c-last">Last Blood Donation Date</Label>
                  <Input
                    id="c-last"
                    type="date"
                    value={calcLastDonation}
                    onChange={(e) => setCalcLastDonation(e.target.value)}
                  />
                  <span className="text-[11px] text-muted-foreground">
                    Requires 90-day cooldown
                  </span>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="c-gender">Biological Gender</Label>
                  <Select value={calcGender} onValueChange={setCalcGender}>
                    <SelectTrigger id="c-gender">
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-[11px] text-muted-foreground">
                    Safety thresholds calibrated
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Real-time Dynamic Result Card */}
            <Card
              className={
                evaluation.isEligible
                  ? "border-emerald-500/40 bg-emerald-500/5 shadow-[var(--shadow-elegant)]"
                  : "border-destructive/40 bg-destructive/5 shadow-[var(--shadow-elegant)]"
              }
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <HeartPulse className="size-5 text-primary" />
                  Clinical Evaluation Result
                </CardTitle>
                <CardDescription>
                  Instant algorithmic assessment based on WHO & National Blood Transfusion
                  guidelines
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center gap-3">
                  {evaluation.isEligible ? (
                    <CheckCircle2 className="size-10 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="size-10 text-destructive shrink-0" />
                  )}
                  <div>
                    <p
                      className={`text-xl font-bold ${
                        evaluation.isEligible
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-destructive"
                      }`}
                    >
                      {evaluation.isEligible ? "You Are Eligible to Donate!" : "Temporary Deferral"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Blood Group: <strong className="text-foreground">{calcBloodGroup}</strong>
                    </p>
                  </div>
                </div>

                {evaluation.isEligible ? (
                  <div className="space-y-2.5 text-xs text-muted-foreground border-y border-border/60 py-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600" />
                      <span>
                        Body weight is sufficient (&ge; 50 kg) to donate whole blood safely.
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600" />
                      <span>
                        Hemoglobin level meets clinical donation criteria (&ge; 12.5 g/dL).
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600" />
                      <span>Age is within standard healthy adult range (18-65 years).</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
                    <p className="font-semibold">Rejection Criteria Identified:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {evaluation.reasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2 flex flex-col gap-2">
                  {user?.role === "DONOR" ? (
                    <Button
                      onClick={handleSaveToProfile}
                      disabled={updateProfileMutation.isPending || upsertMedicalMutation.isPending}
                      className="w-full gap-2"
                    >
                      {updateProfileMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}
                      Sync with My Donor Profile
                    </Button>
                  ) : (
                    <Link to="/register" search={{ role: "DONOR" }} className="w-full">
                      <Button className="w-full gap-2">
                        <HeartPulse className="size-4" /> Register as a Qualified Donor
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 4. Upcoming Donation Campaigns & Drives */}
      <section id="events" className="py-16 border-b border-border/40">
        <div id="campaigns" className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
            <div>
              <Badge
                variant="outline"
                className="text-xs uppercase font-semibold text-primary border-primary mb-2"
              >
                Public Drives
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Upcoming Donation Campaigns
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Participate in verified hospital drives, mobile blood donation camps, and university
                events.
              </p>
            </div>

            <Link to="/events">
              <Button variant="outline" size="sm" className="gap-1.5">
                View All Campaigns <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>

          {/* Campaigns Grid */}
          {campaignsLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto size-8 animate-spin text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">Loading campaigns...</p>
            </div>
          ) : campaigns && campaigns.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-3">
              {campaigns.map((camp) => (
                <Card
                  key={camp.notice_id}
                  className="shadow-[var(--shadow-elegant)] hover:border-primary/50 transition-colors"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-bold text-primary border-primary"
                      >
                        CAMPAIGN
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-bold mt-2">{camp.title}</CardTitle>
                    <CardDescription>{camp.source}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-3">{camp.description}</p>
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-3.5 text-primary" />
                        <span>Published: {new Date(camp.publish_date).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                      {camp.link ? (
                        <a href={camp.link} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="default" className="text-xs">
                            View Details
                          </Button>
                        </a>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          className="text-xs"
                          onClick={() => handleRsvpCampaign(camp.title)}
                        >
                          RSVP Now
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => handleShareCampaign(camp.title)}
                      >
                        <Share2 className="mr-1 size-3" /> Share
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  title: "Monsoon Emergency Blood Drive",
                  org: "Central Red Crescent Hospital",
                  date: "Sept 20-22, 2026",
                  venue: "Dhaka University Gymnasium",
                  badge: "CRITICAL DRIVE",
                  units: "500 Bags Target",
                },
                {
                  title: "BRAC Campus LifeDrop Camp",
                  org: "BRAC University Health Club",
                  date: "Sept 28, 2026",
                  venue: "Merul Badda Campus, Dhaka",
                  badge: "COMMUNITY",
                  units: "250 Bags Target",
                },
                {
                  title: "Thalassemia Support Drive",
                  org: "Bangladesh Thalassemia Foundation",
                  date: "Oct 05, 2026",
                  venue: "Square Hospital Panthapath",
                  badge: "PEDIATRIC",
                  units: "150 Bags Target",
                },
              ].map((camp, idx) => (
                <Card
                  key={idx}
                  className="shadow-[var(--shadow-elegant)] hover:border-primary/50 transition-colors"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-bold text-primary border-primary"
                      >
                        {camp.badge}
                      </Badge>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {camp.units}
                      </span>
                    </div>
                    <CardTitle className="text-lg font-bold mt-2">{camp.title}</CardTitle>
                    <CardDescription>{camp.org}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-3.5 text-primary" />
                        <span>{camp.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="size-3.5 text-primary" />
                        <span>{camp.venue}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                      <Button
                        size="sm"
                        variant="default"
                        className="text-xs"
                        onClick={() => handleRsvpCampaign(camp.title)}
                      >
                        RSVP Now
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => handleShareCampaign(camp.title)}
                      >
                        <Share2 className="mr-1 size-3" /> Share
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. About LifeDrop Platform */}
      <section id="about" className="py-16 bg-muted/10">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge
              variant="outline"
              className="text-xs uppercase font-semibold text-primary border-primary mb-2"
            >
              Institutional Mission
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              About the LifeDrop Platform
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A secure, intelligent blood donation network connecting donors, recipients, and
              hospitals across Dhaka in real time.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2">
                  <ShieldCheck className="size-5" />
                </div>
                <CardTitle className="text-base">Verified & Privacy-Preserving</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground leading-relaxed">
                Donor contact details are protected and only shared upon mutual agreement during an
                active blood request.
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 mb-2">
                  <HeartPulse className="size-5" />
                </div>
                <CardTitle className="text-base">Clinical Safety Validation</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground leading-relaxed">
                Automated health screening ensures donors meet medical weight, age, and recovery
                intervals before matching.
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 mb-2">
                  <Building2 className="size-5" />
                </div>
                <CardTitle className="text-base">Hospital Inventory Network</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground leading-relaxed">
                Partner hospitals maintain live blood unit availability to accelerate emergency
                dispatches.
              </CardContent>
            </Card>
          </div>

          {/* Footer banner */}
          <div className="mt-12 rounded-2xl border border-border/80 bg-card p-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg text-foreground">Ready to save a life today?</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Register as a donor or initiate a medical emergency blood request in seconds.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/register" search={{ role: "DONOR" }}>
                <Button>Register Now</Button>
              </Link>
              <AuthDialog />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
