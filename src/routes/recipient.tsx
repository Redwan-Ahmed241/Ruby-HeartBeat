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
  Mail,
  MapPin,
  X,
  User,
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
        View matches ({req.matches?.length || 0})
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
      toast.success(`Donor contact unlocked for ${contact.full_name}!`);
    } catch {
      // handled by mutation toast
    }
  };

  const handleCancelMatch = (matchId: string) => {
    setRevealed((prev) => {
      const copy = { ...prev };
      delete copy[matchId];
      return copy;
    });
    toast.info("Match cancelled. Donor released back to the available pool.");
  };

  const matches = request?.matches ?? [];
  const acceptedMatches = matches.filter((m) => m.response_status === "ACCEPTED");
  const pendingMatches = matches.filter((m) => m.response_status === "PENDING");
  const declinedMatches = matches.filter((m) => m.response_status === "DECLINED");

  return (
    <Dialog open={!!requestId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Active Request Status & Matched Donors</span>
            {request && (
              <Badge variant={request.urgency === "EMERGENCY" ? "destructive" : "secondary"} className="text-[11px]">
                {request.urgency}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Two-sided mutual matching: donor identities stay masked until they accept your request.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="mx-auto size-7 animate-spin text-primary" />
            <p className="mt-2 text-xs text-muted-foreground">Fetching live matching status...</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No donors matched yet. Our system notifies eligible donors in your area immediately.
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* 1. Accepted by Donor (Green highlight & Confirm Contact) */}
            {acceptedMatches.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Accepted by Donor ({acceptedMatches.length})
                  </h4>
                </div>

                <div className="space-y-3">
                  {acceptedMatches.map((m) => {
                    const contact = revealed[m.match_id];
                    const maskedLabel = `Donor #D-${m.donor_id ? m.donor_id.slice(0, 4).toUpperCase() : m.donor_name_initial}`;

                    return (
                      <div
                        key={m.match_id}
                        className="rounded-xl border-2 border-emerald-500/60 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 shadow-sm transition-all"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1">
                            <CheckCircle2 className="size-3.5" /> Donor has accepted your request!
                          </Badge>
                          <span className="text-xs font-semibold text-muted-foreground">
                            ~{m.distance_km.toFixed(1)} km away · Score: {Math.round(m.match_score)}/100
                          </span>
                        </div>

                        {contact ? (
                          <div className="mt-3 space-y-2.5 rounded-lg bg-background p-4 border border-emerald-500/30 text-xs shadow-xs">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                <User className="size-4 text-emerald-600" /> {contact.full_name}
                              </p>
                              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-400 font-semibold">
                                Contact Unlocked
                              </Badge>
                            </div>
                            <p className="flex items-center gap-2 font-bold text-emerald-600 text-sm">
                              <Phone className="size-3.5" />
                              <a href={`tel:${contact.phone}`} className="hover:underline tracking-wide">{contact.phone}</a>
                            </p>
                            {contact.email && (
                              <p className="text-muted-foreground flex items-center gap-1.5">
                                <Mail className="size-3.5" /> {contact.email}
                              </p>
                            )}
                            {contact.address && (
                              <p className="text-muted-foreground flex items-center gap-1.5">
                                <MapPin className="size-3.5" /> {contact.address}
                              </p>
                            )}
                            <div className="pt-2 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
                              <p className="text-muted-foreground text-[11px] flex items-center gap-1">
                                <Clock className="size-3" />
                                <strong>Preferred Meetup:</strong> {contact.preferred_meetup_time || "Immediate / Coordinate directly via call"}
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs text-destructive hover:bg-destructive/10 border-destructive/40 h-7 font-medium"
                                onClick={() => handleCancelMatch(m.match_id)}
                              >
                                Cancel Match & Release Donor
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-background/80 rounded-lg p-3 border border-emerald-500/20">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {maskedLabel} ({formatBloodGroup(m.blood_group, "symbol")})
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Ready for recipient confirmation to reveal direct phone and meeting coordinates.
                              </p>
                            </div>
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm shrink-0"
                              disabled={revealMutation.isPending}
                              onClick={() => handleReveal(m.match_id)}
                            >
                              {revealMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Unlocking...
                                </>
                              ) : (
                                "Confirm Donor & Unlock Contact"
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Awaiting Response (Pending with Masked Label) */}
            {pendingMatches.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Awaiting Response ({pendingMatches.length})
                  </h4>
                </div>

                <div className="space-y-2.5">
                  {pendingMatches.map((m) => {
                    const maskedLabel = `Donor #D-${m.donor_id ? m.donor_id.slice(0, 4).toUpperCase() : m.donor_name_initial}`;

                    return (
                      <div key={m.match_id} className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                                {formatBloodGroup(m.blood_group, "symbol")}
                              </span>
                              <span className="text-sm font-semibold text-foreground">
                                {maskedLabel}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="size-3" /> ~{m.distance_km.toFixed(1)} km away · Score: {Math.round(m.match_score)}/100
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-[10px]">
                            Pending Response
                          </Badge>
                        </div>
                        <p className="mt-2 text-[11px] text-muted-foreground italic border-t border-border/40 pt-1.5">
                          Donor has been alerted. Contact details remain masked until the donor accepts your request.
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Declined (Faded State) */}
            {declinedMatches.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
                  Declined ({declinedMatches.length})
                </h4>

                <div className="space-y-2">
                  {declinedMatches.map((m) => {
                    const maskedLabel = `Donor #D-${m.donor_id ? m.donor_id.slice(0, 4).toUpperCase() : m.donor_name_initial}`;

                    return (
                      <div
                        key={m.match_id}
                        className="rounded-xl border border-border/40 bg-muted/40 p-3 opacity-60 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-muted-foreground">
                            {maskedLabel} ({formatBloodGroup(m.blood_group, "symbol")})
                          </span>
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Declined
                          </Badge>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground italic">
                          Donor declined due to scheduling conflict.
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
      <main className="w-full max-w-7xl 2xl:max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">Recipient Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track your blood requests and view matched donors.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link to="/request-blood">
              <Button variant="outline" size="sm" className="text-xs">
                <PlusCircle className="mr-1.5 size-4" /> New request
              </Button>
            </Link>
            <Link to="/request-blood" search={{ urgency: "EMERGENCY" }}>
              <Button size="sm" variant="destructive" className="text-xs font-semibold">
                <AlertCircle className="mr-1.5 size-4" /> Emergency request
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
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
