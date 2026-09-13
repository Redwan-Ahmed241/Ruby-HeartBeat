import { useState } from "react";
import {
  Bell,
  Check,
  Phone,
  X,
  AlertCircle,
  Clock,
  MapPin,
  HeartHandshake,
  UserCheck,
  ShieldCheck,
  ExternalLink,
  Loader2,
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
import { Separator } from "@/components/ui/separator";
import { useCurrentUser } from "@/hooks/useAuth";
import { useBloodRequests, useRespondToMatch, useRevealDonorContact } from "@/hooks/useRequests";
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
    .replace("_PLUS", "+")
    .replace("_MINUS", "-")
    .replace("_", " ");
}

// Helper to format urgency badge styling
function getUrgencyBadge(urgency: RequestUrgency | string) {
  if (urgency === "EMERGENCY") {
    return <Badge variant="destructive" className="font-semibold animate-pulse">EMERGENCY</Badge>;
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

  // Track revealed contacts by match_id for recipients
  const [revealedContacts, setRevealedContacts] = useState<Record<string, DonorContactReveal>>({});
  const [revealingMatchId, setRevealingMatchId] = useState<string | null>(null);

  const isDonor = user?.role === "DONOR";
  const isRecipient = user?.role === "RECIPIENT";

  // If unauthenticated or role is neither DONOR nor RECIPIENT, do not render
  if (!user || (!isDonor && !isRecipient)) {
    return null;
  }

  // 1. DONOR Logic: Filter incoming blood requests that contain a match for this donor
  // Note: user.donor?.donor_id or user.user_id matches the donor_id in MaskedDonorMatchResponse
  const donorId = user.donor?.donor_id || user.user_id;

  const donorMatchedItems: {
    request: BloodRequestResponse;
    match: MaskedDonorMatchResponse;
  }[] = [];

  if (isDonor && requests) {
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

  // Pending donor requests requiring action
  const pendingDonorMatches = donorMatchedItems.filter(
    (item) => item.match.response_status === "PENDING"
  );
  const resolvedDonorMatches = donorMatchedItems.filter(
    (item) => item.match.response_status !== "PENDING"
  );

  // 2. RECIPIENT Logic: Filter requests created by this recipient
  const recipientRequests = isRecipient && requests
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

  // Count active badge notifications
  const notificationCount = isDonor
    ? pendingDonorMatches.length
    : acceptedMatchesForRecipient.length;

  // Donor action handlers
  const handleDonorResponse = (matchId: string, response: "ACCEPTED" | "DECLINED") => {
    respondMutation.mutate(
      { matchId, payload: { response } },
      {
        onSuccess: () => {
          refetch();
          if (response === "ACCEPTED") {
            toast.success("Contact details shared with recipient.");
          } else {
            toast.info("You declined this request.");
          }
        },
      }
    );
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

      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="size-4 text-primary" />
            {isDonor ? "Donor Match Notifications" : "Blood Request Alerts"}
          </SheetTitle>
          <SheetDescription>
            {isDonor
              ? "Incoming emergency & urgent matching requests seeking your compatible blood."
              : "Live updates and donor acceptance alerts on your submitted blood requests."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-8 pt-4">
          {requestsLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              <Loader2 className="mx-auto size-6 animate-spin text-primary" />
              <p className="mt-2 text-xs">Checking live notifications...</p>
            </div>
          ) : isDonor ? (
            /* ====================================================================
             * DONOR NOTIFICATION VIEW
             * ==================================================================== */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Incoming Match Requests</h3>
                <Badge variant={pendingDonorMatches.length > 0 ? "default" : "secondary"}>
                  {pendingDonorMatches.length} Pending
                </Badge>
              </div>

              {pendingDonorMatches.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  <ShieldCheck className="mx-auto size-8 text-muted-foreground/60 mb-2" />
                  <p className="font-medium text-foreground">No new notifications. You're all caught up!</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    When an active patient request matches your blood group and radius, it will appear here for contact approval.
                  </p>
                </div>
              ) : (
                pendingDonorMatches.map(({ request, match }) => (
                  <div
                    key={match.match_id}
                    className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-primary">
                            {formatBloodGroup(request.blood_group)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({request.component_type.replace("_", " ")})
                          </span>
                        </div>
                        <p className="text-xs font-medium text-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="size-3 text-muted-foreground" />
                          {request.required_location}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="size-3" />
                          Distance: ~{match.distance_km} km · Urgency:
                        </p>
                      </div>
                      {getUrgencyBadge(request.urgency)}
                    </div>

                    {request.notes && (
                      <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2 italic">
                        "{request.notes}"
                      </p>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1 text-xs font-semibold"
                        disabled={respondMutation.isPending}
                        onClick={() => handleDonorResponse(match.match_id, "ACCEPTED")}
                      >
                        <Phone className="mr-1 size-3.5" /> Approve Contact Access
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        disabled={respondMutation.isPending}
                        onClick={() => handleDonorResponse(match.match_id, "DECLINED")}
                      >
                        <X className="mr-1 size-3.5" /> Decline
                      </Button>
                    </div>
                  </div>
                ))
              )}

              {/* Resolved history */}
              {resolvedDonorMatches.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Previous Responses
                  </h3>
                  <div className="space-y-2">
                    {resolvedDonorMatches.slice(0, 5).map(({ request, match }) => (
                      <div
                        key={match.match_id}
                        className="flex items-center justify-between text-xs rounded border border-border/50 p-2.5 bg-muted/20"
                      >
                        <div>
                          <p className="font-medium">
                            {formatBloodGroup(request.blood_group)} for {request.required_location}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {match.response_status === "ACCEPTED"
                              ? "Contact details shared with recipient."
                              : "You declined this match."}
                          </p>
                        </div>
                        <Badge
                          variant={match.response_status === "ACCEPTED" ? "default" : "outline"}
                          className="text-[10px]"
                        >
                          {match.response_status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* ====================================================================
             * RECIPIENT NOTIFICATION VIEW
             * ==================================================================== */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Donor Acceptance Updates</h3>
                <Badge variant={acceptedMatchesForRecipient.length > 0 ? "default" : "secondary"}>
                  {acceptedMatchesForRecipient.length} Accepted
                </Badge>
              </div>

              {acceptedMatchesForRecipient.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  <HeartHandshake className="mx-auto size-8 text-muted-foreground/60 mb-2" />
                  <p className="font-medium text-foreground">No new notifications. You're all caught up!</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    When a compatible donor accepts your blood request, you'll receive an instant notification here to view their verified contact details.
                  </p>
                </div>
              ) : (
                acceptedMatchesForRecipient.map(({ request, match }) => {
                  const revealed = revealedContacts[match.match_id];
                  const isRevealing = revealingMatchId === match.match_id;

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
                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px]">
                          ACCEPTED
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
                          className="w-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
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
                    </div>
                  );
                })
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
                          <p className="font-medium">
                            {formatBloodGroup(r.blood_group)} · {r.quantity} Unit(s)
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {r.required_location}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {r.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
