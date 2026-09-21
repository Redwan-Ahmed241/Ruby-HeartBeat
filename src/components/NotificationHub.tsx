import { useState } from "react";
import {
  Bell,
  Check,
  Phone,
  X,
  Clock,
  MapPin,
  HeartHandshake,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  useBloodRequests,
  useRespondToMatch,
  useRevealDonorContact,
  useConfirmMatchCompletion,
  useReopenRequest,
} from "@/hooks/useRequests";
import type {
  BloodRequestResponse,
  MaskedDonorMatchResponse,
  DonorContactReveal,
  BloodGroup,
  RequestUrgency,
} from "@/lib/api/types";

// Helper to format blood group enum for clean display (e.g. O_PLUS -> O+)
function formatBloodGroup(bg: BloodGroup | string): string {
  return bg
    .replace("_POSITIVE", "+")
    .replace("_NEGATIVE", "-")
    .replace("_PLUS", "+")
    .replace("_MINUS", "-");
}

function getUrgencyBadge(urgency: RequestUrgency) {
  if (urgency === "EMERGENCY") {
    return <Badge variant="destructive" className="font-semibold animate-pulse">Emergency</Badge>;
  }
  if (urgency === "URGENT") {
    return <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-medium">Urgent</Badge>;
  }
  return <Badge variant="secondary">Normal</Badge>;
}

