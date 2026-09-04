import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
      { title: "Request Blood — LifeDrop" },
      {
        name: "description",
        content: "Post an urgent blood request with hospital, blood group and units needed.",
      },
      { property: "og:title", content: "Request Blood — LifeDrop" },
      {
        property: "og:description",
        content: "Post an urgent blood request and reach nearby eligible donors.",
      },
    ],
  }),
  component: RequestBlood,
});

const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const schema = z.object({
  patient: z.string().trim().min(1, "Patient name is required").max(100),
  hospital: z.string().trim().min(1, "Hospital is required").max(150),
  group: z.string().min(1),
  units: z.coerce.number().int().min(1, "At least 1 unit").max(10, "Max 10 units"),
  contact: z.string().trim().min(6, "Valid contact required").max(20),
  notes: z.string().trim().max(500).optional(),
});

function RequestBlood() {
  const [form, setForm] = useState({
    patient: "",
    hospital: "",
    group: "O+",
    units: "1",
    contact: "",
    notes: "",
  });

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your details");
      return;
    }
    toast.success("Blood request posted to nearby donors");
    setForm({ patient: "", hospital: "", group: "O+", units: "1", contact: "", notes: "" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Request Blood</h1>
        <p className="mt-2 text-muted-foreground">
          Requests are broadcast to eligible, available donors matching the blood group.
        </p>

        <Card className="mt-8 shadow-[var(--shadow-elegant)]">
          <CardHeader>
            <CardTitle>New request</CardTitle>
            <CardDescription>All fields except notes are required</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="patient">Patient name</Label>
                <Input
                  id="patient"
                  maxLength={100}
                  value={form.patient}
                  onChange={(e) => set("patient")(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hospital">Hospital</Label>
                <Input
                  id="hospital"
                  maxLength={150}
                  value={form.hospital}
                  onChange={(e) => set("hospital")(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rg">Blood group</Label>
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
                <Label htmlFor="units">Units needed</Label>
                <Input
                  id="units"
                  type="number"
                  min={1}
                  max={10}
                  value={form.units}
                  onChange={(e) => set("units")(e.target.value)}
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="contact">Contact number</Label>
                <Input
                  id="contact"
                  maxLength={20}
                  value={form.contact}
                  onChange={(e) => set("contact")(e.target.value)}
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
                Post request
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
