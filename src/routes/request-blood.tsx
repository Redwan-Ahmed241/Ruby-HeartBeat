import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AlertTriangle, Lock, MapPin, ShieldCheck } from "lucide-react";
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

const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
type Group = (typeof GROUPS)[number];

const COMPONENTS = ["Whole Blood", "Plasma", "Platelets"] as const;
const URGENCIES = ["Normal", "Urgent", "Emergency"] as const;
type Urgency = (typeof URGENCIES)[number];

// Red-cell compatibility: which donor groups can give to a recipient group.
const RED_CELL_DONORS: Record<Group, Group[]> = {
  "A+": ["A+", "A-", "O+", "O-"],
  "A-": ["A-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
  "AB-": ["A-", "B-", "AB-", "O-"],
  "O+": ["O+", "O-"],
  "O-": ["O-"],
};

// Plasma compatibility is inverted relative to red cells.
const PLASMA_DONORS: Record<Group, Group[]> = {
  "A+": ["A+", "A-", "AB+", "AB-"],
  "A-": ["A+", "A-", "AB+", "AB-"],
  "B+": ["B+", "B-", "AB+", "AB-"],
  "B-": ["B+", "B-", "AB+", "AB-"],
  "AB+": ["AB+", "AB-"],
  "AB-": ["AB+", "AB-"],
  "O+": GROUPS as unknown as Group[],
  "O-": GROUPS as unknown as Group[],
};

type Donor = {
  id: string;
  name: string;
  group: Group;
  area: string;
  distanceKm: number;
  phone: string;
  email: string;
  available: boolean;
  lastDonationDays: number;
};

const DONORS: Donor[] = [
  { id: "d1", name: "Ayesha Rahman", group: "O-", area: "Dhanmondi", distanceKm: 1.4, phone: "+8801711234567", email: "ayesha.r@example.com", available: true, lastDonationDays: 142 },
  { id: "d2", name: "Tanvir Hasan", group: "O+", area: "Mirpur", distanceKm: 3.2, phone: "+8801822345678", email: "tanvir.h@example.com", available: true, lastDonationDays: 98 },
  { id: "d3", name: "Nusrat Jahan", group: "A-", area: "Gulshan", distanceKm: 2.1, phone: "+8801933456789", email: "nusrat.j@example.com", available: true, lastDonationDays: 210 },
  { id: "d4", name: "Imran Kabir", group: "AB+", area: "Uttara", distanceKm: 8.6, phone: "+8801644567890", email: "imran.k@example.com", available: true, lastDonationDays: 120 },
  { id: "d5", name: "Sadia Islam", group: "B+", area: "Bashundhara", distanceKm: 5.9, phone: "+8801555678901", email: "sadia.i@example.com", available: true, lastDonationDays: 365 },
  { id: "d6", name: "Rafiul Karim", group: "A+", area: "Banani", distanceKm: 2.8, phone: "+8801766789012", email: "rafiul.k@example.com", available: true, lastDonationDays: 190 },
  { id: "d7", name: "Mahmud Alam", group: "AB-", area: "Motijheel", distanceKm: 6.4, phone: "+8801877890123", email: "mahmud.a@example.com", available: true, lastDonationDays: 130 },
  { id: "d8", name: "Farhana Chowdhury", group: "B-", area: "Mohakhali", distanceKm: 4.3, phone: "+8801988901234", email: "farhana.c@example.com", available: true, lastDonationDays: 156 },
  { id: "d9", name: "Shakil Ahmed", group: "O+", area: "Badda", distanceKm: 7.7, phone: "+8801699012345", email: "shakil.a@example.com", available: false, lastDonationDays: 40 },
];

function maskPhone(phone: string) {
  return `${phone.slice(0, 5)}••••••${phone.slice(-2)}`;
}

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  return `${(user ?? "").slice(0, 2)}•••@•••.${(domain ?? "").split(".").pop()}`;
}

const schema = z.object({
  patient: z.string().trim().min(1, "Patient name is required").max(100),
  group: z.enum(GROUPS),
  component: z.enum(COMPONENTS),
  units: z.coerce.number().int().min(1, "At least 1 unit").max(10, "Maximum 10 units"),
  urgency: z.enum(URGENCIES),
  location: z.string().trim().min(3, "Delivery location is required").max(150),
  notes: z.string().trim().max(500).optional(),
});

type RequestData = z.infer<typeof schema>;

