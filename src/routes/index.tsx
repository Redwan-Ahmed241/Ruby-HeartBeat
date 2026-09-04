import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, HeartPulse } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Donor Profile & Eligibility — LifeDrop" },
      {
        name: "description",
        content:
          "Set up your blood donor profile and instantly check donation eligibility by age, weight and last donation date.",
      },
      { property: "og:title", content: "Donor Profile & Eligibility — LifeDrop" },
      {
        property: "og:description",
        content: "Set up your donor profile and check if you are eligible to donate blood today.",
      },
    ],
  }),
  component: ProfilePage,
});

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function daysSince(dateStr: string) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

function ProfilePage() {
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [age, setAge] = useState("24");
  const [weight, setWeight] = useState("62");
  const [lastDonation, setLastDonation] = useState("");
  const [available, setAvailable] = useState(true);

  const checks = useMemo(() => {
    const ageNum = Number(age);
    const weightNum = Number(weight);
    const days = daysSince(lastDonation);
    return [
      {
        label: "Age is 18 or above",
        detail: age ? `${ageNum} years` : "Not provided",
        pass: !!age && ageNum >= 18,
      },
      {
        label: "Body weight is 50 kg or above",
        detail: weight ? `${weightNum} kg` : "Not provided",
        pass: !!weight && weightNum >= 50,
      },
      {
        label: "Last donation was 90+ days ago",
        detail: days === null ? "Never donated" : `${days} days ago`,
        pass: days === null ? true : days >= 90,
      },
    ];
  }, [age, weight, lastDonation]);

  const eligible = checks.every((c) => c.pass);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Donor Profile & Eligibility
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Keep your details current so hospitals and patients can reach you when your blood type is
          needed.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Card className="shadow-[var(--shadow-elegant)]">
            <CardHeader>
              <CardTitle>Profile setup</CardTitle>
              <CardDescription>Your donation details</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="group">Blood group</Label>
                <Select value={bloodGroup} onValueChange={setBloodGroup}>
                  <SelectTrigger id="group">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="age">Age (years)</Label>
                <Input
                  id="age"
                  type="number"
                  min={0}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="weight">Body weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  min={0}
                  max={300}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="last">Last donation date</Label>
                <Input
                  id="last"
                  type="date"
                  value={lastDonation}
                  onChange={(e) => setLastDonation(e.target.value)}
                />
              </div>

              <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Availability</p>
                  <p className="text-sm text-muted-foreground">
                    {available ? "Available for donation requests" : "Unavailable right now"}
                  </p>
                </div>
                <Switch checked={available} onCheckedChange={setAvailable} />
              </div>
            </CardContent>
          </Card>

          <Card
            className={
              eligible
                ? "border-success/40 bg-success/5 shadow-[var(--shadow-elegant)]"
                : "border-destructive/40 bg-destructive/5 shadow-[var(--shadow-elegant)]"
            }
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HeartPulse className="size-5 text-primary" />
                Eligibility checker
              </CardTitle>
              <CardDescription>Live result based on your details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-3">
                {eligible ? (
                  <CheckCircle2 className="size-8 text-success" />
                ) : (
                  <XCircle className="size-8 text-destructive" />
                )}
                <div>
                  <p
                    className={`text-lg font-semibold ${eligible ? "text-success" : "text-destructive"}`}
                  >
                    {eligible ? "Eligible to Donate" : "Not Eligible to Donate"}
                  </p>
                  <p className="text-sm text-muted-foreground">Blood group {bloodGroup}</p>
                </div>
              </div>

              <ul className="space-y-3">
                {checks.map((c) => (
                  <li key={c.label} className="flex items-start gap-3">
                    {c.pass ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                    ) : (
                      <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                    )}
                    <div className="text-sm">
                      <p className="font-medium text-foreground">{c.label}</p>
                      <p className="text-muted-foreground">{c.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <Badge variant={available ? "default" : "secondary"}>
                {available ? "Listed as available" : "Hidden from search"}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
