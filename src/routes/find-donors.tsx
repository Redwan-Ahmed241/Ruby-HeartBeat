import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Phone } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/find-donors")({
  head: () => ({
    meta: [
      { title: "Find Blood Donors Near You — LifeDrop" },
      {
        name: "description",
        content: "Search available blood donors by blood group and city, and contact them directly.",
      },
      { property: "og:title", content: "Find Blood Donors Near You — LifeDrop" },
      {
        property: "og:description",
        content: "Search available donors by blood group and location.",
      },
    ],
  }),
  component: FindDonors,
});

const GROUPS = ["All", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const DONORS = [
  { name: "Ayesha Rahman", group: "O+", city: "Dhaka", last: "142 days ago", available: true },
  { name: "Tanvir Hasan", group: "B+", city: "Chattogram", last: "98 days ago", available: true },
  { name: "Nusrat Jahan", group: "A-", city: "Dhaka", last: "210 days ago", available: false },
  { name: "Imran Kabir", group: "AB+", city: "Sylhet", last: "120 days ago", available: true },
  { name: "Sadia Islam", group: "O-", city: "Khulna", last: "365 days ago", available: true },
  { name: "Rafiul Karim", group: "A+", city: "Rajshahi", last: "60 days ago", available: false },
];

function FindDonors() {
  const [group, setGroup] = useState("All");
  const [city, setCity] = useState("");

  const results = DONORS.filter(
    (d) =>
      (group === "All" || d.group === group) &&
      d.city.toLowerCase().includes(city.trim().toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Find Donors</h1>
        <p className="mt-2 text-muted-foreground">Filter registered donors by group and city.</p>

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
            <Label htmlFor="c">City</Label>
            <Input
              id="c"
              placeholder="e.g. Dhaka"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((d) => (
            <Card key={d.name} className="shadow-[var(--shadow-elegant)]">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{d.name}</p>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="size-3.5" /> {d.city}
                    </p>
                  </div>
                  <span className="rounded-md bg-primary px-2.5 py-1 text-sm font-bold text-primary-foreground">
                    {d.group}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Last donated {d.last}</p>
                <div className="flex items-center justify-between">
                  <Badge variant={d.available ? "default" : "secondary"}>
                    {d.available ? "Available" : "Unavailable"}
                  </Badge>
                  <Button size="sm" disabled={!d.available}>
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
      </main>
    </div>
  );
}
