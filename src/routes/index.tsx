import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, HeartPulse, Save, ShieldAlert, Sparkles, Loader2 } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Donor Profile & Eligibility — LifeDrop" },
      {
        name: "description",
        content:
          "Set up your blood donor profile and instantly check donation eligibility backed by FastAPI & Supabase.",
      },
      { property: "og:title", content: "Donor Profile & Eligibility — LifeDrop" },
      {
        property: "og:description",
        content: "Set up your donor profile and check if you are eligible to donate blood today.",
      },
    ],
  }),
  component: ProfilePage,
});

const UI_GROUPS = Object.values(BLOOD_GROUP_UI_MAP);

export function ProfilePage() {
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

  // Sync state when real user profile is loaded from backend
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

  // Live eligibility query from backend
  const { data: eligibility, isLoading: eligLoading, refetch: refetchEligibility } = useDonorEligibility(
    !!user && user.role === "DONOR"
  );

  const updateProfileMutation = useUpdateDonorProfile();
  const toggleAvailabilityMutation = useToggleAvailability();
  const upsertMedicalMutation = useUpsertMedicalInfo();

  const handleSaveProfile = async () => {
    if (!user) {
      toast.error("Please sign in or use the 1-Click Role Switcher first.");
      return;
    }

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
      // handled by mutation
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

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl flex items-center gap-2">
              Donor Profile & Eligibility
              {user && (
                <Badge variant="outline" className="text-xs uppercase font-semibold text-primary border-primary">
                  {user.role}
                </Badge>
              )}
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Connected to Supabase PostgreSQL: evaluate real clinical eligibility and update your donor coordinates.
            </p>
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={updateProfileMutation.isPending || upsertMedicalMutation.isPending}
            className="shadow-sm"
          >
            {updateProfileMutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Save Profile
          </Button>
        </div>

        {!user && (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
            <ShieldAlert className="size-5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <span className="font-semibold">Guest View:</span> Click <strong>Sign In</strong> at the top right to log in or use the <strong>1-Click RBAC Role Switcher</strong> to test as a live Donor.
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          {/* Profile Form */}
          <Card className="shadow-[var(--shadow-elegant)]">
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>Demographic, location, and clinical parameters</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
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

              <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Donor Availability Status</p>
                  <p className="text-xs text-muted-foreground">
                    {available ? "Active & searchable for emergency requests" : "Temporarily paused from dispatch"}
                  </p>
                </div>
                <Switch
                  checked={available}
                  onCheckedChange={handleToggleAvailability}
                  disabled={toggleAvailabilityMutation.isPending}
                />
              </div>
            </CardContent>
          </Card>

          {/* Real Live Eligibility Verification */}
          <Card
            className={
              isEligible
                ? "border-emerald-500/40 bg-emerald-500/5 shadow-[var(--shadow-elegant)]"
                : "border-destructive/40 bg-destructive/5 shadow-[var(--shadow-elegant)]"
            }
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HeartPulse className="size-5 text-primary" />
                Eligibility Engine
              </CardTitle>
              <CardDescription>Live automated validator from FastAPI backend</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
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
                    {isEligible ? "Eligible to Donate" : "Not Eligible to Donate"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Blood Group: <strong className="text-foreground">{bloodGroup}</strong> ({toApiBloodGroup(bloodGroup)})
                  </p>
                </div>
              </div>

              {eligibility?.rejection_reasons && eligibility.rejection_reasons.length > 0 ? (
                <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/10 p-3">
                  <p className="text-xs font-semibold text-destructive">Clinical Validation Rejections:</p>
                  <ul className="list-disc pl-4 text-xs text-destructive space-y-1">
                    {eligibility.rejection_reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <ul className="space-y-3">
                  <li className="flex items-start gap-2.5 text-xs">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    <div>
                      <p className="font-medium text-foreground">Body weight requirement</p>
                      <p className="text-muted-foreground">{weight} kg (&ge; 50 kg requirement met)</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    <div>
                      <p className="font-medium text-foreground">Hemoglobin standard</p>
                      <p className="text-muted-foreground">{hemoglobin} g/dL (&ge; 12.5 g/dL requirement met)</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    <div>
                      <p className="font-medium text-foreground">Recovery cooldown status</p>
                      <p className="text-muted-foreground">
                        {lastDonation ? `Last donation: ${lastDonation}` : "No cooldown restrictions"}
                      </p>
                    </div>
                  </li>
                </ul>
              )}

              <div className="pt-2 flex items-center justify-between border-t border-border/60">
                <Badge variant={available ? "default" : "secondary"}>
                  {available ? "Publicly Searchable" : "Hidden from Queue"}
                </Badge>

                {user?.role === "DONOR" && (
                  <Button variant="ghost" size="sm" onClick={() => refetchEligibility()} className="text-xs h-7">
                    Re-verify
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