function RequestBlood() {
  const [form, setForm] = useState({
    patient: "",
    group: "O+" as Group,
    component: "Whole Blood" as (typeof COMPONENTS)[number],
    units: "1",
    urgency: "Normal" as Urgency,
    location: "",
    notes: "",
  });
  const [request, setRequest] = useState<RequestData | null>(null);
  const [contactDonor, setContactDonor] = useState<Donor | null>(null);
  const [contactMessage, setContactMessage] = useState("");
  const [approvedIds, setApprovedIds] = useState<string[]>([]);
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const matches = useMemo(() => {
    if (!request) return [];
    const table = request.component === "Plasma" ? PLASMA_DONORS : RED_CELL_DONORS;
    const compatible = table[request.group];
    return DONORS.filter((d) => d.available && compatible.includes(d.group))
      .map((d) => ({
        donor: d,
        exact: d.group === request.group,
        universal: d.group === "O-" || d.group === "AB-",
      }))
      .sort((a, b) => {
        const rank = (m: typeof a) => (m.exact ? 0 : m.universal ? 1 : 2);
        return rank(a) - rank(b) || a.donor.distanceKm - b.donor.distanceKm;
      });
  }, [request]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your details");
      return;
    }
    setRequest(parsed.data);
    setApprovedIds([]);
    setPendingIds([]);
    toast.success("Request posted — matching donors found");
  };

  const sendContactRequest = () => {
    if (!contactDonor) return;
    if (contactMessage.trim().length > 500) return;
    setPendingIds((p) => [...p, contactDonor.id]);
    toast.success(`Contact approval requested from ${contactDonor.name}`);
    // Simulated donor approval response.
    const id = contactDonor.id;
    setTimeout(() => {
      setPendingIds((p) => p.filter((x) => x !== id));
      setApprovedIds((a) => [...a, id]);
    }, 2500);
    setContactDonor(null);
    setContactMessage("");
  };

  const isEmergency = request?.urgency === "Emergency";

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
              EMERGENCY REQUEST — {request?.units} unit(s) of {request?.group}{" "}
              {request?.component} needed now at {request?.location}. Alerting all matching donors
              nearby.
            </p>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Request Blood</h1>
        <p className="mt-2 text-muted-foreground">
          Submit a request and we match compatible, available donors ranked by blood group and
          distance.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <Card className="h-fit shadow-[var(--shadow-elegant)]">
            <CardHeader>
              <CardTitle>Blood request form</CardTitle>
              <CardDescription>All fields except notes are required</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="patient">Patient name</Label>
                  <Input
                    id="patient"
                    maxLength={100}
                    value={form.patient}
                    onChange={(e) => set("patient")(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="rg">Required blood group</Label>
                  <Select value={form.group} onValueChange={set("group")}>
                    <SelectTrigger id="rg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GROUPS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="comp">Blood component</Label>
                  <Select value={form.component} onValueChange={set("component")}>
                    <SelectTrigger id="comp">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPONENTS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="units">Amount needed (units/bags)</Label>
                  <Input
                    id="units"
                    type="number"
                    min={1}
                    max={10}
                    value={form.units}
                    onChange={(e) => set("units")(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="urg">Urgency level</Label>
                  <Select value={form.urgency} onValueChange={set("urgency")}>
                    <SelectTrigger id="urg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {URGENCIES.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="loc">Delivery location</Label>
                  <Input
                    id="loc"
                    maxLength={150}
                    placeholder="Hospital name, area"
                    value={form.location}
                    onChange={(e) => set("location")(e.target.value)}
                  />
                </div>

                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    maxLength={500}
                    value={form.notes}
                    onChange={(e) => set("notes")(e.target.value)}
                  />
                </div>

                <Button type="submit" className="sm:col-span-2">
                  Find matching donors
                </Button>
              </form>
            </CardContent>
          </Card>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">Matching donors</h2>
              {request && (
                <Badge variant={isEmergency ? "destructive" : "secondary"}>
                  {matches.length} compatible · {request.urgency}
                </Badge>
              )}
            </div>

            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <ShieldCheck className="size-4" /> Contact details stay hidden until the donor
              approves your request.
            </p>

            {!request && (
              <Card className="mt-4 border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">
                  Submit a request to see ranked, compatible donors.
                </CardContent>
              </Card>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {matches.map(({ donor, exact }) => {
                const approved = approvedIds.includes(donor.id);
                const pending = pendingIds.includes(donor.id);
                return (
                  <Card key={donor.id} className="shadow-[var(--shadow-elegant)]">
                    <CardContent className="space-y-3 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{donor.name}</p>
                          <p className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="size-3.5" /> {donor.area} · {donor.distanceKm} km
                          </p>
                        </div>
                        <span className="rounded-md bg-primary px-2.5 py-1 text-sm font-bold text-primary-foreground">
                          {donor.group}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant={exact ? "default" : "secondary"}>
                          {exact ? "Exact match" : "Compatible"}
                        </Badge>
                        <Badge variant="secondary">
                          Last donated {donor.lastDonationDays}d ago
                        </Badge>
                      </div>

                      <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
                        <p className="flex items-center gap-2 font-mono text-muted-foreground">
                          <Lock className="size-3.5" />
                          {approved ? donor.phone : maskPhone(donor.phone)}
                        </p>
                        <p className="mt-1 font-mono text-muted-foreground">
                          {approved ? donor.email : maskEmail(donor.email)}
                        </p>
                      </div>

                      <Button
                        className="w-full"
                        variant={approved ? "secondary" : "default"}
                        disabled={approved || pending}
                        onClick={() => setContactDonor(donor)}
                      >
                        {approved
                          ? "Contact shared"
                          : pending
                            ? "Awaiting approval…"
                            : "Request Contact Approval"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {request && matches.length === 0 && (
              <Card className="mt-4 border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">
                  No available donors match {request.group} {request.component} right now.
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </main>

      <Dialog open={!!contactDonor} onOpenChange={(o) => !o && setContactDonor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request contact approval</DialogTitle>
            <DialogDescription>
              {contactDonor?.name} will receive your request. Their phone and email are revealed
              only after they approve.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="msg">Message to donor (optional)</Label>
            <Textarea
              id="msg"
              maxLength={500}
              placeholder={`Need ${form.units} unit(s) of ${form.group} ${form.component} at ${form.location || "our location"}.`}
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDonor(null)}>
              Cancel
            </Button>
            <Button onClick={sendContactRequest}>Send request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
