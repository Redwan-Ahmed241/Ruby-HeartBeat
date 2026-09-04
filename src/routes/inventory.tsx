import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Droplet, Search, Siren } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Blood Inventory Levels — LifeDrop" },
      {
        name: "description",
        content:
          "Live stock levels by blood group and component, shortage alerts and an emergency request feed across partner blood banks.",
      },
      { property: "og:title", content: "Blood Inventory Levels — LifeDrop" },
      {
        property: "og:description",
        content: "Track units per group and component, with critical shortage alerts in real time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Inventory,
});

const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
type Group = (typeof GROUPS)[number];

const COMPONENTS = ["Whole Blood", "Plasma", "Platelets"] as const;
type Component = (typeof COMPONENTS)[number];

const CAPACITY = 60;

const STOCK: Record<Group, Record<Component, number>> = {
  "A+": { "Whole Blood": 42, Plasma: 24, Platelets: 15 },
  "A-": { "Whole Blood": 8, Plasma: 6, Platelets: 3 },
  "B+": { "Whole Blood": 35, Plasma: 19, Platelets: 12 },
  "B-": { "Whole Blood": 5, Plasma: 4, Platelets: 0 },
  "AB+": { "Whole Blood": 14, Plasma: 11, Platelets: 6 },
  "AB-": { "Whole Blood": 2, Plasma: 1, Platelets: 0 },
  "O+": { "Whole Blood": 51, Plasma: 28, Platelets: 21 },
  "O-": { "Whole Blood": 9, Plasma: 7, Platelets: 2 },
};

type StatusKey = "healthy" | "low" | "critical" | "out";

const STATUS: Record<StatusKey, { label: string; className: string }> = {
  healthy: { label: "Healthy", className: "bg-success text-success-foreground" },
  low: { label: "Low Stock", className: "bg-warning text-warning-foreground" },
  critical: { label: "Critical", className: "bg-caution text-caution-foreground" },
  out: { label: "Out of Stock", className: "bg-destructive text-destructive-foreground" },
};

function statusOf(units: number): StatusKey {
  if (units <= 0) return "out";
  if (units < 6) return "critical";
  if (units < 20) return "low";
  return "healthy";
}

type EmergencyRequest = {
  id: string;
  patient: string;
  group: Group;
  component: Component;
  units: number;
  hospital: string;
  distanceKm: number;
  minutesAgo: number;
};

const EMERGENCIES: EmergencyRequest[] = [
  { id: "e1", patient: "Road accident — ICU", group: "O-", component: "Whole Blood", units: 3, hospital: "Square Hospital, Panthapath", distanceKm: 2.3, minutesAgo: 4 },
  { id: "e2", patient: "Post-partum haemorrhage", group: "B-", component: "Whole Blood", units: 2, hospital: "Popular Diagnostic, Dhanmondi", distanceKm: 3.8, minutesAgo: 11 },
  { id: "e3", patient: "Dengue — platelet crash", group: "AB-", component: "Platelets", units: 4, hospital: "Evercare Hospital, Bashundhara", distanceKm: 7.1, minutesAgo: 23 },
  { id: "e4", patient: "Cardiac surgery", group: "A+", component: "Plasma", units: 2, hospital: "United Hospital, Gulshan", distanceKm: 5.2, minutesAgo: 35 },
];

