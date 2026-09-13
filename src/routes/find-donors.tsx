import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { List, MapIcon, MapPin, Phone, Lock, ShieldAlert, Users } from "lucide-react";
import { toast } from "sonner";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { BLOOD_GROUPS, HOSPITALS, MAP_DONORS, type MapDonor } from "@/lib/donor-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentUser } from "@/hooks/useAuth";
import { AuthDialog } from "@/components/AuthDialog";

const DonorMap = lazy(() => import("@/components/DonorMap"));

export const Route = createFileRoute("/find-donors")({
  head: () => ({
    meta: [
      { title: "Find Blood Donors Near You — LifeDrop" },
      {
        name: "description",
        content:
          "Search available blood donors by blood group and city, or switch to the proximity map to see donors and hospitals nearby.",
      },
      { property: "og:title", content: "Find Blood Donors Near You — LifeDrop" },
      {
        property: "og:description",
        content:
          "Search available donors by blood group, location and distance on an interactive map.",
      },
    ],
  }),
  component: FindDonors,
});

const GROUPS = ["All", ...BLOOD_GROUPS];
const RADII = [5, 10, 25, 50];

function FindDonors() {
  const { data: user } = useCurrentUser();
  const isAuthorizedRecipient = user?.role === "RECIPIENT" || user?.role === "SYSTEM_ADMIN";

  const [group, setGroup] = useState("All");
  const [city, setCity] = useState("");
  const [view, setView] = useState<"list" | "map">("list");
  const [radiusIndex, setRadiusIndex] = useState(1);
  const [mapGroups, setMapGroups] = useState<string[]>([]);

  const radiusKm = RADII[radiusIndex] ?? 10;

  const results = MAP_DONORS.filter(
    (d) =>
      (group === "All" || d.group === group) &&
      d.area.toLowerCase().includes(city.trim().toLowerCase()),
  );

  const mapDonors = useMemo(
    () =>
      MAP_DONORS.filter(
        (d) => d.distanceKm <= radiusKm && (mapGroups.length === 0 || mapGroups.includes(d.group)),
      ),
    [radiusKm, mapGroups],
  );

  const toggleGroup = (g: string) =>
    setMapGroups((gs) => (gs.includes(g) ? gs.filter((x) => x !== g) : [...gs, g]));

  const requestContact = (d: MapDonor) => {
    if (!isAuthorizedRecipient) {
      toast.error("You must be logged in as a Recipient to request direct donor contact.");
      return;
    }
    toast.success(`Contact approval requested from ${d.name}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Find Donors</h1>
            <p className="mt-2 text-muted-foreground">
              Browse registered donors as a list, or explore who is nearby on the map.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Donor view"
            className="inline-flex rounded-lg border border-border bg-muted/50 p-1"
          >
            {(["list", "map"] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  view === v
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v === "list" ? <List className="size-4" /> : <MapIcon className="size-4" />}
                {v === "list" ? "List View" : "Map View"}
              </button>
            ))}
          </div>
        </div>

        {!isAuthorizedRecipient && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-3">
              <ShieldAlert className="size-5 shrink-0 text-amber-600" />
              <div>
                <span className="font-semibold">Recipient Privacy Clearance:</span> Direct donor
                contact and live GPS coordinates are protected. Sign in as a{" "}
                <strong>Recipient</strong> to dispatch emergency matching.
              </div>
            </div>
            <AuthDialog defaultRole="RECIPIENT" defaultTab="login" />
          </div>
        )}

        {view === "list" ? (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-[200px_1fr]">
              <div className="grid gap-2">
                <Label htmlFor="g">Blood group</Label>
                <Select value={group} onValueChange={setGroup}>
                  <SelectTrigger id="g">
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
                <Label htmlFor="c">Area</Label>
                <Input
                  id="c"
                  placeholder="e.g. Gulshan"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((d) => (
                <Card key={d.id} className="shadow-[var(--shadow-elegant)]">
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{d.name}</p>
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="size-3.5" /> {d.area} · {d.distanceKm} km away
                        </p>
                      </div>
                      <span className="rounded-md bg-primary px-2.5 py-1 text-sm font-bold text-primary-foreground">
                        {d.group}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Last donated {d.lastDonationDays} days ago
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant={d.available ? "default" : "secondary"}>
                        {d.available ? "Available" : "Unavailable"}
                      </Badge>
                      <Button size="sm" disabled={!d.available} onClick={() => requestContact(d)}>
                        <Phone /> Contact
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {results.length === 0 && (
                <p className="text-muted-foreground">No donors match your filters.</p>
              )}
            </div>
          </>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
            <Card className="h-fit shadow-[var(--shadow-elegant)]">
              <CardHeader>
                <CardTitle className="text-base">Map controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Search radius</Label>
                    <span className="text-sm font-semibold text-primary">{radiusKm} km</span>
                  </div>
                  <Slider
                    value={[radiusIndex]}
                    onValueChange={([v]) => setRadiusIndex(v ?? 1)}
                    min={0}
                    max={3}
                    step={1}
                    aria-label="Search radius"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    {RADII.map((r) => (
                      <span key={r}>{r}km</span>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Blood group</Label>
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
                  {mapGroups.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setMapGroups([])}>
                      Clear filters
                    </Button>
                  )}
                </div>

                <div className="space-y-2 border-t border-border pt-4 text-sm">
                  <p className="font-medium">
                    {mapDonors.length} donor(s) within {radiusKm} km
                  </p>
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <span className="inline-block size-3 rounded-full bg-primary" /> Donor
                  </p>
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <span className="inline-block size-3 rounded-full bg-blue-700" /> Hospital (
                    {HOSPITALS.length})
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden shadow-[var(--shadow-elegant)]">
              <CardContent className="p-0">
                {isAuthorizedRecipient ? (
                  <ClientOnly fallback={<Skeleton className="h-[520px] w-full" />}>
                    <Suspense fallback={<Skeleton className="h-[520px] w-full" />}>
                      <DonorMap
                        donors={mapDonors}
                        radiusKm={radiusKm}
                        onRequestContact={requestContact}
                      />
                    </Suspense>
                  </ClientOnly>
                ) : (
                  <div className="relative h-[520px] w-full flex items-center justify-center p-6 bg-muted/20">
                    <div className="absolute inset-0 select-none pointer-events-none filter blur-[3px] opacity-40 bg-slate-900/90" />
                    <div className="relative max-w-md rounded-xl border border-border bg-card/95 p-6 text-center shadow-xl space-y-4">
                      <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Lock className="size-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground">
                          Geospatial Privacy Safeguard
                        </h3>
                        <p className="mt-1 text-xs text-foreground/80 font-medium">
                          Log in as a Recipient to view and search real-time donors nearby (Privacy
                          Protected)
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Real-time donor proximity queries are restricted to authorized recipients
                          and hospital blood dispatchers.
                        </p>
                      </div>
                      <div className="flex justify-center gap-2 pt-1">
                        <AuthDialog
                          defaultRole="RECIPIENT"
                          trigger={<Button size="sm">Sign In as Recipient</Button>}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
