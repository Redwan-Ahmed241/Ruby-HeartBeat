import { createFileRoute, Link, useSearch, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertCircle,
  PlusCircle,
  ClipboardList,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Clock,
  Droplet,
  Phone,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AuthDialog } from "@/components/AuthDialog";
import { useCurrentUser } from "@/hooks/useAuth";
import { useBloodRequests, useBloodRequest, useRevealDonorContact } from "@/hooks/useRequests";
import { toDisplayBloodGroup } from "@/lib/api/types";
import { formatBloodGroup } from "@/lib/formatters";
import type { BloodRequestResponse, DonorContactReveal } from "@/lib/api/types";
import { toast } from "sonner";

export const Route = createFileRoute("/recipient")({
  validateSearch: (search: Record<string, unknown>): { tab?: "overview" | "requests" } => ({
    tab: (search["tab"] as "overview" | "requests") || "overview",
  }),
  head: () => ({
    meta: [
      { title: "Recipient Dashboard — LifeDrop" },
      { name: "description", content: "Track your blood requests and view matched donors." },
    ],
  }),
  component: RecipientDashboardPage,
});

const URGENCY_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  EMERGENCY: "destructive",
  URGENT: "secondary",
  NORMAL: "outline",
};

function RequestRow({ req, onViewMatches }: { req: BloodRequestResponse; onViewMatches: (id: string) => void }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
      <div className="space-y-1 min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-bold text-primary">{formatBloodGroup(req.blood_group, "symbol")}</span>
          <Badge variant={URGENCY_VARIANT[req.urgency] ?? "outline"}>{req.urgency}</Badge>
          <Badge variant="outline">{req.status}</Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {req.quantity} unit(s) · {req.component_type.replace("_", " ")} · {req.required_location}
        </p>
        {req.request_date && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" /> {new Date(req.request_date).toLocaleString()}
          </p>
        )}
      </div>
      <Button variant="outline" size="sm" className="text-xs self-start sm:self-auto shrink-0" onClick={() => onViewMatches(req.request_id)}>
        View matches
      </Button>
    </div>
  );
}

function MatchesDialog({ requestId, onClose }: { requestId: string | null; onClose: () => void }) {
  const { data: request, isLoading } = useBloodRequest(requestId ?? "", !!requestId);
  const revealMutation = useRevealDonorContact();
  const [revealed, setRevealed] = useState<Record<string, DonorContactReveal>>({});

  const handleReveal = async (matchId: string) => {
    try {
      const contact = await revealMutation.mutateAsync(matchId);
      setRevealed((prev) => ({ ...prev, [matchId]: contact }));
      toast.success("Contact details unlocked.");
    } catch {
      // handled by mutation toast
    }
  };

  const matches = request?.matches ?? [];

  return (
    <Dialog open={!!requestId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Matched donors</DialogTitle>
          <DialogDescription>
            Donor identities stay masked until a donor accepts and you unlock their contact.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="mx-auto size-6 animate-spin text-primary" />
          </div>
        ) : matches.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No donors matched yet. We'll notify you when an eligible donor responds.
          </p>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => {
              const contact = revealed[m.match_id];
              return (
                <div key={m.match_id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                        {formatBloodGroup(m.blood_group, "symbol")}
                      </span>
                      <span className="text-sm font-medium">
                        {contact ? contact.full_name : `Donor ${m.donor_name_initial}.`}
                      </span>
                    </div>
                    <Badge variant={m.response_status === "ACCEPTED" ? "default" : "outline"} className="text-[10px]">
                      {m.response_status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {m.distance_km.toFixed(1)} km away · match score {Math.round(m.match_score)}
                  </p>
                  {contact ? (
                    <div className="mt-2 space-y-0.5 text-xs">
                      <p className="flex items-center gap-1 font-medium">
                        <Phone className="size-3" /> {contact.phone}
                      </p>
                      <p className="text-muted-foreground">{contact.email}</p>
                      <p className="text-muted-foreground">{contact.address}</p>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 text-xs"
                      disabled={m.response_status !== "ACCEPTED" || revealMutation.isPending}
                      onClick={() => handleReveal(m.match_id)}
                    >
                      {m.response_status === "ACCEPTED" ? "Unlock contact" : "Awaiting donor response"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RecipientDashboardPage() {
  const search = useSearch({ from: "/recipient" });
  const navigate = useNavigate();
  const activeTab = search.tab || "overview";
  const [matchesRequestId, setMatchesRequestId] = useState<string | null>(null);

  const handleTabChange = (newTab: string) =>
    navigate({ to: "/recipient", search: { tab: newTab as "overview" | "requests" } });

  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: requests, isLoading: requestsLoading, refetch: refetchRequests } = useBloodRequests();

  if (userLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteNav />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user || (user.role !== "RECIPIENT" && user.role !== "SYSTEM_ADMIN")) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <ShieldAlert className="size-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Recipient access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {user
              ? `You're signed in as ${user.role}. This dashboard is for blood recipients.`
              : "Sign in as a recipient to track your blood requests and view matched donors."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <AuthDialog defaultTab="login" defaultRole="RECIPIENT" />
            <Link to="/">
              <Button variant="outline">Back to home</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const list = requests ?? [];
  const activeCount = list.filter((r) => r.status === "PENDING" || r.status === "MATCHED").length;
  const matchedCount = list.filter((r) => r.status === "MATCHED").length;
  const completedCount = list.filter((r) => r.status === "COMPLETED").length;

  const stats = [
    { label: "Active requests", value: activeCount, icon: ClipboardList, tone: "text-primary bg-primary/10" },
    { label: "Matched", value: matchedCount, icon: CheckCircle2, tone: "text-success bg-success/10" },
    { label: "Completed", value: completedCount, icon: Droplet, tone: "text-muted-foreground bg-muted" },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-background flex flex-col">
      <SiteNav />
      <main className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 md:py-10 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">Recipient Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track your blood requests and view matched donors.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link to="/requests/new">
              <Button variant="outline" size="sm" className="text-xs">
                <PlusCircle className="mr-1.5 size-4" /> New request
              </Button>
            </Link>
            <Link to="/requests/emergency">
              <Button size="sm" variant="destructive" className="text-xs font-semibold">
                <AlertCircle className="mr-1.5 size-4" /> Emergency request
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex size-10 items-center justify-center rounded-lg ${s.tone}`}>
                  <s.icon className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-8">
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Recent requests</CardTitle>
                  <CardDescription>Your most recent blood requests.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => refetchRequests()} className="text-xs">
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {requestsLoading ? (
                  <div className="py-8 text-center">
                    <Loader2 className="mx-auto size-6 animate-spin text-primary" />
                  </div>
                ) : list.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center">
                    <Droplet className="mx-auto size-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm font-semibold">No blood requests yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Create a request to notify eligible donors nearby.
                    </p>
                    <Link to="/requests/new" className="mt-4 inline-block">
                      <Button size="sm">Create request</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {list.slice(0, 3).map((r) => (
                      <RequestRow key={r.request_id} req={r} onViewMatches={setMatchesRequestId} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">All requests</CardTitle>
                  <CardDescription>Full history and live status.</CardDescription>
                </div>
                <Link to="/requests/new">
                  <Button size="sm">
                    <PlusCircle className="mr-1.5 size-4" /> New request
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {list.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No blood requests found.</p>
                ) : (
                  <div className="space-y-3">
                    {list.map((r) => (
                      <RequestRow key={r.request_id} req={r} onViewMatches={setMatchesRequestId} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <MatchesDialog requestId={matchesRequestId} onClose={() => setMatchesRequestId(null)} />
    </div>
  );
}
