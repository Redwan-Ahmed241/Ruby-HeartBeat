import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Boxes, CheckCircle2, ClipboardList, Flag, ShieldCheck, Users } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Control & Analytics — LifeDrop" },
      {
        name: "description",
        content:
          "Monitor donors, verify new registrations and manage every blood request from one admin dashboard.",
      },
      { property: "og:title", content: "Admin Control & Analytics — LifeDrop" },
      {
        property: "og:description",
        content: "System stats, donor verification queue and request management for LifeDrop.",
      },
    ],
  }),
  component: AdminDashboard,
});

type Verification = "Verified" | "Pending" | "Documents missing";
type Status = "Pending" | "Matched" | "Fulfilled" | "Cancelled";

const STATUSES: Status[] = ["Pending", "Matched", "Fulfilled", "Cancelled"];

type Registration = {
  id: string;
  name: string;
  group: string;
  verification: Verification;
  city: string;
  decision?: "approved" | "flagged";
};

const REGISTRATIONS: Registration[] = [
  { id: "u1", name: "Mitu Barua", group: "A+", verification: "Verified", city: "Tejgaon" },
  { id: "u2", name: "Rashed Khan", group: "B-", verification: "Pending", city: "Mirpur" },
  { id: "u3", name: "Lamia Akter", group: "O-", verification: "Documents missing", city: "Uttara" },
  { id: "u4", name: "Zahid Hasan", group: "AB+", verification: "Verified", city: "Banani" },
  { id: "u5", name: "Priya Das", group: "O+", verification: "Pending", city: "Khulna" },
];

type RequestRow = {
  id: string;
  patient: string;
  group: string;
  component: string;
  units: number;
  urgency: "Normal" | "Urgent" | "Emergency";
  status: Status;
};

const REQUESTS: RequestRow[] = [
  { id: "BR-1041", patient: "Sabbir Hossain", group: "O-", component: "Whole Blood", units: 2, urgency: "Emergency", status: "Pending" },
  { id: "BR-1040", patient: "Rehana Begum", group: "B+", component: "Platelets", units: 1, urgency: "Urgent", status: "Matched" },
  { id: "BR-1039", patient: "Arif Mahmud", group: "A+", component: "Plasma", units: 3, urgency: "Normal", status: "Fulfilled" },
  { id: "BR-1038", patient: "Nadia Sultana", group: "AB-", component: "Whole Blood", units: 2, urgency: "Urgent", status: "Pending" },
  { id: "BR-1037", patient: "Kamal Uddin", group: "O+", component: "Whole Blood", units: 1, urgency: "Normal", status: "Cancelled" },
];

const statusVariant = (s: Status) =>
  s === "Fulfilled" ? "default" : s === "Cancelled" ? "destructive" : "secondary";

function AdminDashboard() {
  const [registrations, setRegistrations] = useState(REGISTRATIONS);
  const [requests, setRequests] = useState(REQUESTS);

  const stats = useMemo(
    () => [
      { label: "Total Active Donors", value: 1284, icon: Users, hint: "+38 this week" },
      {
        label: "Pending Blood Requests",
        value: requests.filter((r) => r.status === "Pending").length,
        icon: ClipboardList,
        hint: "Awaiting a match",
      },
      {
        label: "Successful Matches",
        value: 476,
        icon: CheckCircle2,
        hint: "92% fulfilment rate",
      },
      { label: "Total Inventory Units", value: 318, icon: Boxes, hint: "Across all components" },
    ],
    [requests],
  );

  const decide = (id: string, decision: "approved" | "flagged", name: string) => {
    setRegistrations((rs) => rs.map((r) => (r.id === id ? { ...r, decision } : r)));
    toast.success(decision === "approved" ? `${name} approved as donor` : `${name} flagged for review`);
  };

  const setStatus = (id: string, status: Status) => {
    setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success(`${id} marked ${status}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Admin Control</h1>
        <p className="mt-2 text-muted-foreground">
          System analytics, donor verification and request management in one place.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="shadow-[var(--shadow-elegant)]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <s.icon className="size-4 text-primary" />
                </div>
                <p className="mt-2 text-3xl font-bold">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8 shadow-[var(--shadow-elegant)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" /> Verification queue
            </CardTitle>
            <CardDescription>New donor registrations awaiting a decision</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Blood group</TableHead>
                  <TableHead>Medical verification</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <span className="font-medium">{r.name}</span>
                      <span className="block text-xs text-muted-foreground">{r.city}</span>
                    </TableCell>
                    <TableCell>
                      <span className="rounded-md bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">
                        {r.group}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.verification === "Verified"
                            ? "default"
                            : r.verification === "Pending"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {r.verification}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.decision ? (
                        <Badge variant={r.decision === "approved" ? "default" : "destructive"}>
                          {r.decision === "approved" ? "Approved" : "Flagged"}
                        </Badge>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => decide(r.id, "approved", r.name)}>
                            Approve Donor
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => decide(r.id, "flagged", r.name)}
                          >
                            <Flag /> Flag Account
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="mt-8 shadow-[var(--shadow-elegant)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-5 text-primary" /> Request management
            </CardTitle>
            <CardDescription>Every blood request in the system with quick status changes</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Need</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Set status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.id}</TableCell>
                    <TableCell className="font-medium">{r.patient}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.units} × {r.group} {r.component}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.urgency === "Emergency" ? "destructive" : "secondary"}>
                        {r.urgency}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Select value={r.status} onValueChange={(v) => setStatus(r.id, v as Status)}>
                        <SelectTrigger className="ml-auto w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
