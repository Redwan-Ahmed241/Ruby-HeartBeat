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
  Sparkles,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuthDialog } from "@/components/AuthDialog";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  useDonorEligibility,
  useUpdateDonorProfile,
  useToggleAvailability,
  useUpsertMedicalInfo,
} from "@/hooks/useDonor";
import {
  toApiBloodGroup,
  toDisplayBloodGroup,
  BLOOD_GROUP_UI_MAP,
  type BloodGroup,
} from "@/lib/api/types";
import { toast } from "sonner";

export const Route = createFileRoute("/donor")({
  validateSearch: (search: Record<string, unknown>): { tab?: "overview" | "appointments" | "history" } => ({
    tab: (search["tab"] as "overview" | "appointments" | "history") || "overview",
  }),
  head: () => ({
    meta: [
      { title: "Donor Dashboard — LifeDrop" },
      {
        name: "description",
        content: "Manage donor availability, appointments, and donation history.",
      },
    ],
  }),
  component: DonorDashboardPage,
});

const UI_GROUPS = Object.values(BLOOD_GROUP_UI_MAP);

function DonorDashboardPage() {
  const search = useSearch({ from: "/donor" });
  const navigate = useNavigate();
  const activeTab = search["tab"] || "overview";

  const handleTabChange = (newTab: string) => {
    navigate({
      to: "/donor",
      search: { tab: newTab as "overview" | "appointments" | "history" },
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
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (donor) {
      setBloodGroup(toDisplayBloodGroup(donor.blood_group));
      setWeight(donor.weight ? String(donor.weight) : "68");
      setAddress(donor.address || "Banani, Dhaka");
      setGender(donor.gender || "Male");
      setLastDonation(donor.last_donation_date || "");
      setAvailable(donor.availability_status === "AVAILABLE");
    }
  }, [donor]);

  const {
    data: eligibility,
    isLoading: eligLoading,
    refetch: refetchEligibility,
  } = useDonorEligibility(!!user && user.role === "DONOR");

  const updateProfileMutation = useUpdateDonorProfile();
  const toggleAvailabilityMutation = useToggleAvailability();
  const upsertMedicalMutation = useUpsertMedicalInfo();

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

  const handleToggleAvailability = async (checked: boolean) => {
    setAvailable(checked);
    if (user && user.role === "DONOR") {
      await toggleAvailabilityMutation.mutateAsync({
        availability_status: checked ? "AVAILABLE" : "UNAVAILABLE",
      });
    }
  };

  const isEligible = eligibility ? eligibility.is_eligible : Number(weight) >= 50;

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
              : "You must be authenticated as a Donor to access this dashboard, view appointments, and toggle emergency availability."}
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
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 py-10">
        {/* Header with Title & Quick Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Donor Dashboard</h1>
              <Badge
                variant="outline"
                className="text-xs font-semibold text-primary border-primary bg-primary/5"
              >
                Verified Blood Donor
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage clinical eligibility, appointments, donation records, and emergency
              availability.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
              <span className="font-semibold">Dispatch Status:</span>
              <span className={available ? "text-emerald-600 font-bold" : "text-muted-foreground"}>
                {available ? "Available" : "Unavailable"}
              </span>
              <Switch
                checked={available}
                onCheckedChange={handleToggleAvailability}
                disabled={toggleAvailabilityMutation.isPending}
                className="scale-90 data-[state=checked]:bg-emerald-500"
              />
            </div>
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

        {/* Quick Stats Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <HeartPulse className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Blood Group</p>
                <p className="text-xl font-bold">{bloodGroup}</p>
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
                <p className="text-xs text-muted-foreground font-medium">Scheduled Appointments</p>
                <p className="text-xl font-bold">1 Upcoming</p>
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
                <p className="text-xl font-bold">4 Times</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Views: Profile & Eligibility, Appointments, Donation History driven by URL Search Params */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-8">
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
                            {g}
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
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <HeartPulse className="size-5 text-primary" />
                    Live Clinical Engine
                  </CardTitle>
                  <CardDescription>
                    Validated against clinical transfusion safety guidelines
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    {eligLoading ? (
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
                          : "Please review requirements below before scheduling an appointment."}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-border/40 py-2">
                      <span className="text-muted-foreground">Weight Standard (&ge; 50 kg)</span>
                      <span
                        className={
                          Number(weight) >= 50
                            ? "text-emerald-600 font-semibold"
                            : "text-destructive font-semibold"
                        }
                      >
                        {weight} kg ({Number(weight) >= 50 ? "Passed" : "Underweight"})
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border/40 py-2">
                      <span className="text-muted-foreground">
                        Hemoglobin Level (&ge; 12.5 g/dL)
                      </span>
                      <span
                        className={
                          Number(hemoglobin) >= 12.5
                            ? "text-emerald-600 font-semibold"
                            : "text-destructive font-semibold"
                        }
                      >
                        {hemoglobin} g/dL ({Number(hemoglobin) >= 12.5 ? "Passed" : "Low"})
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-muted-foreground">Cooldown Window</span>
                      <span className="text-foreground font-medium">
                        {lastDonation ? `${lastDonation}` : "No recorded donation"}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => refetchEligibility()}
                  >
                    Re-check Eligibility
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="mt-6">
            <Card className="shadow-[var(--shadow-elegant)]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="size-5 text-primary" /> My Appointments
                    </CardTitle>
                    <CardDescription>
                      Scheduled hospital visits and blood donation slots
                    </CardDescription>
                  </div>
                  <Link to="/events">
                    <Button size="sm">Browse Donation Drives</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start justify-between rounded-lg border border-border bg-card p-4 shadow-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">CONFIRMED</Badge>
                        <span className="text-sm font-semibold">
                          Dhaka Medical College Hospital
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="size-3" /> Secretariate Road, Ramna, Dhaka
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3" /> September 18, 2026 at 10:30 AM (Slot #B-14)
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => toast.info("Appointment reschedule requested.")}
                    >
                      Reschedule
                    </Button>
                  </div>

                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    No further pending appointments. You can walk into any affiliated hospital blood
                    bank with your LifeDrop QR code.
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6">
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
                <div className="space-y-3">
                  {[
                    {
                      date: "May 12, 2026",
                      hospital: "Square Hospital Blood Bank",
                      type: "Whole Blood (450ml)",
                      status: "Transfused to Patient",
                      badge: "bg-emerald-600",
                    },
                    {
                      date: "January 04, 2026",
                      hospital: "United Hospital Blood Center",
                      type: "Whole Blood (450ml)",
                      status: "Transfused to Patient",
                      badge: "bg-emerald-600",
                    },
                    {
                      date: "August 19, 2025",
                      hospital: "Apollo / Evercare Hospital",
                      type: "Platelets Apheresis",
                      status: "Completed",
                      badge: "bg-blue-600",
                    },
                  ].map((h, i) => (
                    <div
                      key={i}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 bg-card p-3 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-foreground">{h.hospital}</p>
                        <p className="text-xs text-muted-foreground">
                          {h.type} · Donated on {h.date}
                        </p>
                      </div>
                      <Badge className={`${h.badge} text-white text-xs`}>{h.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
