import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState, lazy, Suspense } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  AlertTriangle,
  Lock,
  MapPin,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Phone,
  Mail,
  Home,
  Zap,
  Building2,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateBloodRequest,
  useCreateEmergencyRequest,
  useRespondToMatch,
  useRevealDonorContact,
} from "@/hooks/useRequests";
import { useCurrentUser } from "@/hooks/useAuth";
import { AuthDialog } from "@/components/AuthDialog";
import {
  CANONICAL_BLOOD_GROUPS,
  toApiBloodGroup,
  toDisplayBloodGroup,
  type BloodGroup,
  type ComponentType,
  type RequestUrgency,
  type BloodRequestResponse,
  type MaskedDonorMatchResponse,
  type DonorContactReveal,
} from "@/lib/api/types";
import { formatBloodGroup } from "@/lib/formatters";

export const Route = createFileRoute("/request-blood")({
  validateSearch: (search: Record<string, unknown>): { urgency?: "NORMAL" | "URGENT" | "EMERGENCY" } => ({
    urgency: (search["urgency"] as "NORMAL" | "URGENT" | "EMERGENCY") || undefined,
  }),
  head: () => ({
    meta: [
      { title: "Request Blood & Match Donors — LifeDrop" },
      {
        name: "description",
        content:
          "Post a blood request with component, units and urgency, then see privacy-protected matching donors ranked by compatibility and distance.",
      },
      { property: "og:title", content: "Request Blood & Match Donors — LifeDrop" },
      {
        property: "og:description",
        content: "Post a request and reach compatible donors nearby with contact privacy built in.",
      },
    ],
  }),
  component: RequestBlood,
});

const DonorMap = lazy(() => import("@/components/DonorMap"));

const UI_GROUPS = CANONICAL_BLOOD_GROUPS;
const COMPONENTS = [
  { label: "Whole Blood", value: "WHOLE_BLOOD" },
  { label: "Plasma", value: "PLASMA" },
  { label: "Platelets", value: "PLATELETS" },
] as const;

const URGENCIES = [
  { label: "Normal (Standard Search)", value: "NORMAL" },
  { label: "Urgent (Priority Radius)", value: "URGENT" },
  { label: "Emergency (Immediate 50km Broadcast)", value: "EMERGENCY" },
] as const;

export const DHAKA_ZONES = [
  "Shahbagh",
  "Panthapath",
  "Bashundhara",
  "Gulshan",
  "Banani",
  "Dhanmondi",
  "Mirpur",
  "Uttara",
  "Mohakhali",
  "Banasree",
  "Mohammadpur",
  "Badda",
  "Puran Dhaka",
  "Khilgaon",
] as const;

export const POPULAR_HOSPITALS = [
  { name: "Dhaka Medical College Hospital (DMCH)", area: "Shahbagh" },
  { name: "Square Hospital", area: "Panthapath" },
  { name: "Evercare Hospital Dhaka", area: "Bashundhara" },
  { name: "United Hospital", area: "Gulshan" },
  { name: "BIRDEM General Hospital", area: "Shahbagh" },
  { name: "Popular Diagnostic & Hospital", area: "Dhanmondi" },
  { name: "National Heart Foundation", area: "Mirpur" },
] as const;

const schema = z.object({
  patient: z.string().trim().min(1, "Patient name is required").max(100),
  group: z.string().min(1, "Blood group is required"),
  component: z.enum(["WHOLE_BLOOD", "PLASMA", "PLATELETS"]),
  units: z.coerce.number().min(0.5, "At least 0.5 unit").max(20, "Maximum 20 units"),
  volume_ml: z.coerce.number().min(100, "Volume must be at least 100 mL").max(10000).optional(),
  urgency: z.enum(["NORMAL", "URGENT", "EMERGENCY"]),
  hospital_name: z.string().trim().min(2, "Hospital name is required").max(150),
  area_zone: z.string().trim().min(2, "Area zone is required").max(100),
  location: z.string().trim().min(2, "Ward / Delivery location is required").max(150),
  phone: z.string().trim().min(6, "Valid attendant phone number is required").max(30),
  notes: z.string().trim().max(500).optional(),
});

