import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import {
  Droplet,
  HeartPulse,
  ShieldCheck,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Building2,
  Activity,
  Share2,
  Save,
  Loader2,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
import { HOSPITALS } from "@/lib/donor-data";
import { CANONICAL_BLOOD_GROUPS, toApiBloodGroup } from "@/lib/api/types";
import { formatBloodGroup } from "@/lib/formatters";
import { toast } from "sonner";
import { TopDonorsLeaderboard } from "@/components/TopDonorsLeaderboard";

const DonorMap = lazy(() => import("@/components/DonorMap"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LifeDrop — Blood Donor & Blood Bank Network" },
      {
        name: "description",
        content:
          "LifeDrop connects volunteer blood donors, patients, and hospital blood banks across Dhaka. Check eligibility, request blood, and join donation drives.",
      },
      { property: "og:title", content: "LifeDrop — Blood Donor & Blood Bank Network" },
      {
        property: "og:description",
        content:
          "Connect blood donors with people who need them. Eligibility checks, blood requests, and hospital blood bank stock in one place.",
      },
    ],
  }),
  component: LandingPage,
});

const UI_GROUPS = CANONICAL_BLOOD_GROUPS;
const RADII = [5, 10, 25, 50];

export function LandingPage() {
  const { data: user } = useCurrentUser();

  // Blood bank network map (public — shows hospital blood banks only)
  const [radiusIndex, setRadiusIndex] = useState(1);
  const radiusKm = RADII[radiusIndex] ?? 10;

  // Eligibility calculator (interactive for everyone)
  const [calcAge, setCalcAge] = useState<string>("24");
  const [calcWeight, setCalcWeight] = useState<string>("68");
  const [calcHemoglobin, setCalcHemoglobin] = useState<string>("14.0");
  const [calcLastDonation, setCalcLastDonation] = useState<string>("");
  const [calcBloodGroup, setCalcBloodGroup] = useState<string>("O+");
  const [calcGender, setCalcGender] = useState<string>("Male");

  const evaluation = useMemo(() => {
    const age = Number(calcAge);
    const weight = Number(calcWeight);
    const hgb = Number(calcHemoglobin);
    const reasons: string[] = [];

    if (isNaN(age) || age < 18 || age > 65) {
      reasons.push("Donors must be between 18 and 65 years old.");
    }
    if (isNaN(weight) || weight < 50) {
      reasons.push("You need to weigh at least 50 kg to donate.");
    }
    if (isNaN(hgb) || hgb < 12.5) {
      reasons.push("Hemoglobin must be at least 12.5 g/dL.");
    }
    if (calcLastDonation) {
      const lastDate = new Date(calcLastDonation);
      const diffDays = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays < 90) {
        reasons.push(
          `You can donate again in ${Math.ceil(90 - diffDays)} days (90 days between donations).`,
        );
      }
    }

    return { isEligible: reasons.length === 0, reasons };
  }, [calcAge, calcWeight, calcHemoglobin, calcLastDonation]);

  const { refetch: refetchServerEligibility } = useDonorEligibility(
    !!user && (user.role === "DONOR" || user.role === "RECIPIENT"),
  );
  const updateProfileMutation = useUpdateDonorProfile();
  const upsertMedicalMutation = useUpsertMedicalInfo();

  const handleSaveToProfile = async () => {
    if (!user) {
      toast.error("Please sign in first.");
      return;
    }
    try {
      await updateProfileMutation.mutateAsync({
        gender: calcGender,
        weight: Number(calcWeight),
        last_donation_date: calcLastDonation || null,
      });
      if (calcHemoglobin) {
        await upsertMedicalMutation.mutateAsync({ hemoglobin_level: Number(calcHemoglobin) });
      }
      await refetchServerEligibility();
      toast.success("Saved to your donor profile.");
    } catch {
      // handled by mutation toast
    }
  };

  const { data: campaigns, isLoading: campaignsLoading } = useCampaignNotices();

  const handleShareCampaign = (title: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success(`Link copied: ${title}`);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      <SiteNav />

      {/* Hero */}
      <section className="border-b border-border/40 py-16 sm:py-20 lg:py-28">
        <div className="w-full max-w-7xl 2xl:max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="mx-auto max-w-4xl text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Find a blood donor when it matters most
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base md:text-lg text-muted-foreground">
            LifeDrop connects volunteer donors, patients, and hospital blood banks across Dhaka.
            Check your eligibility, request blood, or join a donation drive.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <Link to="/requests/new">
                <Button size="lg" className="gap-2">
                  <Droplet className="size-4" /> Request blood
                </Button>
              </Link>
            ) : (
              <Link to="/login" search={{ redirect: "/requests/new" }}>
                <Button size="lg" className="gap-2">
                  <Droplet className="size-4" /> Request blood
                </Button>
              </Link>
            )}
            <Link to="/register" search={{ role: "DONOR" }}>
              <Button size="lg" variant="outline" className="gap-2">
                <HeartPulse className="size-4" /> Become a donor
              </Button>
            </Link>
          </div>

          <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 text-left">
            {[
              { icon: ShieldCheck, title: "Private by default", body: "Your contact details are shared only when you accept a match." },
              { icon: HeartPulse, title: "Eligibility built in", body: "Checks for age, weight, hemoglobin, and donation interval." },
              { icon: Building2, title: "Hospital blood banks", body: "Live stock for whole blood, plasma, and platelets." },
              { icon: Activity, title: "Fast in emergencies", body: "Urgent requests reach nearby eligible donors right away." },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs transition hover:border-primary/40">
                <f.icon className="size-5 text-primary" />
                <p className="mt-2 text-sm font-semibold">{f.title}</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hospital blood bank network */}
      <section id="nearby-donors" className="border-b border-border/40 py-14 sm:py-16">
        <div className="w-full max-w-7xl 2xl:max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Hospital blood bank network</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Blood banks across Dhaka. To find donors, sign in as a recipient and create a request —
              we match you with eligible donors nearby while keeping their details private until they
              accept.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[300px_1fr] xl:grid-cols-[320px_1fr]">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-base">Map view</CardTitle>
                <CardDescription>Adjust the coverage radius</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Radius</Label>
                    <span className="text-sm font-semibold text-primary">{radiusKm} km</span>
                  </div>
                  <Slider
                    value={[radiusIndex]}
                    onValueChange={([v]) => setRadiusIndex(v ?? 1)}
                    min={0}
                    max={3}
                    step={1}
                    aria-label="Coverage radius"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    {RADII.map((r) => (
                      <span key={r}>{r}km</span>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-4 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">
                    {HOSPITALS.length} blood banks in the network
                  </p>
                  <p className="mt-1">Tap a marker for hospital details.</p>
                </div>

                {!user && (
                  <Link to="/login" search={{ redirect: "/requests/new" }} className="block">
                    <Button size="sm" className="w-full gap-2">
                      <Droplet className="size-4" /> Request blood
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden relative isolate z-0 rounded-2xl">
              <CardContent className="p-0">
                <ClientOnly fallback={<Skeleton className="h-[320px] sm:h-[420px] lg:h-[520px] 2xl:h-[600px] w-full" />}>
                  <Suspense fallback={<Skeleton className="h-[320px] sm:h-[420px] lg:h-[520px] 2xl:h-[600px] w-full" />}>
                    <DonorMap radiusKm={radiusKm} />
                  </Suspense>
                </ClientOnly>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Eligibility calculator */}
      <section id="eligibility" className="border-b border-border/40 bg-muted/20 py-14 sm:py-16">
        <div className="w-full max-w-7xl 2xl:max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Check your donation eligibility</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A quick check against standard blood donation guidelines before you head to a center.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your details</CardTitle>
                <CardDescription>Adjust the values to see your result update instantly.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="c-age">Age (years)</Label>
                  <Input id="c-age" type="number" min={16} max={80} value={calcAge} onChange={(e) => setCalcAge(e.target.value)} />
                  <span className="text-[11px] text-muted-foreground">Standard: 18–65 years</span>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="c-weight">Weight (kg)</Label>
                  <Input id="c-weight" type="number" min={30} max={250} value={calcWeight} onChange={(e) => setCalcWeight(e.target.value)} />
                  <span className="text-[11px] text-muted-foreground">Minimum: 50 kg</span>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="c-hgb">Hemoglobin (g/dL)</Label>
                  <Input id="c-hgb" type="number" step="0.1" min={8} max={22} value={calcHemoglobin} onChange={(e) => setCalcHemoglobin(e.target.value)} />
                  <span className="text-[11px] text-muted-foreground">Minimum: 12.5 g/dL</span>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="c-group">Blood group</Label>
                  <Select value={calcBloodGroup} onValueChange={setCalcBloodGroup}>
                    <SelectTrigger id="c-group">
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
                  <Label htmlFor="c-last">Last donation date</Label>
                  <Input id="c-last" type="date" value={calcLastDonation} onChange={(e) => setCalcLastDonation(e.target.value)} />
                  <span className="text-[11px] text-muted-foreground">90 days between donations</span>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="c-gender">Gender</Label>
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
                </div>
              </CardContent>
            </Card>

            <Card
              className={
                evaluation.isEligible
                  ? "border-success/40 bg-success/5"
                  : "border-destructive/40 bg-destructive/5"
              }
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <HeartPulse className="size-5 text-primary" />
                  Your result
                </CardTitle>
                <CardDescription>Based on standard blood donation guidelines.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center gap-3">
                  {evaluation.isEligible ? (
                    <CheckCircle2 className="size-10 shrink-0 text-success" />
                  ) : (
                    <XCircle className="size-10 shrink-0 text-destructive" />
                  )}
                  <div>
                    <p className={`text-xl font-bold ${evaluation.isEligible ? "text-success" : "text-destructive"}`}>
                      {evaluation.isEligible ? "You're eligible to donate" : "Not eligible right now"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Blood group: <strong className="text-foreground">{formatBloodGroup(calcBloodGroup, "symbol")}</strong>
                    </p>
                  </div>
                </div>

                {evaluation.isEligible ? (
                  <div className="space-y-2.5 border-y border-border/60 py-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-success" />
                      <span>Weight is at or above the 50 kg minimum.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-success" />
                      <span>Hemoglobin meets the 12.5 g/dL minimum.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-success" />
                      <span>Age is within the 18–65 range.</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
                    <p className="font-semibold">What to fix:</p>
                    <ul className="list-disc space-y-1 pl-4">
                      {evaluation.reasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  {user && (user.role === "DONOR" || user.role === "RECIPIENT") ? (
                    <Button
                      onClick={handleSaveToProfile}
                      disabled={updateProfileMutation.isPending || upsertMedicalMutation.isPending}
                      className="w-full gap-2"
                    >
                      {updateProfileMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                      Save to my profile
                    </Button>
                  ) : (
                    <Link to="/register" className="w-full">
                      <Button className="w-full gap-2">
                        <HeartPulse className="size-4" /> Create an account
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Upcoming drives */}
      <section id="events" className="border-b border-border/40 py-14 sm:py-16">
        <div id="campaigns" className="w-full max-w-7xl 2xl:max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Upcoming donation drives</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Hospital drives, mobile camps, and university events.
              </p>
            </div>
            <Link to="/events">
              <Button variant="outline" size="sm" className="gap-1.5">
                View all <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>

          {campaignsLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto size-8 animate-spin text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">Loading drives…</p>
            </div>
          ) : campaigns && campaigns.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-3">
              {campaigns.map((camp) => (
                <Card key={camp.notice_id} className="transition-colors hover:border-primary/50">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">{camp.title}</CardTitle>
                    <CardDescription>{camp.source}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="line-clamp-3 text-sm text-muted-foreground">{camp.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="size-3.5 text-primary" />
                      <span>Published {new Date(camp.publish_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-border/60 pt-2">
                      {camp.link ? (
                        <a href={camp.link} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="text-xs">View details</Button>
                        </a>
                      ) : (
                        <Link to="/events">
                          <Button size="sm" className="text-xs">View details</Button>
                        </Link>
                      )}
                      <Button size="sm" variant="ghost" className="text-xs" onClick={() => handleShareCampaign(camp.title)}>
                        <Share2 className="mr-1 size-3" /> Share
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border py-16 text-center">
              <Calendar className="mx-auto size-10 text-muted-foreground/40" />
              <p className="mt-4 text-muted-foreground">No donation drives scheduled right now.</p>
              <p className="mt-1 text-xs text-muted-foreground">Check back soon, or register as a donor to be notified.</p>
            </div>
          )}
        </div>
      </section>

      {/* Top Life-Savers Leaderboard */}
      <section id="leaderboard" className="border-b border-border/40 bg-muted/20 py-14 sm:py-16">
        <div className="w-full max-w-7xl 2xl:max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
          <TopDonorsLeaderboard limit={25} showPodium={true} />
        </div>
      </section>

      {/* How it works */}
      <section id="about" className="bg-muted/10 py-14 sm:py-16">
        <div className="w-full max-w-7xl 2xl:max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">How LifeDrop works</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A secure blood donation network connecting donors, patients, and hospitals across Dhaka.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: ShieldCheck, title: "Privacy first", body: "Donor contact details are shared only when both sides agree during an active request." },
              { icon: HeartPulse, title: "Safe matches", body: "Automatic screening checks weight, age, and donation interval before matching." },
              { icon: Building2, title: "Hospital network", body: "Partner hospitals keep blood unit availability up to date for faster emergencies." },
            ].map((c) => (
              <Card key={c.title}>
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <c.icon className="size-5" />
                  </div>
                  <CardTitle className="text-base">{c.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs leading-relaxed text-muted-foreground">{c.body}</CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-8">
            <div>
              <h3 className="text-lg font-bold">Ready to donate?</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Register as a donor or start a blood request in a couple of minutes.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/register" search={{ role: "DONOR" }}>
                <Button className="bg-primary text-primary-foreground font-semibold">Register now</Button>
              </Link>
              <AuthDialog
                trigger={
                  <Button variant="outline" className="font-semibold">Sign in</Button>
                }
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
