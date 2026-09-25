import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import {
  User,
  Phone,
  MapPin,
  Droplet,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Save,
  Loader2,
  Heart,
  History,
  Info,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityLedger } from "@/components/ActivityLedger";
import { useCurrentUser, useUpdateUserProfile } from "@/hooks/useAuth";
import { formatDateOnly, calculateAge } from "@/lib/dateUtils";
import { toast } from "sonner";
import { toDisplayBloodGroup } from "@/lib/api/types";
import type { BloodGroup } from "@/lib/api/types";

const searchSchema = z.object({
  tab: z.enum(["profile", "history"]).optional(),
});

export const Route = createFileRoute("/profile")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "My Profile & Settings — LifeDrop" },
      {
        name: "description",
        content: "Manage your personal profile, contact information, blood group, and donation history.",
      },
    ],
  }),
  component: ProfilePage,
});

export const DHAKA_ZONES = [
  "Dhanmondi",
  "Mirpur",
  "Gulshan",
  "Uttara",
  "Mohakhali",
  "Panthapath",
  "Banani",
  "Bashundhara",
  "Shahbagh",
  "Banasree",
  "Mohammadpur",
  "Badda",
  "Khilgaon",
  "Puran Dhaka",
  "Motijheel",
  "Tejgaon",
] as const;

export const BLOOD_GROUPS: { value: BloodGroup; label: string }[] = [
  { value: "A_POSITIVE", label: "A+" },
  { value: "A_NEGATIVE", label: "A-" },
  { value: "B_POSITIVE", label: "B+" },
  { value: "B_NEGATIVE", label: "B-" },
  { value: "AB_POSITIVE", label: "AB+" },
  { value: "AB_NEGATIVE", label: "AB-" },
  { value: "O_POSITIVE", label: "O+" },
  { value: "O_NEGATIVE", label: "O-" },
];