function RequestBlood() {
  const { data: currentUser } = useCurrentUser();
  const search = useSearch({ from: "/request-blood" });
  const isEmergencyLocked = search.urgency === "EMERGENCY";

  const [form, setForm] = useState({
    patient: "Patient Rahman",
    group: "O+",
    component: "WHOLE_BLOOD" as ComponentType,
    units: "1",
    volume_ml: "450",
    urgency: (isEmergencyLocked ? "EMERGENCY" : "NORMAL") as RequestUrgency,
    hospital_name: "United Hospital",
    area_zone: "Gulshan",
    location: "Emergency Ward, Room 302",
    phone: "01711223344",
    notes: "",
  });

  const [createdRequest, setCreatedRequest] = useState<BloodRequestResponse | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<MaskedDonorMatchResponse | null>(null);
  const [selectedMapMatch, setSelectedMapMatch] = useState<MaskedDonorMatchResponse | null>(null);
  const [revealedContact, setRevealedContact] = useState<DonorContactReveal | null>(null);

  const createRequestMutation = useCreateBloodRequest();
  const createEmergencyMutation = useCreateEmergencyRequest();
  const respondMatchMutation = useRespondToMatch();
  const revealContactMutation = useRevealDonorContact();

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleUnitsChange = (newUnits: string) => {
    const u = parseFloat(newUnits) || 1;
    setForm((f) => ({
      ...f,
      units: newUnits,
      volume_ml: String(Math.round(u * 450)),
    }));
  };

  const handleQuickHospital = (h: typeof POPULAR_HOSPITALS[number]) => {
    setForm((f) => ({
      ...f,
      hospital_name: h.name,
      area_zone: h.area,
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error("Please sign in to submit a request.");
      return;
    }

    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your details");
      return;
    }

    const apiGroup = toApiBloodGroup(form.group);

    // Approximate coordinates for Dhaka hospital areas
    const payload = {
      blood_group: apiGroup,
      component_type: form.component,
      quantity: Number(form.units),
      volume_ml: Number(form.volume_ml) || (Number(form.units) * 450),
      urgency: form.urgency,
      required_location: `${form.hospital_name}, ${form.location}`,
      latitude: 23.7998,
      longitude: 90.4208,
      notes: form.notes.trim() || undefined,
      patient_name: form.patient.trim(),
      hospital_name: form.hospital_name.trim(),
      area_zone: form.area_zone.trim(),
      attendant_phone_number: form.phone.trim(),
    };

    try {
      let res: BloodRequestResponse;
      if (form.urgency === "EMERGENCY") {
        res = await createEmergencyMutation.mutateAsync(payload);
      } else {
        res = await createRequestMutation.mutateAsync(payload);
      }
      setCreatedRequest(res);
      setRevealedContact(null);
      // Route / scroll immediately to live match tracking screen
      setTimeout(() => {
        const el = document.getElementById("live-matches-section");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 150);
    } catch {
      // toast handled in hook
    }
  };

  // Contact Reveal Safeguard: Call backend endpoint GET /matches/{id}/contact
  const handleViewContact = async (match: MaskedDonorMatchResponse) => {
    setSelectedMatch(match);
    try {
      const contact = await revealContactMutation.mutateAsync(match.match_id);
      setRevealedContact(contact);
    } catch {
      // If 403 Forbidden, toast with Safeguard warning is displayed by hook
      setRevealedContact(null);
    }
  };

  // Allow simulating/testing donor response directly for test ease
  const handleDonorResponse = async (matchId: string, status: "ACCEPTED" | "DECLINED") => {
    await respondMatchMutation.mutateAsync({
      matchId,
      payload: { response: status },
    });
    // Refresh local match status
    if (createdRequest?.matches) {
      const updated = createdRequest.matches.map((m) =>
        m.match_id === matchId ? { ...m, response_status: status } : m,
      );
      setCreatedRequest({ ...createdRequest, matches: updated });
    }
  };

  const isEmergency = isEmergencyLocked || form.urgency === "EMERGENCY" || createdRequest?.urgency === "EMERGENCY";
  const matches = createdRequest?.matches || [];

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      {isEmergency && (
        <div
          role="alert"
          className="border-b border-destructive/40 bg-destructive text-destructive-foreground py-3.5 px-4 shadow-md"
        >
          <div className="w-full max-w-7xl 2xl:max-w-[1500px] mx-auto flex items-start sm:items-center gap-3">
            <AlertTriangle className="size-5 shrink-0 mt-0.5 sm:mt-0 animate-pulse text-white" />
            <div className="text-sm">
              <p className="font-bold tracking-tight">
                Emergency Protocol Active: System applies a 1.5x urgency scoring multiplier and dispatches simultaneous instant alerts to all matching donors within radius.
              </p>
              <p className="text-xs text-destructive-foreground/90 mt-0.5">
                Urgency is locked to EMERGENCY mode. Donors within 50km radius receive instantaneous high-priority notifications.
              </p>
            </div>
          </div>
        </div>
      )}

      <main className="w-full max-w-7xl 2xl:max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Request blood</h1>
              {isEmergency && (
                <Badge variant="destructive" className="text-xs font-bold animate-pulse px-2.5 py-0.5">
                  EMERGENCY PROTOCOL
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              We'll match your request with compatible donors nearby, ranked by blood group, distance,
              and availability. Donor contact details stay private until they accept.
            </p>
          </div>
        </div>

        {!currentUser && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-5 shrink-0 text-amber-600" />
              <div>
                <span className="font-semibold">You're submitting as a guest.</span> Sign in as a{" "}
                <strong>recipient</strong> to track your request and contact matched donors.
              </div>
            </div>
            <AuthDialog defaultRole="RECIPIENT" defaultTab="login" />
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* Request Form */}
          <Card className={`h-fit shadow-[var(--shadow-elegant)] ${isEmergency ? "border-destructive/40" : ""}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {isEmergency ? <Zap className="size-4 text-destructive" /> : null}
                    Blood Request Form
                  </CardTitle>
                  <CardDescription>
                    {isEmergency
                      ? "High-priority fields broadcast to compatible donors and blood centers."
                      : "Sent to compatible donors and partner blood banks."}
                  </CardDescription>
                </div>
                {isEmergency && (
                  <Badge variant="destructive" className="text-[10px]">
                    1.5x Multiplier
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="patient">Patient Full Name</Label>
                  <Input
                    id="patient"
                    maxLength={100}
                    value={form.patient}
                    onChange={(e) => set("patient")(e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="rg">Required Blood Group</Label>
                  <Select value={form.group} onValueChange={set("group")}>
                    <SelectTrigger id="rg">
                      <SelectValue />
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

                {/* Required Component - High Priority */}
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="comp" className={isEmergency ? "font-semibold text-foreground" : ""}>
                      Required Component
                    </Label>
                    {isEmergency && (
                      <span className="text-[10px] text-destructive font-semibold">Priority</span>
                    )}
                  </div>
                  <Select
                    value={form.component}
                    onValueChange={(v) => set("component")(v as ComponentType)}
                  >
                    <SelectTrigger id="comp" className={isEmergency ? "border-destructive/30" : ""}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPONENTS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Required Units & Volume - High Priority */}
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="units" className={isEmergency ? "font-semibold text-foreground" : ""}>
                      Required Units
                    </Label>
                    {isEmergency && (
                      <span className="text-[10px] text-destructive font-semibold">Priority</span>
                    )}
                  </div>
                  <Input
                    id="units"
                    type="number"
                    min={0.5}
                    max={20}
                    step={0.5}
                    value={form.units}
                    onChange={(e) => handleUnitsChange(e.target.value)}
                    required
                    className={isEmergency ? "border-destructive/40 font-semibold" : ""}
                  />
                </div>

                {/* Volume in mL */}
                <div className="grid gap-2">
                  <Label htmlFor="vol">Estimated Volume (mL)</Label>
                  <Input
                    id="vol"
                    type="number"
                    min={100}
                    max={10000}
                    step={50}
                    value={form.volume_ml}
                    onChange={(e) => set("volume_ml")(e.target.value)}
                    placeholder="e.g. 450"
                  />
                </div>

                {/* Urgency Level - Locked in Emergency Mode */}
                <div className="grid gap-2 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="urg" className={isEmergencyLocked ? "font-semibold text-destructive" : ""}>
                      Urgency Level
                    </Label>
                    {isEmergencyLocked && (
                      <span className="text-[11px] text-destructive font-bold flex items-center gap-1">
                        <Lock className="size-3" /> Locked to Emergency
                      </span>
                    )}
                  </div>
                  <Select
                    value={form.urgency}
                    onValueChange={(v) => {
                      if (!isEmergencyLocked) {
                        set("urgency")(v as RequestUrgency);
                      }
                    }}
                    disabled={isEmergencyLocked}
                  >
                    <SelectTrigger
                      id="urg"
                      className={
                        isEmergencyLocked
                          ? "bg-destructive/10 border-destructive/50 font-bold text-destructive cursor-not-allowed"
                          : ""
                      }
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {URGENCIES.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Target Hospital & Quick Picks */}
                <div className="grid gap-2 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="hosp" className={isEmergency ? "font-semibold text-foreground" : ""}>
                      Hospital / Medical Facility Name
                    </Label>
                    <span className="text-[11px] text-muted-foreground">Quick Suggestions:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {POPULAR_HOSPITALS.slice(0, 5).map((h) => (
                      <button
                        key={h.name}
                        type="button"
                        onClick={() => handleQuickHospital(h)}
                        className="text-[11px] rounded-full border border-border px-2.5 py-0.5 bg-muted/40 hover:bg-primary/10 hover:border-primary/50 transition-colors"
                      >
                        {h.name.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                  <Input
                    id="hosp"
                    maxLength={150}
                    value={form.hospital_name}
                    onChange={(e) => set("hospital_name")(e.target.value)}
                    placeholder="e.g. United Hospital, Square Hospital, DMCH"
                    required
                    className={isEmergency ? "border-destructive/40 font-medium" : ""}
                  />
                </div>

                {/* Area Zone Dropdown */}
                <div className="grid gap-2">
                  <Label htmlFor="zone">Area Zone (Dhaka)</Label>
                  <Select value={form.area_zone} onValueChange={set("area_zone")}>
                    <SelectTrigger id="zone">
                      <SelectValue placeholder="Select Area Zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {DHAKA_ZONES.map((zone) => (
                        <SelectItem key={zone} value={zone}>
                          {zone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Ward / Specific Location */}
                <div className="grid gap-2">
                  <Label htmlFor="loc">Ward / Bed / Department</Label>
                  <Input
                    id="loc"
                    maxLength={150}
                    value={form.location}
                    onChange={(e) => set("location")(e.target.value)}
                    placeholder="e.g. ICU Ward Bed 04, Level 3"
                    required
                  />
                </div>

                {/* Immediate Contact Phone Number - High Priority */}
                <div className="grid gap-2 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="phone" className={isEmergency ? "font-semibold text-foreground" : ""}>
                      Attendant Phone Number (Direct Contact)
                    </Label>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <ShieldCheck className="size-3 text-primary" /> Masked from public until accepted
                    </span>
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    maxLength={30}
                    value={form.phone}
                    onChange={(e) => set("phone")(e.target.value)}
                    placeholder="e.g. +880 1711-223344"
                    required
                    className={isEmergency ? "border-destructive/50 font-semibold" : ""}
                  />
                </div>

                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="notes">Clinical / Special Instructions (optional)</Label>
                  <Textarea
                    id="notes"
                    maxLength={500}
                    placeholder="Provide special medical requirements, cross-matching requirements, or family instructions..."
                    value={form.notes}
                    onChange={(e) => set("notes")(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  className="sm:col-span-2"
                  variant={isEmergency ? "destructive" : "default"}
                  disabled={createRequestMutation.isPending || createEmergencyMutation.isPending}
                >
                  {createRequestMutation.isPending || createEmergencyMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Dispatching request & searching donors...
                    </>
                  ) : form.urgency === "EMERGENCY" ? (
                    "Dispatch Emergency Request (50 km broadcast)"
                  ) : (
                    "Find matching donors"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Matches & Contact Safeguard View */}
          <section id="live-matches-section">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">Matched donors</h2>
              {createdRequest && (
                <Badge variant={isEmergency ? "destructive" : "secondary"}>
                  {matches.length} matched · {createdRequest.status}
                </Badge>
              )}
            </div>

            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0 text-primary" />
              <strong>Contact stays private:</strong> donor details are masked until the donor
              accepts your request.
            </p>

            {createdRequest && (
              <Card className="mt-4 border-primary/30 bg-primary/5">
                <CardContent className="p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">
                        {createdRequest.patient_name || "Patient Blood Request"}
                      </span>
                      <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        {toDisplayBloodGroup(createdRequest.blood_group)}
                      </span>
                    </div>
                    <Badge
                      className={
                        createdRequest.status === "OPEN"
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : createdRequest.status === "ACCEPTED"
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : createdRequest.status === "PROCESSING"
                          ? "bg-amber-600 hover:bg-amber-700 text-white"
                          : createdRequest.status === "COMPLETED"
                          ? "bg-purple-600 hover:bg-purple-700 text-white"
                          : ""
                      }
                    >
                      {createdRequest.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <p>
                      <strong className="text-foreground">Hospital:</strong>{" "}
                      {createdRequest.hospital_name || createdRequest.required_location}
                    </p>
                    <p>
                      <strong className="text-foreground">Area Zone:</strong>{" "}
                      {createdRequest.area_zone || "Dhaka Zone"}
                    </p>
                    <p>
                      <strong className="text-foreground">Units & Volume:</strong>{" "}
                      {createdRequest.quantity} Unit(s) (
                      {createdRequest.volume_ml || Number(createdRequest.quantity) * 450} mL)
                    </p>
                    <p>
                      <strong className="text-foreground">Attendant Phone:</strong>{" "}
                      {createdRequest.attendant_phone_number || "Direct Coordinator"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {!createdRequest && (
              <Card className="mt-4 border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground text-sm">
                  Submit the form to find compatible donors.
                </CardContent>
              </Card>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {matches.map((match) => {
                const isAccepted = match.response_status === "ACCEPTED";
                const isDeclined = match.response_status === "DECLINED";

                return (
                  <Card key={match.match_id} className="shadow-[var(--shadow-elegant)]">
                    <CardContent className="space-y-3 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{match.donor_name_initial}</p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3.5" /> {match.distance_km} km away
                          </p>
                        </div>
                        <span className="rounded-md bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
                          {toDisplayBloodGroup(match.blood_group)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-[11px]">
                          Score: {match.match_score}/100
                        </Badge>
                        <Badge
                          variant={
                            isAccepted ? "default" : isDeclined ? "destructive" : "secondary"
                          }
                          className="text-[11px]"
                        >
                          Status: {match.response_status}
                        </Badge>
                      </div>

                      {/* Contact Reveal Safeguard box */}
                      <div className="rounded-lg border border-border bg-muted/50 p-3 text-xs">
                        <div className="flex items-center justify-between text-muted-foreground mb-1">
                          <span className="flex items-center gap-1.5">
                            <Lock className="size-3.5" /> Contact
                          </span>
                          <span className="text-[10px]">{isAccepted ? "Unlocked" : "Private"}</span>
                        </div>
                        <p className="font-mono text-muted-foreground">
                          {isAccepted ? "Ready for reveal" : "Phone: +88017••••••• (Masked)"}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full text-xs h-8 gap-1 font-medium"
                          onClick={() => setSelectedMapMatch(match)}
                        >
                          <MapPin className="size-3 text-red-600" /> View on Map
                        </Button>
                        <Button
                          className="w-full text-xs h-8"
                          variant={isAccepted ? "default" : "secondary"}
                          onClick={() => handleViewContact(match)}
                          disabled={revealContactMutation.isPending}
                        >
                          {isAccepted ? "View contact" : "Contact locked"}
                        </Button>

                        {/* Testing helper: simulate donor acceptance */}
                        {!isAccepted && !isDeclined && (
                          <div className="flex gap-1.5 pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-1/2 text-[10px] h-7"
                              onClick={() => handleDonorResponse(match.match_id, "ACCEPTED")}
                            >
                              Simulate Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-1/2 text-[10px] h-7"
                              onClick={() => handleDonorResponse(match.match_id, "DECLINED")}
                            >
                              Simulate Decline
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {createdRequest && matches.length === 0 && (
              <Card className="mt-4 border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground text-sm">
                  No eligible donors found within the current radius for {form.group} (
                  {form.component}).
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </main>

      {/* Revealed Contact Modal */}
      <Dialog open={!!revealedContact} onOpenChange={(o) => !o && setRevealedContact(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success">
              <CheckCircle2 className="size-5" />
              Contact unlocked
            </DialogTitle>
            <DialogDescription>
              This donor accepted your request. You can now contact them directly.
            </DialogDescription>
          </DialogHeader>
          {revealedContact && (
            <div className="space-y-3 py-2 text-sm">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2">
                <p className="font-semibold text-foreground text-base">
                  {revealedContact.full_name}
                </p>
                <p className="flex items-center gap-2 text-muted-foreground font-mono">
                  <Phone className="size-4 text-primary" /> {revealedContact.phone}
                </p>
                <p className="flex items-center gap-2 text-muted-foreground font-mono">
                  <Mail className="size-4 text-primary" /> {revealedContact.email}
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Home className="size-4 text-primary" /> {revealedContact.address}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setRevealedContact(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leaflet Map Dialog for Matched Donor (Doc §5) */}
      <Dialog open={!!selectedMapMatch} onOpenChange={(open) => !open && setSelectedMapMatch(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="size-5 text-red-600" />
              <span>Hospital & Matched Donor Map</span>
            </DialogTitle>
            <DialogDescription>
              Visualize hospital destination and approximate donor location (~1km privacy grid).
            </DialogDescription>
          </DialogHeader>

          {selectedMapMatch && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/40 border border-border text-xs">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <Building2 className="size-4 text-red-600" />
                  <span>{createdRequest?.hospital_name || createdRequest?.required_location || form.hospital_name}</span>
                </div>
                <Badge variant="secondary" className="font-mono text-xs font-semibold">
                  ~{selectedMapMatch.distance_km.toFixed(1)} km distance
                </Badge>
              </div>

              <Suspense
                fallback={
                  <div className="h-[280px] sm:h-[340px] rounded-xl bg-muted/30 border border-border flex items-center justify-center text-xs text-muted-foreground animate-pulse">
                    Loading Leaflet map...
                  </div>
                }
              >
                <DonorMap
                  hospitalLocation={{
                    lat: createdRequest?.latitude ?? 23.8103,
                    lng: createdRequest?.longitude ?? 90.4125,
                    name: createdRequest?.hospital_name || createdRequest?.required_location || form.hospital_name,
                    area: createdRequest?.area_zone || form.area_zone,
                  }}
                  donorLocation={{
                    lat: selectedMapMatch.approx_latitude ?? ((createdRequest?.latitude ?? 23.8103) + 0.015),
                    lng: selectedMapMatch.approx_longitude ?? ((createdRequest?.longitude ?? 90.4125) + 0.015),
                    label: selectedMapMatch.donor_name_initial,
                    bloodGroup: selectedMapMatch.blood_group,
                    isApproximate: true,
                  }}
                  heightClassName="h-[280px] sm:h-[340px]"
                />
              </Suspense>

              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 justify-center">
                <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
                <span>Donor residential coordinates are approximate to protect privacy until confirmed.</span>
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
