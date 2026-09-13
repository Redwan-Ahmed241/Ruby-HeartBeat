import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState, lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import {
  AlertCircle,
  PlusCircle,
  MapPin,
  ClipboardList,
  ShieldAlert,
  Loader2,
  Phone,
  CheckCircle2,
  Clock,
  Droplet,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { AuthDialog } from "@/components/AuthDialog";
import { useCurrentUser } from "@/hooks/useAuth";
import { useBloodRequests } from "@/hooks/useRequests";
import { BLOOD_GROUPS, HOSPITALS, MAP_DONORS, type MapDonor } from "@/lib/donor-data";
import { toDisplayBloodGroup } from "@/lib/api/types";
import { toast } from "sonner";

const DonorMap = lazy(() => import("@/components/DonorMap"));

export const Route = createFileRoute("/recipient")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab as "overview" | "requests" | "map") || "overview",
  }),
  head: () => ({
    meta: [
      { title: "Recipient Dashboard — LifeDrop" },
      {
        name: "description",
        content: "Track blood requests and find matching donors in real time.",
      },
    ],
  }),
  component: RecipientDashboardPage,
});

const RADII = [5, 10, 25, 50];

function RecipientDashboardPage() {
  const { tab } = useSearch({ from: "/recipient" });
  const [activeTab, setActiveTab] = useState<string>(tab || "overview");
  const { data: user, isLoading: userLoading } = useCurrentUser();

  // Requests query
  const {
    data: requests,
    isLoading: requestsLoading,
    refetch: refetchRequests,
  } = useBloodRequests();

  // Nearby Donor Map states
  const [radiusIndex, setRadiusIndex] = useState(1);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const radiusKm = RADII[radiusIndex] ?? 10;

  const filteredMapDonors = MAP_DONORS.filter(
    (d) =>
      d.distanceKm <= radiusKm && (selectedGroups.length === 0 || selectedGroups.includes(d.group)),
  );

  const toggleGroup = (g: string) =>
    setSelectedGroups((gs) => (gs.includes(g) ? gs.filter((x) => x !== g) : [...gs, g]));

  const requestContact = (d: MapDonor) =>
    toast.success(`Direct contact request sent to ${d.name} (${d.group})`);

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

  // Route Guard check
  if (!user || (user.role !== "RECIPIENT" && user.role !== "SYSTEM_ADMIN")) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 mb-4">
            <ShieldAlert className="size-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Recipient Access Required</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            {user
              ? `You are logged in as ${user.role}. This portal is reserved for registered blood recipients and emergency seekers.`
              : "Log in as a Recipient to view your active blood requests, access real-time nearby donors, and request urgent blood dispatch."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <AuthDialog defaultTab="login" defaultRole="RECIPIENT" />
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
        {/* Top Header with Emergency CTA */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Recipient Dashboard</h1>
              <Badge
                variant="outline"
                className="text-xs uppercase font-semibold text-primary border-primary"
              >
                RECIPIENT
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Track your blood requests, dispatch matched donors, and access real-time proximity
              map.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/requests/new">
              <Button variant="outline" size="sm" className="text-xs">
                <PlusCircle className="mr-1.5 size-4" /> Create Standard Request
              </Button>
            </Link>
            <Link to="/requests/emergency">
              <Button size="sm" variant="destructive" className="text-xs font-semibold shadow-sm">
                <AlertCircle className="mr-1.5 size-4" /> Emergency Request
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ClipboardList className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Active Requests</p>
                <p className="text-2xl font-bold">{requests?.length || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Verified Donors Nearby</p>
                <p className="text-2xl font-bold">
                  {filteredMapDonors.length} in {radiusKm}km
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
                <AlertCircle className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Emergency Response Time</p>
                <p className="text-2xl font-bold">&lt; 15 mins</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Overview, Requests, Map */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="requests">My Requests</TabsTrigger>
            <TabsTrigger value="map">Nearby Donors (Map)</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <Card className="shadow-[var(--shadow-elegant)]">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Recent Blood Requests</CardTitle>
                  <CardDescription>
                    Your live requests registered in the emergency dispatch queue
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchRequests()}
                  className="text-xs"
                >
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {requestsLoading ? (
                  <div className="py-8 text-center">
                    <Loader2 className="mx-auto size-6 animate-spin text-primary" />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Loading requests from backend...
                    </p>
                  </div>
                ) : !requests || requests.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center">
                    <Droplet className="mx-auto size-8 text-muted-foreground/60" />
                    <p className="mt-2 text-sm font-semibold">No active blood requests</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Need blood units for a patient? Create a request to trigger donor
                      notification.
                    </p>
                    <Link to="/requests/new" className="mt-4 inline-block">
                      <Button size="sm">Create Request</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requests.slice(0, 3).map((r) => (
                      <div
                        key={r.request_id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 shadow-sm"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base text-primary">
                              {toDisplayBloodGroup(r.blood_group)}
                            </span>
                            <Badge variant={r.urgency === "CRITICAL" ? "destructive" : "secondary"}>
                              {r.urgency}
                            </Badge>
                            <Badge variant="outline">{r.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {r.units_needed} units required ·{" "}
                            {r.hospital_name || "Hospital Assigned"}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="size-3" /> Created:{" "}
                            {new Date(r.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" className="text-xs">
                          View Matches
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Map Snippet */}
            <Card className="shadow-[var(--shadow-elegant)]">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="size-5 text-primary" /> Verified Donors Within {radiusKm}km
                  </CardTitle>
                  <CardDescription>
                    Privacy-Protected GPS locations of active registered donors
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("map")}
                  className="text-xs"
                >
                  Full Map View
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <ClientOnly fallback={<Skeleton className="h-[360px] w-full" />}>
                  <Suspense fallback={<Skeleton className="h-[360px] w-full" />}>
                    <DonorMap
                      donors={filteredMapDonors.slice(0, 10)}
                      radiusKm={radiusKm}
                      onRequestContact={requestContact}
                    />
                  </Suspense>
                </ClientOnly>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="mt-6">
            <Card className="shadow-[var(--shadow-elegant)]">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">All Blood Requests</CardTitle>
                  <CardDescription>Full history and live status tracking</CardDescription>
                </div>
                <Link to="/requests/new">
                  <Button size="sm">
                    <PlusCircle className="mr-1.5 size-4" /> New Request
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {!requests || requests.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No blood requests found.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {requests.map((r) => (
                      <div
                        key={r.request_id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 shadow-sm"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base text-primary">
                              {toDisplayBloodGroup(r.blood_group)}
                            </span>
                            <Badge variant={r.urgency === "CRITICAL" ? "destructive" : "secondary"}>
                              {r.urgency}
                            </Badge>
                            <Badge variant="outline">{r.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {r.units_needed} units required ·{" "}
                            {r.hospital_name || "General Facility"}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground text-right">
                          <p>ID: {r.request_id.slice(0, 8)}...</p>
                          <p>{new Date(r.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Full Map Tab */}
          <TabsContent value="map" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
              <Card className="h-fit shadow-[var(--shadow-elegant)]">
                <CardHeader>
                  <CardTitle className="text-base">Proximity Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Search Radius</Label>
                      <span className="text-sm font-semibold text-primary">{radiusKm} km</span>
                    </div>
                    <Slider
                      value={[radiusIndex]}
                      onValueChange={([v]) => setRadiusIndex(v ?? 1)}
                      min={0}
                      max={3}
                      step={1}
                      aria-label="Radius slider"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      {RADII.map((r) => (
                        <span key={r}>{r}km</span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Blood Group Filter</Label>
                    <div className="flex flex-wrap gap-2">
                      {BLOOD_GROUPS.map((g) => {
                        const on = selectedGroups.includes(g);
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
                      {filteredMapDonors.length} active donors in range
                    </p>
                    <p>Hospitals connected: {HOSPITALS.length}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden shadow-[var(--shadow-elegant)]">
                <CardContent className="p-0">
                  <ClientOnly fallback={<Skeleton className="h-[520px] w-full" />}>
                    <Suspense fallback={<Skeleton className="h-[520px] w-full" />}>
                      <DonorMap
                        donors={filteredMapDonors}
                        radiusKm={radiusKm}
                        onRequestContact={requestContact}
                      />
                    </Suspense>
                  </ClientOnly>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