function ProfilePage() {
  const { tab = "profile" } = Route.useSearch();
  const [selectedTab, setSelectedTab] = useState<"profile" | "history">(tab);

  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: eligibility } = useDonorEligibility(!!user);
  const updateProfileMutation = useUpdateUserProfile();

  // Form states
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [backupPhone, setBackupPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [weight, setWeight] = useState<string>("65");
  const [hemoglobin, setHemoglobin] = useState<string>("13.5");
  const [locationZone, setLocationZone] = useState("");
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>("O_POSITIVE");
  const [lastDonationDate, setLastDonationDate] = useState("");

  const calculatedAge = calculateAge(dateOfBirth) ?? (user?.age ?? user?.donor?.age ?? null);

  // Populate initial state from user
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setPhone(user.phone || "");
      setBackupPhone(user.backup_phone || "");

      const dob = user.date_of_birth || user.donor?.date_of_birth || "";
      if (dob) {
        setDateOfBirth(dob.slice(0, 10));
      }

      if (user.donor?.weight !== undefined && user.donor?.weight !== null) {
        setWeight(String(user.donor.weight));
      }
      if (user.donor?.medical_info?.hemoglobin_level !== undefined && user.donor?.medical_info?.hemoglobin_level !== null) {
        setHemoglobin(String(user.donor.medical_info.hemoglobin_level));
      }
      
      const donorAddress = user.donor?.address || "";
      // Check if donorAddress matches any zone
      const matchedZone = DHAKA_ZONES.find((z) => donorAddress.toLowerCase().includes(z.toLowerCase()));
      setLocationZone(matchedZone || donorAddress || "Dhanmondi");

      if (user.donor?.blood_group) {
        setBloodGroup(user.donor.blood_group as BloodGroup);
      }
      if (user.donor?.last_donation_date) {
        setLastDonationDate(user.donor.last_donation_date.slice(0, 10));
      }
    }
  }, [user, eligibility]);

  // Sync tab search param changes
  useEffect(() => {
    if (tab) {
      setSelectedTab(tab);
    }
  }, [tab]);

  // Calculate dynamic cooldown based on lastDonationDate
  const calculateCooldown = () => {
    if (!lastDonationDate) {
      return { isCooldownActive: false, daysRemaining: 0, nextEligibleDate: null };
    }
    const donationDate = new Date(lastDonationDate);
    if (isNaN(donationDate.getTime())) {
      return { isCooldownActive: false, daysRemaining: 0, nextEligibleDate: null };
    }
    const today = new Date();
    const diffTime = today.getTime() - donationDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 90 && diffDays >= 0) {
      const daysRemaining = 90 - diffDays;
      const nextDate = new Date(donationDate);
      nextDate.setDate(donationDate.getDate() + 90);
      return {
        isCooldownActive: true,
        daysRemaining,
        nextEligibleDate: nextDate.toISOString().slice(0, 10),
      };
    }

    return { isCooldownActive: false, daysRemaining: 0, nextEligibleDate: null };
  };

  const cooldownStatus = calculateCooldown();

  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();

    if (user?.role === "DONOR" && dateOfBirth) {
      const liveAge = calculateAge(dateOfBirth);
      if (liveAge !== null && liveAge < 18) {
        toast.error(`Donor must be at least 18 years old (Current age: ${liveAge} years).`);
        return;
      }
      if (liveAge !== null && liveAge > 65) {
        toast.error(`Maximum eligible age for regular blood donation is 65 years (Current age: ${liveAge} years).`);
        return;
      }
    }

    updateProfileMutation.mutate({
      full_name: fullName.trim(),
      phone: phone.trim(),
      backup_phone: backupPhone.trim() || null,
      date_of_birth: dateOfBirth || null,
      age: calculatedAge ?? undefined,
      weight: weight ? parseFloat(weight) : undefined,
      hemoglobin: hemoglobin ? parseFloat(hemoglobin) : undefined,
      hemoglobin_level: hemoglobin ? parseFloat(hemoglobin) : undefined,
      address: locationZone,
      location_zone: locationZone,
      blood_group: bloodGroup,
      last_donation_date: lastDonationDate || null,
    });
  };

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

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteNav />
        <div className="max-w-md mx-auto my-auto p-6 text-center">
          <ShieldAlert className="size-12 text-primary mx-auto mb-3" />
          <h2 className="text-xl font-bold text-foreground">Authentication Required</h2>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Please sign in to view and manage your profile settings and donation records.
          </p>
          <a href="/login" className="inline-block">
            <Button className="w-full">Sign In to LifeDrop</Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav />

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1">
        {/* Header Profile Summary Banner */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-14 sm:size-16 rounded-2xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-primary font-black text-2xl shadow-inner shrink-0">
                {user.full_name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                    {user.full_name || "LifeDrop Member"}
                  </h1>
                  <Badge variant="outline" className="text-xs font-semibold uppercase">
                    {user.role === "SYSTEM_ADMIN" ? "Admin" : user.role === "HOSPITAL_ADMIN" ? "Hospital" : user.role}
                  </Badge>
                  {user.nid_or_birth_cert && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 font-bold">
                      <ShieldCheck className="size-3" /> Verified ID
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5 flex-wrap">
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Droplet className="size-3.5 text-primary" />
                    Blood Group: <strong>{toDisplayBloodGroup(bloodGroup)}</strong>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="size-3.5" />
                    Age: <strong>{calculatedAge ? `${calculatedAge} Years` : "N/A"} ({calculatedAge && calculatedAge >= 18 && calculatedAge <= 65 ? "Eligible" : "Ineligible"})</strong>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5 text-muted-foreground" />
                    {locationZone || "Dhaka"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Status Pill */}
            <div className="shrink-0 self-start sm:self-auto">
              {cooldownStatus.isCooldownActive ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Clock className="size-3.5 text-amber-600" />
                    <span>Cooldown Active</span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    Eligible in <strong>{cooldownStatus.daysRemaining} days</strong> ({formatDateOnly(cooldownStatus.nextEligibleDate)})
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    <span>Eligible to Donate</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                    Qualified for emergency donation requests
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={selectedTab} onValueChange={(val) => setSelectedTab(val as "profile" | "history")} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="profile" className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
              <User className="size-4" />
              <span>Profile & Settings</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
              <History className="size-4" />
              <span>Donation History</span>
            </TabsTrigger>
          </TabsList>

          {/* ========================================================================= */}
          {/* TAB 1: EDITABLE PROFILE & SETTINGS                                        */}
          {/* ========================================================================= */}
          <TabsContent value="profile" className="space-y-6">
            {/* Notice for older or default Date of Birth accounts */}
            {(!dateOfBirth || dateOfBirth === "2000-01-01") && (
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5 shadow-xs animate-in fade-in duration-200">
                <Info className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">Verify Your Date of Birth</p>
                  <p className="text-[11px] text-blue-800 dark:text-blue-300">
                    Please verify your Date of Birth to ensure accurate donation eligibility.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveChanges} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                {/* Left 2 Columns: Editable Inputs */}
                <div className="md:col-span-2 space-y-6">
                  <Card className="shadow-xs border-border">
                    <CardHeader className="pb-4 border-b border-border/50">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <User className="size-4 text-primary" />
                        Personal Information & Contacts
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Keep your contact numbers and location updated so emergency recipients can connect promptly.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                      {/* Full Name & Date of Birth */}
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="sm:col-span-2 space-y-1.5">
                          <Label htmlFor="full_name" className="text-xs font-semibold">
                            Full Name *
                          </Label>
                          <Input
                            id="full_name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Your legal full name"
                            required
                            className="text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="date_of_birth" className="text-xs font-semibold flex items-center gap-1">
                              <Calendar className="size-3 text-primary" />
                              Date of Birth *
                            </Label>
                            <Badge variant="outline" className="text-[10px] font-semibold text-primary border-primary/30">
                              Calculated Age: {calculatedAge ? `${calculatedAge} years` : 'N/A'}
                            </Badge>
                          </div>
                          <Input
                            id="date_of_birth"
                            type="date"
                            max={new Date().toISOString().slice(0, 10)}
                            value={dateOfBirth}
                            onChange={(e) => setDateOfBirth(e.target.value)}
                            required
                            className="text-xs"
                          />
                        </div>
                      </div>

                      {/* Phone Numbers Grid */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="phone" className="text-xs font-semibold flex items-center gap-1">
                            <Phone className="size-3 text-primary" />
                            Primary Phone Number *
                          </Label>
                          <Input
                            id="phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="e.g. 01712345678"
                            required
                            className="text-xs"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Used for urgent SMS broadcasts & mutual connection upon match acceptance.
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="backup_phone" className="text-xs font-semibold flex items-center gap-1">
                            <Phone className="size-3 text-muted-foreground" />
                            Backup Phone Number (Optional)
                          </Label>
                          <Input
                            id="backup_phone"
                            value={backupPhone}
                            onChange={(e) => setBackupPhone(e.target.value)}
                            placeholder="e.g. 01812345678 (Secondary contact)"
                            className="text-xs"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Alternative number in case primary is busy or unreachable during an emergency.
                          </p>
                        </div>
                      </div>

                      {/* Location Zone Dropdown */}
                      <div className="space-y-1.5">
                        <Label htmlFor="location_zone" className="text-xs font-semibold flex items-center gap-1">
                          <MapPin className="size-3 text-primary" />
                          Location Zone / City Area *
                        </Label>
                        <Select value={locationZone} onValueChange={setLocationZone}>
                          <SelectTrigger id="location_zone" className="text-xs">
                            <SelectValue placeholder="Select your Dhaka area" />
                          </SelectTrigger>
                          <SelectContent>
                            {DHAKA_ZONES.map((zone) => (
                              <SelectItem key={zone} value={zone} className="text-xs">
                                {zone}, Dhaka
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">
                          Matches you with blood requests within your immediate vicinity to minimize transit time.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Medical & Blood Donation Record */}
                  <Card className="shadow-xs border-border">
                    <CardHeader className="pb-4 border-b border-border/50">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Droplet className="size-4 text-red-500" />
                        Medical Details & Clinical Information
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Configure your blood group, clinical metrics (weight & hemoglobin), and recovery cooldown.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        {/* Blood Group */}
                        <div className="space-y-1.5">
                          <Label htmlFor="blood_group" className="text-xs font-semibold">
                            Blood Group *
                          </Label>
                          <Select
                            value={bloodGroup}
                            onValueChange={(val) => setBloodGroup(val as BloodGroup)}
                          >
                            <SelectTrigger id="blood_group" className="text-xs font-bold text-primary">
                              <SelectValue placeholder="Select Blood Group" />
                            </SelectTrigger>
                            <SelectContent>
                              {BLOOD_GROUPS.map((bg) => (
                                <SelectItem key={bg.value} value={bg.value} className="text-xs font-bold">
                                  {bg.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[10px] text-muted-foreground">
                            Crucial for compatibility matching algorithms.
                          </p>
                        </div>

                        {/* Last Blood Donation Date */}
                        <div className="space-y-1.5">
                          <Label htmlFor="last_donation_date" className="text-xs font-semibold flex items-center gap-1">
                            <Calendar className="size-3 text-primary" />
                            Last Blood Donation Date
                          </Label>
                          <Input
                            id="last_donation_date"
                            type="date"
                            value={lastDonationDate}
                            onChange={(e) => setLastDonationDate(e.target.value)}
                            max={new Date().toISOString().slice(0, 10)}
                            className="text-xs"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Record a prior donation outside LifeDrop to initiate your 90-day recovery window.
                          </p>
                        </div>

                        {/* Weight (kg) */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="weight" className="text-xs font-semibold flex items-center gap-1">
                              <span>Weight (kg) *</span>
                            </Label>
                            <span className="text-[10px] text-muted-foreground font-medium">&ge; 50.0 kg</span>
                          </div>
                          <Input
                            id="weight"
                            type="number"
                            step="0.5"
                            placeholder="e.g. 62"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            className="text-xs"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Standard clinical minimum for safe donor blood donation is 50.0 kg.
                          </p>
                        </div>

                        {/* Hemoglobin (g/dL) */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="hemoglobin" className="text-xs font-semibold flex items-center gap-1">
                              <span>Hemoglobin (g/dL) *</span>
                            </Label>
                            <span className="text-[10px] text-muted-foreground font-medium">&ge; 12.5 g/dL</span>
                          </div>
                          <Input
                            id="hemoglobin"
                            type="number"
                            step="0.1"
                            placeholder="e.g. 13.5"
                            value={hemoglobin}
                            onChange={(e) => setHemoglobin(e.target.value)}
                            className="text-xs"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Safe clinical donation threshold is &ge; 12.5 g/dL.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column: Dynamic Cooldown & Guidance Card */}
                <div className="space-y-4">
                  <Card className="shadow-xs border-border">
                    <CardHeader className="pb-3 border-b border-border/50">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Clock className="size-4 text-primary" />
                        Eligibility Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      {cooldownStatus.isCooldownActive ? (
                        <div className="space-y-2.5">
                          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-900 dark:text-amber-200">
                            <p className="font-bold flex items-center gap-1.5">
                              <Clock className="size-3.5 text-amber-600 shrink-0" />
                              Mandatory 90-Day Cooldown
                            </p>
                            <p className="text-[11px] mt-1 text-amber-800 dark:text-amber-300">
                              Based on your recorded donation on <strong>{formatDateOnly(lastDonationDate)}</strong>, your body needs <strong>{cooldownStatus.daysRemaining} more days</strong> to safely replenish hemoglobin and red blood cells.
                            </p>
                          </div>
                          <div className="text-[11px] text-muted-foreground space-y-1">
                            <p>• <strong>Next Eligible:</strong> {formatDateOnly(cooldownStatus.nextEligibleDate)}</p>
                            <p>• <strong>Availability:</strong> Automatically set to <em>Unavailable</em> to prevent emergency dispatch.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-900 dark:text-emerald-200">
                            <p className="font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                              Qualified to Donate
                            </p>
                            <p className="text-[11px] mt-1 text-emerald-800 dark:text-emerald-300">
                              You have fulfilled all medical rest intervals. Your status is ready to save lives when a nearby patient needs blood.
                            </p>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Remember to stay hydrated and maintain a balanced iron intake prior to donating.
                          </p>
                        </div>
                      )}

                      {/* Registered Clinical Parameters */}
                      <div className="rounded-lg bg-muted/40 border border-border/60 p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                          <span className="text-muted-foreground">Clinical Age:</span>
                          <span className={`font-semibold ${calculatedAge && calculatedAge >= 18 && calculatedAge <= 65 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                            Age: {calculatedAge ? `${calculatedAge} Years` : "N/A"} ({calculatedAge && calculatedAge >= 18 && calculatedAge <= 65 ? "Eligible" : "Ineligible"})
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                          <span className="text-muted-foreground">Body Weight (&ge; 50 kg):</span>
                          <span className={`font-semibold ${Number(weight) >= 50 ? "text-foreground" : "text-destructive"}`}>
                            {weight ? `${weight} kg` : "N/A"} ({Number(weight) >= 50 ? "Eligible" : "Underweight"})
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Hemoglobin (&ge; 12.5 g/dL):</span>
                          <span className={`font-semibold ${Number(hemoglobin) >= 12.5 ? "text-foreground" : "text-destructive"}`}>
                            {hemoglobin ? `${hemoglobin} g/dL` : "N/A"} ({Number(hemoglobin) >= 12.5 ? "Eligible" : "Low"})
                          </span>
                        </div>
                      </div>

                      <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground flex items-start gap-2">
                        <Info className="size-3.5 text-primary shrink-0 mt-0.5" />
                        <span>
                          Medical guidelines require donors to be 18 to 65 years old and observe a minimum 90-day cooldown between whole blood donations.
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Prominent / Sticky Save Changes Footer */}
              <div className="sticky bottom-4 z-10 flex items-center justify-between rounded-xl border border-border bg-card/95 backdrop-blur-md p-4 shadow-lg">
                <div className="text-xs text-muted-foreground hidden sm:block">
                  Changes to your phone, location, and donation cooldown take effect immediately across matching systems.
                </div>
                <Button
                  type="submit"
                  size="default"
                  disabled={updateProfileMutation.isPending}
                  className="font-bold gap-2 text-xs sm:text-sm px-6 shadow-sm ml-auto"
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <Save className="size-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 2: UNIFIED DONATION & REQUEST HISTORY                                 */}
          {/* ========================================================================= */}
          <TabsContent value="history" className="space-y-6">
            <ActivityLedger defaultTab="donated" />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
