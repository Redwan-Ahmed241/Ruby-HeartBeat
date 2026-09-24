import { createFileRoute, Link, useSearch, useNavigate, redirect } from "@tanstack/react-router";
import { useState, lazy, Suspense } from "react";
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
  Building2,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DonorMap = lazy(() => import("@/components/DonorMap"));
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AuthDialog } from "@/components/AuthDialog";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  useBloodRequests,
  useBloodRequest,
  useRevealDonorContact,
  useCompleteRequest,
  useReopenRequest,
  useCancelRequest,
} from "@/hooks/useRequests";
import { toDisplayBloodGroup } from "@/lib/api/types";
import { formatBloodGroup } from "@/lib/formatters";
import type { BloodRequestResponse, DonorContactReveal, MaskedDonorMatchResponse } from "@/lib/api/types";
import { toast } from "sonner";

export const Route = createFileRoute("/recipient")({
  beforeLoad: () => {
    throw redirect({
      to: "/dashboard",
      search: { tab: "request" },
    });
  },
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
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const completeMutation = useCompleteRequest();
  const reopenMutation = useReopenRequest();
  const cancelMutation = useCancelRequest();

  const handleCancelConfirm = async () => {
    try {
      await cancelMutation.mutateAsync(req.request_id);
      setCancelDialogOpen(false);
    } catch {
      // Toast handled by mutation
    }
  };

  const renderStatusBadge = () => {
    switch (req.status) {
      case "OPEN":
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-[10px]">OPEN</Badge>;
      case "ACCEPTED":
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px]">ACCEPTED</Badge>;
      case "PROCESSING":
        return <Badge className="bg-amber-600 hover:bg-amber-700 text-white text-[10px]">PROCESSING</Badge>;
      case "COMPLETED":
        return <Badge className="bg-purple-600 hover:bg-purple-700 text-white text-[10px]">COMPLETED</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive" className="text-[10px]">CANCELLED</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{req.status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-bold text-primary">{formatBloodGroup(req.blood_group, "symbol")}</span>
            <Badge variant={URGENCY_VARIANT[req.urgency] ?? "outline"}>{req.urgency}</Badge>
            {renderStatusBadge()}
            {req.patient_name && (
              <span className="text-xs font-semibold text-foreground">for {req.patient_name}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground break-words">
            {req.quantity} unit(s) ({req.volume_ml ? `${req.volume_ml} mL` : `${Number(req.quantity) * 450} mL`}) · {req.component_type.replace("_", " ")}
            {req.hospital_name ? ` · ${req.hospital_name}` : ""}
            {req.area_zone ? ` (${req.area_zone})` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 truncate max-w-xs">
              <MapPin className="size-3 text-muted-foreground shrink-0" /> {req.required_location}
            </span>
            {req.attendant_phone_number && (
              <span className="flex items-center gap-1 font-mono">
                <Phone className="size-3 text-muted-foreground shrink-0" /> {req.attendant_phone_number}
              </span>
            )}
            {req.is_contact_public && req.attendant_phone_number && !req.attendant_phone_number.includes("*") && (
              <a href={`tel:${req.attendant_phone_number}`}>
                <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 border-emerald-500/40 text-emerald-600 hover:bg-emerald-50">
                  <Phone className="size-2.5" /> Call Directly
                </Button>
              </a>
            )}
            {req.request_date && (
              <span className="flex items-center gap-1">
                <Clock className="size-3 shrink-0" /> {new Date(req.request_date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap w-full sm:w-auto">
          {req.status === "OPEN" && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs text-destructive hover:bg-destructive/10 border-destructive/30 w-full sm:w-auto"
              onClick={() => setCancelDialogOpen(true)}
            >
              Cancel Request
            </Button>
          )}
          <Link to="/request/$requestId" params={{ requestId: req.request_id }} className="w-full sm:w-auto">
            <Button variant="ghost" size="sm" className="text-xs w-full sm:w-auto">
              Direct Link
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="text-xs w-full sm:w-auto" onClick={() => onViewMatches(req.request_id)}>
            View matches ({req.matches?.length || 0})
          </Button>
        </div>
      </div>

      {/* Phase 4 & 6: Recipient Notification & Completion Action for ACCEPTED Status */}
      {(req.status === "ACCEPTED" || req.status === "PROCESSING") && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 sm:p-4 text-xs text-emerald-950 dark:text-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-bold text-sm text-emerald-900 dark:text-emerald-100">
                {req.accepted_donor?.full_name
                  ? `Donor ${req.accepted_donor.full_name}`
                  : "A volunteer donor"}
                {req.accepted_donor?.area_zone ? ` from ${req.accepted_donor.area_zone}` : ""} has accepted your request!
              </p>
              {req.accepted_donor?.phone ? (
                <p className="text-xs text-emerald-800 dark:text-emerald-200 mt-0.5">
                  Direct Contact: <span className="font-mono font-bold underline">{req.accepted_donor.phone}</span>
                </p>
              ) : (
                <p className="text-xs text-emerald-800 dark:text-emerald-200 mt-0.5">
                  The donor is coordinating arrival at the hospital transfusion center.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
            {req.accepted_donor?.phone && (
              <a href={`tel:${req.accepted_donor.phone}`}>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 shadow-xs">
                  <Phone className="size-3.5 mr-1.5" /> Call Donor
                </Button>
              </a>
            )}
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400 font-semibold text-xs h-8 gap-1 shadow-2xs"
              onClick={() => setReopenDialogOpen(true)}
            >
              <RotateCcw className="size-3.5" /> Cancel Match & Re-Open
            </Button>
            <Button
              size="sm"
              variant="default"
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8 shadow-xs gap-1"
              onClick={() => setCompleteDialogOpen(true)}
            >
              <CheckCircle2 className="size-3.5" /> Confirm Completed
            </Button>
          </div>
        </div>
      )}

      {/* Phase 6: Completed Resolution Banner */}
      {req.status === "COMPLETED" && (
        <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-3 text-xs text-purple-950 dark:text-purple-100 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-purple-600 shrink-0" />
            <span className="font-medium">
              Donation completed at {req.hospital_name || req.required_location}.
              {req.accepted_donor?.full_name ? ` Fulfilled by Donor ${req.accepted_donor.full_name}.` : " Fulfilled by volunteer donor."} Donor placed on 90-day recovery cooldown.
            </span>
          </div>
          <Badge className="bg-purple-600 text-white text-[10px]">Fulfilled</Badge>
        </div>
      )}

      {/* Phase 6: Dialog to Confirm Physical Blood Donation Completion */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="size-5 text-emerald-600" />
              <span>Confirm Blood Donation Completion</span>
            </DialogTitle>
            <DialogDescription>
              Mark this request as completed and record the life-saving donation in the donor's history.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Donor:</span>
                <span className="font-bold text-foreground">
                  {req.accepted_donor?.full_name || "Accepted Volunteer Donor"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hospital / Center:</span>
                <span className="font-bold text-foreground">
                  {req.hospital_name || req.required_location}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Units & Component:</span>
                <span className="font-bold text-foreground">
                  {req.quantity} unit(s) · {req.component_type.replace("_", " ")}
                </span>
              </div>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              Confirming will transition this request to <strong className="text-purple-600 font-semibold">COMPLETED</strong>, permanently credit the donor with 1 completed donation, and activate their <strong>90-day recovery cooldown window</strong>.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setCompleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              disabled={completeMutation.isPending}
              onClick={async () => {
                await completeMutation.mutateAsync(req.request_id);
                setCompleteDialogOpen(false);
              }}
            >
              {completeMutation.isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Confirm Donation Completed
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Phase 8: Dialog to Cancel Match and Re-Open Blood Request */}
      <Dialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <RotateCcw className="size-5 text-amber-600" />
              <span>Cancel Match & Re-Open Search</span>
            </DialogTitle>
            <DialogDescription>
              Release the current donor match and restart automated search for alternative donors.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-3 space-y-1.5 text-amber-900 dark:text-amber-200">
              <p className="font-semibold text-sm">What happens next?</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Request status immediately returns to <strong>OPEN</strong>.</li>
                <li>The Intelligent Matching Engine resumes searching for nearby available donors.</li>
                <li><strong>No penalty:</strong> The donor will not receive any cooldown and their profile remains eligible.</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reopen-reason" className="text-xs font-semibold">
                Reason for cancellation (optional):
              </Label>
              <Input
                id="reopen-reason"
                placeholder="e.g., Donor unable to travel, schedule changed, etc."
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setReopenDialogOpen(false)}>
              Back
            </Button>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              disabled={reopenMutation.isPending}
              onClick={async () => {
                await reopenMutation.mutateAsync({
                  requestId: req.request_id,
                  reason: reopenReason.trim() || undefined,
                });
                setReopenDialogOpen(false);
                setReopenReason("");
              }}
            >
              {reopenMutation.isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Cancel Match & Re-Open
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Search Confirmation Dialog (Part 1.3) */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertCircle className="size-5" />
              <span>Cancel Blood Request Search?</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this search? Donors will stop receiving alerts.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-muted-foreground">
            Cancelling this search will immediately release all pending candidate matches, stop broadcast alerts, and restore your daily patient request limit.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setCancelDialogOpen(false)}>
              Keep Search Active
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={cancelMutation.isPending}
              onClick={handleCancelConfirm}
            >
              {cancelMutation.isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Confirm Cancel Search
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MatchesDialog({ requestId, onClose }: { requestId: string | null; onClose: () => void }) {
  const { data: request, isLoading } = useBloodRequest(requestId ?? "", !!requestId);
  const revealMutation = useRevealDonorContact();
  const [revealed, setRevealed] = useState<Record<string, DonorContactReveal>>({});
  const [mapMatch, setMapMatch] = useState<{
    match: MaskedDonorMatchResponse;
    contact?: DonorContactReveal | undefined;
  } | null>(null);

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
    <>
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
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 gap-1 font-medium"
                                    onClick={() => setMapMatch({ match: m, contact })}
                                  >
                                    <MapPin className="size-3 text-red-600" /> View on Map
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs text-destructive hover:bg-destructive/10 border-destructive/40 h-7 font-medium"
                                    onClick={() => handleCancelMatch(m.match_id)}
                                  >
                                    Cancel Match
                                  </Button>
                                </div>
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
                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-8 gap-1"
                                  onClick={() => setMapMatch({ match: m })}
                                >
                                  <MapPin className="size-3 text-red-600" /> View Map
                                </Button>
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
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 gap-1"
                                onClick={() => setMapMatch({ match: m })}
                              >
                                <MapPin className="size-3 text-red-600" /> View on Map
                              </Button>
                              <Badge variant="secondary" className="text-[10px]">
                                Pending Response
                              </Badge>
                            </div>
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

      {/* 4. Match Map Dialog (Phase 5: Leaflet Location Workflow) */}
      <Dialog open={!!mapMatch} onOpenChange={(open) => !open && setMapMatch(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="size-5 text-red-600" />
              <span>Hospital & Matched Donor Map</span>
            </DialogTitle>
            <DialogDescription>
              Visualize hospital destination and approximate donor location (~1km privacy grid).
            </DialogDescription>
          </DialogHeader>

          {mapMatch && request && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/40 border border-border text-xs">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <Building2 className="size-4 text-red-600" />
                  <span>{request.hospital_name || request.required_location}</span>
                </div>
                <Badge variant="secondary" className="font-mono text-xs font-semibold">
                  ~{mapMatch.match.distance_km.toFixed(1)} km distance
                </Badge>
              </div>

              <Suspense
                fallback={
                  <div className="h-[280px] sm:h-[340px] rounded-xl bg-muted/30 border border-border flex items-center justify-center text-xs text-muted-foreground animate-pulse">
                    Loading Leaflet map...
                  </div>
                }
              >
                <DonorMap
                  hospitalLocation={{
                    lat: request.latitude,
                    lng: request.longitude,
                    name: request.hospital_name || request.required_location,
                    area: request.area_zone,
                  }}
                  donorLocation={{
                    lat: mapMatch.contact?.latitude ?? mapMatch.match.approx_latitude ?? (request.latitude + 0.015),
                    lng: mapMatch.contact?.longitude ?? mapMatch.match.approx_longitude ?? (request.longitude + 0.015),
                    label: mapMatch.contact?.full_name ?? mapMatch.match.donor_name_initial,
                    bloodGroup: mapMatch.match.blood_group,
                    isApproximate: !mapMatch.contact,
                  }}
                  heightClassName="h-[280px] sm:h-[340px]"
                />
              </Suspense>

              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 justify-center">
                <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
                <span>Donor residential coordinates are approximate to protect privacy until confirmed.</span>
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
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
