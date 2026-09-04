import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Blood Inventory Levels — LifeDrop" },
      {
        name: "description",
        content: "Live stock levels for all eight blood groups across partner blood banks.",
      },
      { property: "og:title", content: "Blood Inventory Levels — LifeDrop" },
      {
        property: "og:description",
        content: "Track available units for every blood group in real time.",
      },
    ],
  }),
  component: Inventory,
});

const STOCK = [
  { group: "A+", units: 42 },
  { group: "A-", units: 8 },
  { group: "B+", units: 35 },
  { group: "B-", units: 5 },
  { group: "AB+", units: 14 },
  { group: "AB-", units: 2 },
  { group: "O+", units: 51 },
  { group: "O-", units: 9 },
];

const CAPACITY = 60;

function level(units: number) {
  if (units < 10) return { label: "Critical", variant: "destructive" as const };
  if (units < 25) return { label: "Low", variant: "secondary" as const };
  return { label: "Healthy", variant: "default" as const };
}

function Inventory() {
  const total = STOCK.reduce((s, x) => s + x.units, 0);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Blood Inventory</h1>
        <p className="mt-2 text-muted-foreground">
          {total} units currently in stock across partner blood banks.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STOCK.map((s) => {
            const l = level(s.units);
            return (
              <Card key={s.group} className="shadow-[var(--shadow-elegant)]">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">{s.group}</span>
                    <Badge variant={l.variant}>{l.label}</Badge>
                  </div>
                  <Progress value={Math.min(100, (s.units / CAPACITY) * 100)} />
                  <p className="text-sm text-muted-foreground">{s.units} units available</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