export function NotificationHub() {
  const { data: user } = useCurrentUser();
  const { data: requests, isLoading: requestsLoading, refetch } = useBloodRequests();
  const respondMutation = useRespondToMatch();
  const revealMutation = useRevealDonorContact();
  const confirmMatchMutation = useConfirmMatchCompletion();
  const reopenMutation = useReopenRequest();

  // Track revealed contacts by match_id for recipients
  const [revealedContacts, setRevealedContacts] = useState<Record<string, DonorContactReveal>>({});
  const [revealingMatchId, setRevealingMatchId] = useState<string | null>(null);

  const isRegularUser = !!user && (user.role === "DONOR" || user.role === "RECIPIENT");

  // If unauthenticated or role is not a regular member, do not render
  if (!user || !isRegularUser) {
    return null;
  }

  // 1. DONOR Logic: Filter incoming blood requests that contain a match for this donor
  const donorId = user.donor?.donor_id || user.user_id;

  const donorMatchedItems: {
    request: BloodRequestResponse;
    match: MaskedDonorMatchResponse;
  }[] = [];

  if (requests) {
    for (const req of requests) {
      if (req.matches && req.matches.length > 0) {
        for (const m of req.matches) {
          if (m.donor_id === donorId) {
            donorMatchedItems.push({ request: req, match: m });
          }
        }
      }
    }
  }

  // Check if donor has an active commitment (ACCEPTED and not yet completed/cancelled/reopened)
  const activeCommitments = donorMatchedItems.filter(
    (item) =>
      item.match.response_status === "ACCEPTED" &&
      item.request.status !== "COMPLETED" &&
      item.request.status !== "CANCELLED" &&
      item.request.status !== "OPEN"
  );
  const hasActiveCommitment = activeCommitments.length > 0;

  // Pending donor requests requiring action
  const pendingDonorMatches = donorMatchedItems.filter(
    (item) => item.match.response_status === "PENDING"
  );
  const resolvedDonorMatches = donorMatchedItems.filter(
    (item) => item.match.response_status !== "PENDING"
  );

  // 2. RECIPIENT Logic: Filter requests created by this recipient
  const recipientRequests = requests
    ? requests.filter((r) => r.recipient_id === user.user_id)
    : [];

  // Find accepted matches across recipient's requests
  const acceptedMatchesForRecipient: {
    request: BloodRequestResponse;
    match: MaskedDonorMatchResponse;
  }[] = [];

  for (const req of recipientRequests) {
    if (req.matches) {
      for (const m of req.matches) {
        if (m.response_status === "ACCEPTED") {
          acceptedMatchesForRecipient.push({ request: req, match: m });
        }
      }
    }
  }

  // Count active badge notifications across both capabilities
  const notificationCount = pendingDonorMatches.length + acceptedMatchesForRecipient.length;

  // Donor action handlers
  const handleDonorResponse = (matchId: string, response: "ACCEPTED" | "DECLINED") => {
    respondMutation.mutate(
      { matchId, payload: { response, response_status: response } },
      {
        onSuccess: () => {
          refetch();
          if (response === "ACCEPTED") {
            toast.success("Donation request accepted! Contact details unlocked for recipient.");
          } else {
            toast.info("Request declined cleanly. Dismissed from your queue.");
          }
        },
      }
    );
  };

  // Cancel / Release active commitment handler
  const handleCancelCommitment = async (matchId: string, requestId: string) => {
    try {
      await reopenMutation.mutateAsync({
        requestId,
        reason: "Donor released commitment from notification hub",
      });
      refetch();
    } catch {
      respondMutation.mutate(
        { matchId, payload: { response: "DECLINED", response_status: "DECLINED" } },
        {
          onSuccess: () => {
            refetch();
            toast.success("Commitment released. You can now accept other requests.");
          },
          onError: () => {
            toast.error("Unable to release commitment. Please try again or refresh.");
          },
        }
      );
    }
  };

  // Recipient action handler to reveal donor contact
  const handleRevealContact = (matchId: string) => {
    setRevealingMatchId(matchId);
    revealMutation.mutate(matchId, {
      onSuccess: (data) => {
        setRevealedContacts((prev) => ({ ...prev, [matchId]: data }));
        setRevealingMatchId(null);
        toast.success(`Contact details revealed for ${data.full_name}`);
      },
      onError: (err) => {
        setRevealingMatchId(null);
        toast.error(err.message || "Failed to reveal contact information.");
      },
    });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          aria-label="Notifications and alerts"
          className="relative rounded-md p-2 transition-colors hover:bg-primary-glow/40 text-primary-foreground"
        >
          <Bell className="size-5" />
          {notificationCount > 0 && (
            <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-background text-[10px] font-bold text-primary shadow-sm">
              {notificationCount}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent className="w-full overflow-y-auto sm:max-w-lg p-4 sm:p-6">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="size-4 text-primary" />
            Notifications Hub
          </SheetTitle>
          <SheetDescription>
            Live alerts for incoming donation matches and your active blood requests.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 pb-8 pt-4">
          {requestsLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              <Loader2 className="mx-auto size-6 animate-spin text-primary" />
              <p className="mt-2 text-xs">Checking live notifications...</p>
            </div>
          ) : (
            <Tabs defaultValue={pendingDonorMatches.length > 0 ? "donor" : "recipient"} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="donor" className="text-xs">
                  Donor Matches ({pendingDonorMatches.length})
                </TabsTrigger>
                <TabsTrigger value="recipient" className="text-xs">
                  My Requests ({acceptedMatchesForRecipient.length})
                </TabsTrigger>
              </TabsList>

              {/* ====================================================================
               * DONOR NOTIFICATION VIEW
               * ==================================================================== */}
              <TabsContent value="donor" className="space-y-4">
                {/* Active Commitment Card(s) - Prominently Displayed at Top */}
                {activeCommitments.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                        Active Donation Commitment
                      </h3>
                      <Badge className="bg-emerald-600 text-white text-[10px]">
                        In Progress
                      </Badge>
                    </div>

                    {activeCommitments.map(({ request, match }) => (
                      <div
                        key={match.match_id}
                        className="rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10 dark:bg-emerald-950/20 p-4 shadow-sm space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-base text-primary">
                                {formatBloodGroup(request.blood_group)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({request.component_type.replace("_", " ")})
                              </span>
                              {getUrgencyBadge(request.urgency)}
                            </div>
                            <p className="text-xs font-medium text-foreground mt-0.5 flex items-center gap-1">
                              <MapPin className="size-3 text-muted-foreground shrink-0" />
                              <span className="truncate">{request.hospital_name || request.required_location}</span>
                            </p>
                            {request.area_zone && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Zone: {request.area_zone}
                              </p>
                            )}
                            {request.attendant_phone_number && !request.attendant_phone_number.includes("*") && (
                              <p className="text-xs font-semibold text-foreground flex items-center gap-1 mt-1">
                                <Phone className="size-3 text-emerald-600 shrink-0" />
                                <span>Attendant: {request.attendant_phone_number}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {request.notes && (
                          <p className="text-xs text-muted-foreground bg-background/50 rounded p-2 italic break-words border border-border/40">
                            "{request.notes}"
                          </p>
                        )}

                        <div className="pt-2 border-t border-emerald-500/30 flex flex-col sm:flex-row gap-2">
                          {!match.donor_confirmed_completion ? (
                            <Button
                              size="sm"
                              className="flex-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                              disabled={confirmMatchMutation.isPending}
                              onClick={() => {
                                confirmMatchMutation.mutate(match.match_id, {
                                  onSuccess: () => refetch(),
                                });
                              }}
                            >
                              {confirmMatchMutation.isPending ? (
                                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                              ) : (
                                <Check className="size-3.5 mr-1.5" />
                              )}
                              Confirm Donation Completed
                            </Button>
                          ) : (
                            <div className="flex-1 rounded bg-purple-100 dark:bg-purple-950/40 p-2 text-[11px] text-purple-700 dark:text-purple-300 font-semibold flex items-center gap-1.5">
                              <CheckCircle2 className="size-3.5 text-purple-600 shrink-0" />
                              <span>Awaiting Recipient Confirmation</span>
                            </div>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs font-semibold text-destructive hover:bg-destructive/10 border-destructive/40 h-8"
                            disabled={reopenMutation.isPending || respondMutation.isPending}
                            onClick={() => handleCancelCommitment(match.match_id, request.request_id)}
                          >
                            {reopenMutation.isPending || respondMutation.isPending ? (
                              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <RotateCcw className="size-3.5 mr-1.5" />
                            )}
                            Cancel & Release
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Separator className="my-2" />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Incoming Match Requests</h3>
                  <Badge variant={pendingDonorMatches.length > 0 ? "default" : "secondary"}>
                    {pendingDonorMatches.length} Pending
                  </Badge>
                </div>

                {hasActiveCommitment && (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                    <ShieldAlert className="size-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">You have an active donation commitment shown above.</p>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                        Complete your donation or click <strong>Cancel & Release</strong> above before accepting another request.
                      </p>
                    </div>
                  </div>
                )}

                {pendingDonorMatches.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    <ShieldCheck className="mx-auto size-8 text-muted-foreground/60 mb-2" />
                    <p className="font-medium text-foreground">No pending match requests.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      When an active patient request matches your blood group and radius, it will appear here for contact approval.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingDonorMatches.map(({ request, match }) => (
                      <div
                        key={match.match_id}
                        className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm overflow-hidden"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-base text-primary">
                                {formatBloodGroup(request.blood_group)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({request.component_type.replace("_", " ")})
                              </span>
                            </div>
                            <p className="text-xs font-medium text-foreground mt-0.5 flex items-center gap-1">
                              <MapPin className="size-3 text-muted-foreground shrink-0" />
                              <span className="truncate">{request.required_location}</span>
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="size-3 shrink-0" />
                              Distance: ~{match.distance_km} km
                            </p>
                          </div>
                          <div className="shrink-0">
                            {getUrgencyBadge(request.urgency)}
                          </div>
                        </div>

                        {request.notes && (
                          <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2 italic break-words">
                            "{request.notes}"
                          </p>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 w-full">
                          <Button
                            size="sm"
                            className="w-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white min-w-0"
                            disabled={respondMutation.isPending || hasActiveCommitment}
                            title={hasActiveCommitment ? "You have an active donation commitment in progress." : undefined}
                            onClick={() => handleDonorResponse(match.match_id, "ACCEPTED")}
                          >
                            <Check className="mr-1.5 size-3.5 shrink-0" />
                            <span className="truncate">Accept Request</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs text-destructive hover:bg-destructive/10 border-destructive/30 min-w-0"
                            disabled={respondMutation.isPending}
                            onClick={() => handleDonorResponse(match.match_id, "DECLINED")}
                          >
                            <X className="mr-1.5 size-3.5 shrink-0" />
                            <span className="truncate">Decline Request</span>
                          </Button>
                        </div>
                        {hasActiveCommitment && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            * You have an active donation commitment in progress.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Resolved history */}
                {resolvedDonorMatches.length > 0 && (
                  <>
                    <Separator className="my-3" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Previous Responses
                    </h3>
                    <div className="space-y-2">
                      {resolvedDonorMatches.slice(0, 5).map(({ request, match }) => {
                        const isAccepted = match.response_status === "ACCEPTED";
                        const isCompleted = request.status === "COMPLETED" || (match.donor_confirmed_completion && match.recipient_confirmed_completion);
                        const isCanRelease = isAccepted && !isCompleted && request.status !== "CANCELLED" && request.status !== "OPEN";

                        return (
                          <div
                            key={match.match_id}
                            className="flex flex-col gap-2 text-xs rounded-lg border border-border/50 p-3 bg-muted/20"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">
                                  {formatBloodGroup(request.blood_group)} for {request.required_location}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {isAccepted
                                    ? "Contact details shared with recipient."
                                    : "You declined this match."}
                                </p>
                              </div>
                              <Badge
                                variant={isCompleted ? "default" : isAccepted ? "secondary" : "outline"}
                                className={`text-[10px] ${isCompleted ? "bg-purple-600 text-white" : ""}`}
                              >
                                {isCompleted ? "COMPLETED" : match.response_status}
                              </Badge>
                            </div>

                            {/* Mutual Completion Status & Action for Donor (Part 2.2) */}
                            {isAccepted && (
                              isCompleted ? (
                                <div className="rounded bg-purple-50 dark:bg-purple-950/30 p-2 text-[11px] text-purple-700 dark:text-purple-300 font-medium flex items-center gap-1.5">
                                  <CheckCircle2 className="size-3.5 text-purple-600 shrink-0" />
                                  <span>Donation verified! Cooldown active until 90 days ahead.</span>
                                </div>
                              ) : request.status !== "CANCELLED" && (
                                <div className="pt-2 border-t border-border/40 space-y-1.5">
                                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span>Verification Status:</span>
                                    <span className="font-semibold text-foreground">
                                      {match.donor_confirmed_completion
                                        ? "Waiting for Recipient confirmation..."
                                        : "Awaiting physical completion"}
                                    </span>
                                  </div>
                                  <div className="flex flex-col sm:flex-row gap-1.5 pt-1">
                                    {!match.donor_confirmed_completion && (
                                      <Button
                                        size="sm"
                                        className="flex-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-7 cursor-pointer"
                                        disabled={confirmMatchMutation.isPending}
                                        onClick={() => {
                                          confirmMatchMutation.mutate(match.match_id, {
                                            onSuccess: () => refetch(),
                                          });
                                        }}
                                      >
                                        {confirmMatchMutation.isPending ? (
                                          <Loader2 className="size-3 mr-1 animate-spin" />
                                        ) : (
                                          <Check className="size-3 mr-1" />
                                        )}
                                        Confirm Donation Completed
                                      </Button>
                                    )}
                                    {isCanRelease && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs text-destructive hover:bg-destructive/10 border-destructive/30 h-7"
                                        disabled={reopenMutation.isPending || respondMutation.isPending}
                                        onClick={() => handleCancelCommitment(match.match_id, request.request_id)}
                                      >
                                        <RotateCcw className="size-3 mr-1" />
                                        Cancel & Release
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </TabsContent>

              {/* ====================================================================
               * RECIPIENT NOTIFICATION VIEW
               * ==================================================================== */}
              <TabsContent value="recipient" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Donor Acceptance Updates</h3>
                  <Badge variant={acceptedMatchesForRecipient.length > 0 ? "default" : "secondary"}>
                    {acceptedMatchesForRecipient.length} Accepted
                  </Badge>
                </div>

                {acceptedMatchesForRecipient.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    <HeartHandshake className="mx-auto size-8 text-muted-foreground/60 mb-2" />
                    <p className="font-medium text-foreground">No donor acceptances yet.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      When a compatible donor accepts your blood request, you'll receive an instant notification here to view their verified contact details.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {acceptedMatchesForRecipient.map(({ request, match }) => {
                      const revealed = revealedContacts[match.match_id];
                      const isRevealing = revealingMatchId === match.match_id;
                      const isCompleted = request.status === "COMPLETED" || (match.donor_confirmed_completion && match.recipient_confirmed_completion);

                      return (
                        <div
                          key={match.match_id}
                          className="space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-xs">
                                <UserCheck className="size-4" /> Donor Accepted!
                              </div>
                              <p className="text-xs text-foreground mt-1">
                                A compatible donor has accepted your <strong>{formatBloodGroup(request.blood_group)}</strong> request for <em>{request.required_location}</em>.
                              </p>
                            </div>
                            <Badge className={`text-[10px] ${isCompleted ? "bg-purple-600 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}>
                              {isCompleted ? "COMPLETED" : "ACCEPTED"}
                            </Badge>
                          </div>

                          {revealed ? (
                            <div className="rounded-md border border-emerald-500/40 bg-card p-3 space-y-1.5 text-xs">
                              <p className="font-bold text-foreground flex items-center gap-1 text-sm">
                                <Check className="size-4 text-emerald-600" /> {revealed.full_name}
                              </p>
                              <p className="text-foreground flex items-center gap-1.5">
                                <Phone className="size-3.5 text-primary" />
                                <a
                                  href={`tel:${revealed.phone}`}
                                  className="font-medium underline hover:text-primary"
                                >
                                  {revealed.phone}
                                </a>
                              </p>
                              <p className="text-muted-foreground flex items-center gap-1.5">
                                <MapPin className="size-3.5 text-primary" />
                                {revealed.address}
                              </p>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              className="w-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                              disabled={isRevealing}
                              onClick={() => handleRevealContact(match.match_id)}
                            >
                              {isRevealing ? (
                                <Loader2 className="mr-1 size-3.5 animate-spin" />
                              ) : (
                                <Phone className="mr-1 size-3.5" />
                              )}
                              Click to View Contact Details
                            </Button>
                          )}

                          {/* Mutual Completion Status & Action for Recipient (Part 2.2) */}
                          {isCompleted ? (
                            <div className="rounded bg-purple-50 dark:bg-purple-950/30 p-2 text-[11px] text-purple-700 dark:text-purple-300 font-medium flex items-center gap-1.5">
                              <CheckCircle2 className="size-3.5 text-purple-600 shrink-0" />
                              <span>Donation verified! Donor placed on 90-day recovery cooldown.</span>
                            </div>
                          ) : request.status !== "CANCELLED" && (
                            <div className="pt-2 border-t border-emerald-500/20 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>Mutual Verification:</span>
                                <span className="font-semibold text-foreground">
                                  {match.recipient_confirmed_completion
                                    ? "Waiting for Donor confirmation..."
                                    : match.donor_confirmed_completion
                                    ? "Donor Confirmed! Awaiting your confirmation."
                                    : "Awaiting physical completion"}
                                </span>
                              </div>
                              {!match.recipient_confirmed_completion && (
                                <Button
                                  size="sm"
                                  className="w-full text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white h-7 cursor-pointer"
                                  disabled={confirmMatchMutation.isPending}
                                  onClick={() => {
                                    confirmMatchMutation.mutate(match.match_id, {
                                      onSuccess: () => refetch(),
                                    });
                                  }}
                                >
                                  {confirmMatchMutation.isPending ? (
                                    <Loader2 className="size-3 mr-1 animate-spin" />
                                  ) : (
                                    <Check className="size-3 mr-1" />
                                  )}
                                  Confirm Donation Completed
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Status summary of submitted requests */}
                {recipientRequests.length > 0 && (
                  <>
                    <Separator className="my-3" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Your Active Requests ({recipientRequests.length})
                    </h3>
                    <div className="space-y-2">
                      {recipientRequests.slice(0, 4).map((r) => (
                        <div
                          key={r.request_id}
                          className="flex items-center justify-between text-xs rounded border border-border/50 p-2.5 bg-muted/20"
                        >
                          <div>
                            <p className="font-medium flex items-center gap-1.5">
                              <span>{formatBloodGroup(r.blood_group)}</span>
                              <span>·</span>
                              <span>{r.quantity} Unit(s) ({r.volume_ml || Number(r.quantity) * 450} mL)</span>
                              {r.patient_name && <span className="text-muted-foreground">({r.patient_name})</span>}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {r.hospital_name || r.required_location} {r.area_zone ? `· ${r.area_zone}` : ""}
                            </p>
                          </div>
                          <Badge
                            className={
                              r.status === "OPEN"
                                ? "bg-blue-600 hover:bg-blue-700 text-white text-[10px]"
                                : r.status === "ACCEPTED"
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white text-[10px]"
                                : r.status === "PROCESSING"
                                ? "bg-amber-600 hover:bg-amber-700 text-white text-[10px]"
                                : r.status === "COMPLETED"
                                ? "bg-purple-600 hover:bg-purple-700 text-white text-[10px]"
                                : "text-[10px]"
                            }
                            variant={r.status === "CANCELLED" ? "destructive" : "outline"}
                          >
                            {r.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