function Inventory() {
  const [query, setQuery] = useState("");
  const [component, setComponent] = useState<Component | "All">("All");
  const [status, setStatus] = useState<StatusKey | "All">("All");
  const [handled, setHandled] = useState<Record<string, "responded" | "fulfilled">>({});

  const rows = useMemo(
    () =>
      GROUPS.map((group) => {
        const byComponent = STOCK[group];
        const total =
          component === "All"
            ? COMPONENTS.reduce((s, c) => s + byComponent[c], 0)
            : byComponent[component];
        return { group, byComponent, total, status: statusOf(total) };
      }),
    [component],
  );

  const shortages = rows.filter((r) => r.status === "critical" || r.status === "out");

  const visible = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || r.group.toLowerCase().includes(q);
    const matchesStatus = status === "All" || r.status === status;
    return matchesQuery && matchesStatus;
  });

  const totalUnits = rows.reduce((s, r) => s + r.total, 0);
  const maxUnits = component === "All" ? CAPACITY * 2 : CAPACITY;

  const act = (req: EmergencyRequest, kind: "responded" | "fulfilled") => {
    setHandled((h) => ({ ...h, [req.id]: kind }));
    toast.success(
      kind === "responded"
        ? `You're on the way for ${req.group} ${req.component} at ${req.hospital}`
        : `Request fulfilled — ${req.units} unit(s) of ${req.group} ${req.component} dispatched`,
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      {shortages.length > 0 && (
        <div
          role="alert"
          className="animate-pulse-slow border-b border-destructive/40 bg-destructive text-destructive-foreground"
        >
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
            <AlertTriangle className="size-5 shrink-0" />
            <p className="text-sm font-semibold">
              URGENT SHORTAGE — {shortages.map((s) => s.group).join(", ")}{" "}
              {shortages.length === 1 ? "is" : "are"} critically low or out of stock
              {component !== "All" ? ` for ${component}` : ""}. Donors of these groups are urgently
              needed.
            </p>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Blood Inventory</h1>
        <p className="mt-2 text-muted-foreground">
          {totalUnits} units in stock across partner blood banks
          {component === "All" ? " (all components)" : ` of ${component}`}.
        </p>

        <Card className="mt-6 shadow-[var(--shadow-elegant)]">
          <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="q">Search blood group</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="q"
                  className="pl-9"
                  placeholder="e.g. O-"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="comp">Component</Label>
              <Select value={component} onValueChange={(v) => setComponent(v as Component | "All")}>
                <SelectTrigger id="comp">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All components</SelectItem>
                  {COMPONENTS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="st">Stock status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as StatusKey | "All")}>
                <SelectTrigger id="st">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All statuses</SelectItem>
                  {(Object.keys(STATUS) as StatusKey[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {STATUS[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((row) => (
            <Card key={row.group} className="shadow-[var(--shadow-elegant)]">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-2xl font-bold text-primary">
                    <Droplet className="size-5" />
                    {row.group}
                  </span>
                  <Badge className={STATUS[row.status].className}>
                    {STATUS[row.status].label}
                  </Badge>
                </div>
                <Progress value={Math.min(100, (row.total / maxUnits) * 100)} />
                <p className="text-sm text-muted-foreground">{row.total} units available</p>
                <ul className="space-y-1 border-t border-border pt-3 text-sm">
                  {COMPONENTS.map((c) => (
                    <li key={c} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{c}</span>
                      <span
                        className={
                          row.byComponent[c] === 0 ? "font-semibold text-destructive" : "font-medium"
                        }
                      >
                        {row.byComponent[c]}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {visible.length === 0 && (
          <Card className="mt-4 border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground">
              No blood groups match your search or filters.
            </CardContent>
          </Card>
        )}

        <section className="mt-12">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Siren className="size-5 text-destructive" /> Live emergency feed
            </h2>
            <Badge variant="destructive" className="animate-pulse-slow">
              {EMERGENCIES.filter((e) => !handled[e.id]).length} active
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Active requests from nearby hospitals. Donors and admins can respond or fulfill.
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {EMERGENCIES.map((req) => {
              const state = handled[req.id];
              return (
                <Card key={req.id} className="border-destructive/30 shadow-[var(--shadow-elegant)]">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{req.patient}</CardTitle>
                        <CardDescription>
                          {req.hospital} · {req.distanceKm} km · {req.minutesAgo} min ago
                        </CardDescription>
                      </div>
                      <span className="rounded-md bg-primary px-2.5 py-1 text-sm font-bold text-primary-foreground">
                        {req.group}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{req.component}</Badge>
                      <Badge variant="secondary">{req.units} unit(s)</Badge>
                      <Badge className={STATUS[statusOf(STOCK[req.group][req.component])].className}>
                        Stock: {STOCK[req.group][req.component]}
                      </Badge>
                    </div>
                    {state ? (
                      <p className="rounded-lg bg-muted px-3 py-2 text-sm font-medium">
                        {state === "responded"
                          ? "You responded — hospital notified."
                          : "Request fulfilled from inventory."}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button className="flex-1" onClick={() => act(req, "responded")}>
                          Respond to Emergency
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => act(req, "fulfilled")}
                        >
                          Fulfill Request
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
