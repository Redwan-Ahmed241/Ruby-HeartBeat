import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Droplet, HeartPulse, ShieldCheck, Search } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { HOSPITALS } from "@/lib/donor-data";
import { useCurrentUser } from "@/hooks/useAuth";

const DonorMap = lazy(() => import("@/components/DonorMap"));

export const Route = createFileRoute("/find-donors")({
  head: () => ({
    meta: [
      { title: "Find Blood & Blood Banks — LifeDrop" },
      {
        name: "description",
        content:
          "See hospital blood banks across Dhaka and learn how LifeDrop matches you with eligible donors while keeping their details private.",
      },
    ],
  }),
  component: FindDonors,
});

const RADII = [5, 10, 25, 50];

const STEPS = [
  { icon: Search, title: "Create a request", body: "Tell us the blood group, component, and how many units you need." },
  { icon: HeartPulse, title: "We match donors", body: "Eligible, available donors nearby are notified automatically." },
  { icon: ShieldCheck, title: "Contact on accept", body: "A donor's contact details unlock only after they accept your request." },
];

function FindDonors() {
  const { data: user } = useCurrentUser();
  const [radiusIndex, setRadiusIndex] = useState(1);
  const radiusKm = RADII[radiusIndex] ?? 10;

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-background flex flex-col">
      <SiteNav />
      <main className="w-full max-w-7xl 2xl:max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex-1">
        <div className="max-w-2xl">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">Nearby Blood Network</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Browse hospital blood banks nearby, or create a request and let LifeDrop match you with
            eligible donors — privately.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          {STEPS.map((s, i) => (
            <Card key={s.title}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                    {i + 1}
                  </span>
                  {s.title}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{s.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Blood bank map</CardTitle>
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
                <p className="font-semibold text-foreground">{HOSPITALS.length} blood banks mapped</p>
                <p className="mt-1">Tap a marker for details.</p>
              </div>

              {user ? (
                <Link to="/requests/new" className="block">
                  <Button className="w-full gap-2">
                    <Droplet className="size-4" /> Request blood
                  </Button>
                </Link>
              ) : (
                <Link to="/login" search={{ redirect: "/requests/new" }} className="block">
                  <Button className="w-full gap-2">
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
      </main>
    </div>
  );
}
