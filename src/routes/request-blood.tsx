import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  AlertTriangle,
  Lock,
  MapPin,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Sparkles,
  Phone,
  Mail,
  Home,
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
import {
  BLOOD_GROUP_UI_MAP,
  toApiBloodGroup,
  toDisplayBloodGroup,
  type BloodGroup,
  type ComponentType,
  type RequestUrgency,
  type BloodRequestResponse,
  type MaskedDonorMatchResponse,
  type DonorContactReveal,
} from "@/lib/api/types";

export const Route = createFileRoute("/request-blood")({
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

const UI_GROUPS = Object.values(BLOOD_GROUP_UI_MAP);
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

const schema = z.object({
  patient: z.string().trim().min(1, "Patient name is required").max(100),
  group: z.string().min(1, "Blood group is required"),
  component: z.enum(["WHOLE_BLOOD", "PLASMA", "PLATELETS"]),
  units: z.coerce.number().min(0.5, "At least 0.5 unit").max(20, "Maximum 20 units"),
  urgency: z.enum(["NORMAL", "URGENT", "EMERGENCY"]),
  location: z.string().trim().min(3, "Delivery location is required").max(150),
  notes: z.string().trim().max(500).optional(),
});

function RequestBlood() {
  const { data: currentUser } = useCurrentUser();

  const [form, setForm] = useState({
    patient: "Patient Rahman",
    group: "O+",
    component: "WHOLE_BLOOD" as ComponentType,
    units: "1",
    urgency: "NORMAL" as RequestUrgency,
    location: "United Hospital, Gulshan 2, Dhaka",
    notes: "",
  });

  const [createdRequest, setCreatedRequest] = useState<BloodRequestResponse | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<MaskedDonorMatchResponse | null>(null);
  const [revealedContact, setRevealedContact] = useState<DonorContactReveal | null>(null);

  const createRequestMutation = useCreateBloodRequest();
  const createEmergencyMutation = useCreateEmergencyRequest();
  const respondMatchMutation = useRespondToMatch();
  const revealContactMutation = useRevealDonorContact();

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error("Please sign in or use the 1-Click Role Switcher first.");
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
      urgency: form.urgency,
      required_location: form.location,
      latitude: 23.7998,
      longitude: 90.4208,
      notes: form.notes || null,
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
        m.match_id === matchId ? { ...m, response_status: status } : m
      );
      setCreatedRequest({ ...createdRequest, matches: updated });
    }
  };

  const isEmergency = form.urgency === "EMERGENCY" || createdRequest?.urgency === "EMERGENCY";
  const matches = createdRequest?.matches || [];

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      {isEmergency && (
        <div
          role="alert"
          className="animate-pulse-slow border-b border-destructive/40 bg-destructive text-destructive-foreground"
        >
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <AlertTriangle className="size-5 shrink-0" />
            <p className="text-sm font-semibold">
              EMERGENCY BROADCAST — Alerting all compatible donors across a 50 km radius via the
              FastAPI Matching Engine.
            </p>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Request Blood</h1>
        <p className="mt-2 text-muted-foreground">
          Submit your request to trigger the Intelligent Real-Time Matching Engine, ranking donors by
          compatibility, distance, and reliability with Contact Privacy enforced.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* Request Form */}
          <Card className="h-fit shadow-[var(--shadow-elegant)]">
            <CardHeader>
              <CardTitle>Blood Request Form</CardTitle>
              <CardDescription>Directly dispatches into Supabase database</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="patient">Patient Name</Label>
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
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="comp">Blood Component</Label>
                  <Select
                    value={form.component}
                    onValueChange={(v) => set("component")(v as ComponentType)}
                  >
                    <SelectTrigger id="comp">
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

                <div className="grid gap-2">
                  <Label htmlFor="units">Units Needed</Label>
                  <Input
                    id="units"
                    type="number"
                    min={0.5}
                    max={20}
                    step={0.5}
                    value={form.units}
                    onChange={(e) => set("units")(e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="urg">Urgency Level</Label>
                  <Select
                    value={form.urgency}
                    onValueChange={(v) => set("urgency")(v as RequestUrgency)}
                  >
                    <SelectTrigger id="urg">
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

                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="loc">Hospital / Delivery Location</Label>
                  <Input
                    id="loc"
                    maxLength={150}
                    value={form.location}
                    onChange={(e) => set("location")(e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    maxLength={500}
                    placeholder="Provide patient ward, bed number, or specific clinical instructions..."
                    value={form.notes}
                    onChange={(e) => set("notes")(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  className="sm:col-span-2"
                  disabled={createRequestMutation.isPending || createEmergencyMutation.isPending}
                >
                  {createRequestMutation.isPending || createEmergencyMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Running Matching Engine...
                    </>
                  ) : form.urgency === "EMERGENCY" ? (
                    "Dispatch Emergency Request (50km Sweep)"
                  ) : (
                    "Find Matching Donors"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Matches & Contact Safeguard View */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">Matched Donors</h2>
              {createdRequest && (
                <Badge variant={isEmergency ? "destructive" : "secondary"}>
                  {matches.length} Dispatched · {createdRequest.status}
                </Badge>
              )}
            </div>

            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-primary shrink-0" />
              <strong>Contact Reveal Safeguard Active:</strong> Donor details remain masked until the
              donor explicitly approves the match in accordance with security specifications.
            </p>

            {!createdRequest && (
              <Card className="mt-4 border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground text-sm">
                  Submit the request form to execute the matching algorithm against registered donors.
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
                            isAccepted
                              ? "default"
                              : isDeclined
                              ? "destructive"
                              : "secondary"
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
                            <Lock className="size-3.5" /> Contact Privacy
                          </span>
                          <span className="text-[10px]">
                            {isAccepted ? "Verified & Revealed" : "Safeguard Protected"}
                          </span>
                        </div>
                        <p className="font-mono text-muted-foreground">
                          {isAccepted ? "Ready for reveal" : "Phone: +88017••••••• (Masked)"}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Button
                          className="w-full text-xs h-8"
                          variant={isAccepted ? "default" : "secondary"}
                          onClick={() => handleViewContact(match)}
                          disabled={revealContactMutation.isPending}
                        >
                          {isAccepted ? "View Revealed Contact" : "Attempt Contact Reveal"}
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
                  No eligible donors found within the current radius for {form.group} ({form.component}).
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
            <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
              Contact Revealed (Safeguard Approved)
            </DialogTitle>
            <DialogDescription>
              The donor has explicitly ACCEPTED this request. You are authorized to contact them directly.
            </DialogDescription>
          </DialogHeader>
          {revealedContact && (
            <div className="space-y-3 py-2 text-sm">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2">
                <p className="font-semibold text-foreground text-base">{revealedContact.full_name}</p>
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
    </div>
  );
}
