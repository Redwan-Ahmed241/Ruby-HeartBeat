import { lazy, Suspense, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Droplet,
  HeartHandshake,
  Lock,
  MapPin,
  Phone,
  PhoneCall,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  UserCheck,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useBloodRequest, useAcceptRequest, useReopenRequest } from "@/hooks/useRequests";
import { useCurrentUser } from "@/hooks/useAuth";
import { useDonorEligibility } from "@/hooks/useDonor";
import { formatBloodGroup } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const HospitalMap = lazy(() => import("@/components/HospitalMap"));

export const Route = createFileRoute("/request/$requestId")({
  head: () => ({
    meta: [
      { title: "Emergency Blood Request — LifeDrop" },
      { name: "description", content: "Urgent blood transfusion request details and direct donor contact flow." },
    ],
  }),
  component: RequestLandingPage,
});

function RequestLandingPage() {
  const { requestId } = Route.useParams();
  const navigate = useNavigate();
  const { data: req, isLoading, error } = useBloodRequest(requestId);
  const { data: currentUser } = useCurrentUser();
  const { data: eligibility } = useDonorEligibility(!!currentUser && currentUser.role === "DONOR");
  const acceptMutation = useAcceptRequest();

  // Clinical recovery cooldown check (from server eligibility or donor last_donation_date fallback)
  const isCooldownActive = Boolean(
    eligibility?.cooldown_active ||
    (currentUser?.donor?.last_donation_date && (
      (Date.now() - new Date(currentUser.donor.last_donation_date).getTime()) < 90 * 24 * 60 * 60 * 1000 &&
      (Date.now() - new Date(currentUser.donor.last_donation_date).getTime()) >= 0
    ))
  );

  const cooldownDaysRemaining = eligibility?.cooldown_days_remaining ?? (
    currentUser?.donor?.last_donation_date
      ? Math.max(0, 90 - Math.floor((Date.now() - new Date(currentUser.donor.last_donation_date).getTime()) / (24 * 60 * 60 * 1000)))
      : 0
  );

  const nextEligibleDate = eligibility?.next_eligible_date ?? (
    currentUser?.donor?.last_donation_date
      ? new Date(new Date(currentUser.donor.last_donation_date).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : null
  );

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const reopenMutation = useReopenRequest();

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 px-4">
        <div className="size-12 rounded-full border-4 border-red-600 border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading emergency request details...</p>
      </div>
    );
  }

  if (error || !req) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 px-4 text-center">
        <div className="size-16 rounded-full bg-red-100 text-red-600 dark:bg-red-950/50 flex items-center justify-center">
          <AlertCircle className="size-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Request Not Found</h2>
        <p className="text-muted-foreground max-w-md">
          This blood request could not be located or may have been removed.
        </p>
        <Link to="/">
          <Button variant="outline">
            <ChevronLeft className="size-4 mr-2" /> Back to Home
          </Button>
        </Link>
      </div>
    );
  }

  const isEmergency = req.urgency === "EMERGENCY";
  const isAccepted = req.status === "ACCEPTED" || req.status === "MATCHED";
  const isCompleted = req.status === "COMPLETED";
  const isCancelled = req.status === "CANCELLED";
  const isAcceptedByMe =
    isAccepted &&
    currentUser &&
    (req.accepted_donor_id === currentUser.user_id ||
      (req.matches &&
        req.matches.some(
          (m) => m.donor_id === currentUser.user_id && m.response_status === "ACCEPTED"
        )));
  const isAcceptedByOther =
    isAccepted &&
    (!currentUser ||
      (req.accepted_donor_id
        ? req.accepted_donor_id !== currentUser.user_id
        : !isAcceptedByMe));
  const isOwner = currentUser && req.recipient_id === currentUser.user_id;

  // Phone unmasked check: unmasked if not containing '*'
  const isPhoneUnmasked = !!req.attendant_phone_number && !req.attendant_phone_number.includes("*");

  const handleDonateClick = () => {
    if (!currentUser) {
      setAuthPromptOpen(true);
      return;
    }
    if (isCooldownActive) {
      toast.error(
        `Clinical Safety Cooldown: You donated recently (${cooldownDaysRemaining} days remaining until ${nextEligibleDate}). You cannot accept new donation requests during your recovery period.`
      );
      return;
    }
    setConfirmModalOpen(true);
  };

  const handleConfirmAccept = async () => {
    try {
      await acceptMutation.mutateAsync(requestId);
      setConfirmModalOpen(false);
      setSuccessModalOpen(true);
    } catch {
      // Error handled by mutation toast
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-muted/40 to-background pb-16 pt-6 sm:pt-10 w-full overflow-x-hidden">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 space-y-6 min-w-0">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="size-4 mr-1" />
            Back to LifeDrop
          </Link>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              LifeDrop Dispatch Network
            </span>
          </div>
        </div>

        {/* Emergency Alert Banner */}
        {isEmergency && !isCompleted && !isCancelled && (
          <div className="rounded-2xl border-2 border-red-500/40 bg-red-500/10 p-4 sm:p-5 text-red-950 dark:text-red-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
            <div className="flex items-start gap-3 min-w-0">
              <div className="size-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertCircle className="size-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold flex items-center gap-2 flex-wrap">
                  <span>CRITICAL EMERGENCY BLOOD REQUEST</span>
                  <Badge variant="destructive" className="text-[10px] uppercase font-mono">
                    High Priority
                  </Badge>
                </h3>
                <p className="text-xs opacity-90 mt-0.5 break-words">
                  A patient requires immediate transfusion at {req.hospital_name || req.required_location}. Donors in the area are alerted simultaneously.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Request Hero Card */}
        <Card className="border-border shadow-md overflow-hidden min-w-0">
          <div className="bg-linear-to-r from-red-600 via-red-700 to-rose-700 p-5 sm:p-8 text-white relative">
            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs backdrop-blur-xs font-semibold">
                    {req.urgency}
                  </Badge>
                  <Badge
                    className={`border-0 text-xs font-semibold ${
                      req.status === "OPEN"
                        ? "bg-blue-500/80 text-white"
                        : req.status === "ACCEPTED"
                        ? "bg-emerald-500/80 text-white"
                        : req.status === "COMPLETED"
                        ? "bg-purple-500/80 text-white"
                        : "bg-black/30 text-white"
                    }`}
                  >
                    STATUS: {req.status}
                  </Badge>
                  {isAcceptedByMe && (
                    <Badge className="bg-emerald-400 text-emerald-950 font-bold text-xs">
                      ACCEPTED BY YOU
                    </Badge>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight break-words">
                  {req.patient_name ? `Blood Required for ${req.patient_name}` : "Urgent Blood Donation Required"}
                </h1>
                <p className="text-sm opacity-90 flex items-center gap-1.5 flex-wrap">
                  <Building2 className="size-4 shrink-0" />
                  <span className="break-words">{req.hospital_name || req.required_location}</span>
                  {req.area_zone && <span>· ({req.area_zone})</span>}
                </p>
              </div>

              {/* Large Blood Group Badge */}
              <div className="flex flex-col items-center justify-center size-20 sm:size-28 rounded-2xl bg-white text-red-700 shadow-lg shrink-0 self-start sm:self-auto border-2 border-white/50">
                <span className="text-2xl sm:text-4xl font-black leading-none tracking-tight">
                  {formatBloodGroup(req.blood_group, "symbol")}
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
                  Required Group
                </span>
              </div>
            </div>
          </div>

          <CardContent className="p-4 sm:p-6 md:p-8 space-y-6">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="rounded-xl border border-border bg-muted/30 p-3 sm:p-3.5 space-y-1 min-w-0">
                <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Droplet className="size-3.5 text-red-600 shrink-0" /> Units Required
                </span>
                <p className="text-sm sm:text-base font-bold text-foreground">
                  {req.quantity} Unit{Number(req.quantity) > 1 ? "s" : ""}
                </p>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground block truncate">
                  {req.volume_ml ? `${req.volume_ml} mL total` : `${Number(req.quantity) * 450} mL total`}
                </span>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-3 sm:p-3.5 space-y-1 min-w-0">
                <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="size-3.5 text-blue-600 shrink-0" /> Component Type
                </span>
                <p className="text-sm sm:text-base font-bold text-foreground truncate">
                  {req.component_type.replace("_", " ")}
                </p>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground block truncate">Standard packaging</span>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-3 sm:p-3.5 space-y-1 min-w-0">
                <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="size-3.5 text-amber-600 shrink-0" /> Hospital Zone
                </span>
                <p className="text-sm sm:text-base font-bold text-foreground truncate">
                  {req.area_zone || "Dhaka Metro"}
                </p>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground block truncate">
                  {req.hospital_name || "General Center"}
                </span>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-3 sm:p-3.5 space-y-1 min-w-0">
                <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Clock className="size-3.5 text-purple-600 shrink-0" /> Dispatched Date
                </span>
                <p className="text-sm sm:text-base font-bold text-foreground truncate">
                  {req.request_date ? new Date(req.request_date).toLocaleDateString() : "Today"}
                </p>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground block truncate">Immediate action</span>
              </div>
            </div>

            {/* Request Location & Attendant Privacy Card */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Location & Direct Attendant Contact
              </h3>

              <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="size-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground">Required Location</span>
                    <p className="text-sm font-medium text-foreground">{req.required_location}</p>
                  </div>
                </div>

                {/* Privacy Attendant Contact Box */}
                <div
                  className={`rounded-xl border p-4 transition-all ${
                    isPhoneUnmasked
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-amber-500/30 bg-amber-500/5"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {isPhoneUnmasked ? (
                          <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Lock className="size-4 text-amber-600 shrink-0" />
                        )}
                        <span className="text-xs font-bold text-foreground">
                          {isPhoneUnmasked ? "Direct Attendant Contact (Unmasked)" : "Attendant Contact (Masked for Privacy)"}
                        </span>
                      </div>

                      <div className="text-base sm:text-lg font-mono font-bold tracking-wider text-foreground">
                        {req.attendant_phone_number || "Not specified"}
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {isPhoneUnmasked
                          ? "Direct contact is unlocked. Please call the attendant directly to coordinate your arrival."
                          : "Attendant contact remains masked until you volunteer and accept this donation request."}
                      </p>
                    </div>

                    {isPhoneUnmasked && req.attendant_phone_number && (
                      <a href={`tel:${req.attendant_phone_number}`}>
                        <Button
                          size="default"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shrink-0 shadow-xs"
                        >
                          <PhoneCall className="size-4 mr-2" />
                          Call Attendant Now
                        </Button>
                      </a>
                    )}
                  </div>
                </div>

                {req.notes && (
                  <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Attendant Notes: </span>
                    {req.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Hospital Map */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Hospital Transfusion Map
              </h3>
              <Suspense
                fallback={
                  <div className="h-[240px] sm:h-[300px] w-full rounded-xl border border-border bg-muted/20 flex items-center justify-center text-xs text-muted-foreground">
                    Loading hospital map...
                  </div>
                }
              >
                <HospitalMap
                  latitude={req.latitude}
                  longitude={req.longitude}
                  hospitalName={req.hospital_name || "Hospital Location"}
                  areaZone={req.area_zone}
                />
              </Suspense>
            </div>
          </CardContent>

          {/* Action Footer */}
          <CardFooter className="bg-muted/20 border-t border-border p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground text-center sm:text-left space-y-1">
              <p className="font-semibold text-foreground flex items-center justify-center sm:justify-start gap-1.5">
                <HeartHandshake className="size-4 text-red-600" />
                Two-Sided Safety & Voluntary Donation Protocol
              </p>
              <p>
                Accepting this request will share your registered donor name and contact with the patient&apos;s attendant and notify them immediately.
              </p>
            </div>

            {/* CTA Flow Buttons */}
            {req.status === "OPEN" && !isOwner && (
              isCooldownActive ? (
                <div className="flex flex-col items-center sm:items-end gap-1.5 w-full sm:w-auto">
                  <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/10 text-xs px-3 py-1.5 flex items-center gap-1.5 font-semibold">
                    <ShieldAlert className="size-3.5 shrink-0" />
                    <span>In 90-Day Cooldown ({cooldownDaysRemaining} days remaining)</span>
                  </Badge>
                  <p className="text-[11px] text-muted-foreground text-center sm:text-right">
                    Eligible to donate again on <strong>{nextEligibleDate}</strong>
                  </p>
                </div>
              ) : (
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-6 py-6 shadow-md shrink-0"
                  onClick={handleDonateClick}
                  disabled={acceptMutation.isPending}
                >
                  <HeartHandshake className="size-5 mr-2" />
                  {acceptMutation.isPending ? "Accepting..." : "I Want to Donate & Share My Contact"}
                </Button>
              )
            )}

            {isAcceptedByMe && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto flex-wrap">
                <Badge className="bg-emerald-600 text-white p-2 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 w-full sm:w-auto">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>You Accepted This Request</span>
                </Badge>
                {req.attendant_phone_number && (
                  <a href={`tel:${req.attendant_phone_number}`} className="w-full sm:w-auto">
                    <Button size="sm" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                      <Phone className="size-3 mr-1" /> Call Attendant
                    </Button>
                  </a>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400 font-semibold text-xs gap-1"
                  onClick={() => setReopenModalOpen(true)}
                >
                  <RotateCcw className="size-3.5 shrink-0" /> Unable to Donate / Cancel Commitment
                </Button>
              </div>
            )}

            {isAcceptedByOther && (
              <Badge variant="outline" className="w-full sm:w-auto justify-center text-xs font-semibold p-2 px-3 text-muted-foreground border-border">
                <UserCheck className="size-4 mr-1 text-emerald-600 shrink-0" />
                <span>A volunteer donor has already accepted this request</span>
              </Badge>
            )}

            {isOwner && (req.status === "ACCEPTED" || req.status === "PROCESSING") && (
              <Button
                size="sm"
                variant="outline"
                className="w-full sm:w-auto border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400 font-semibold text-xs gap-1"
                onClick={() => setReopenModalOpen(true)}
              >
                <RotateCcw className="size-3.5 shrink-0" /> Cancel Match & Re-Open Search
              </Button>
            )}

            {isOwner && req.status === "OPEN" && (
              <Link to="/recipient" search={{ tab: "requests" }} className="w-full sm:w-auto">
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  Manage in Recipient Portal
                </Button>
              </Link>
            )}

            {isCompleted && (
              <Badge className="bg-purple-600 text-white p-2 px-3 text-xs font-semibold">
                Donation Fulfilled & Completed
              </Badge>
            )}
          </CardFooter>
        </Card>

        {/* Safety Guidelines for Donors */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-red-600" /> Quick Donor Readiness Checklist
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
            <div className="rounded-lg bg-muted/40 p-3">
              <strong className="text-foreground block mb-1">1. Health & Rest</strong>
              Ensure you have had at least 6 hours of sleep and drank plenty of fluids before traveling.
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <strong className="text-foreground block mb-1">2. Valid Identification</strong>
              Bring a valid photo ID (NID, Student ID, or Passport) to the hospital blood bank.
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <strong className="text-foreground block mb-1">3. Direct Coordination</strong>
              Call the patient attendant to confirm the exact ward/room and arrival time.
            </div>
          </div>
        </div>
      </div>

      {/* 1. Login/Register Prompt Modal (for unauthenticated visitors) */}
      <Dialog open={authPromptOpen} onOpenChange={setAuthPromptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HeartHandshake className="size-5 text-red-600" />
              <span>Sign In to Accept & Share Contact</span>
            </DialogTitle>
            <DialogDescription>
              To protect donor and patient privacy, volunteer donors must be authenticated so their verified contact details can be shared with the attendant.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 text-xs text-muted-foreground space-y-2">
            <p>
              Signing in takes under a minute and allows you to unlock direct attendant phone coordination, track donation history, and receive digital badges.
            </p>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAuthPromptOpen(false);
                navigate({ to: "/register" });
              }}
            >
              Create Account
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                setAuthPromptOpen(false);
                navigate({
                  to: "/login",
                  search: { redirect: `/request/${requestId}` },
                });
              }}
            >
              Log In to Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Acceptance Confirmation Modal */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HeartHandshake className="size-5 text-red-600" />
              <span>Confirm Your Commitment</span>
            </DialogTitle>
            <DialogDescription>
              Are you ready to commit to donating blood for this patient?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 text-xs">
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 space-y-1 text-foreground">
              <div className="font-bold flex items-center gap-1.5 text-red-600">
                <AlertCircle className="size-4" /> Patient Needs Your Immediate Help
              </div>
              <p className="text-muted-foreground">
                Hospital: <strong>{req.hospital_name || req.required_location}</strong>
                <br />
                Blood Group: <strong>{formatBloodGroup(req.blood_group, "symbol")}</strong> · {req.quantity} Unit(s)
              </p>
            </div>

            <p className="text-muted-foreground">
              By confirming, your name (<strong>{currentUser?.full_name}</strong>) and phone (
              <strong>{currentUser?.phone}</strong>) will be shared directly with the patient&apos;s attendant, and the attendant&apos;s unmasked phone number will be revealed to you.
            </p>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setConfirmModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
              onClick={handleConfirmAccept}
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? "Confirming..." : "Yes, I Want to Donate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Acceptance Success Modal */}
      <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="size-6" />
              <span>Thank You for Stepping Forward!</span>
            </DialogTitle>
            <DialogDescription>
              You have successfully accepted this blood request. Direct contact details are now unlocked.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 text-xs">
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-center space-y-2">
              <span className="text-xs font-semibold text-muted-foreground">Attendant Phone Number</span>
              <p className="text-xl font-mono font-black text-emerald-700 dark:text-emerald-300 tracking-wider">
                {req.attendant_phone_number}
              </p>
              {req.attendant_phone_number && (
                <a href={`tel:${req.attendant_phone_number}`} className="inline-block mt-2">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                    <PhoneCall className="size-4 mr-1.5" /> Call Attendant Now
                  </Button>
                </a>
              )}
            </div>

            <p className="text-muted-foreground text-center">
              An alert email has also been dispatched to the recipient with your contact details so they know you are on your way.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setSuccessModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Phase 8: Cancel Commitment / Match Dialog */}
      <Dialog open={reopenModalOpen} onOpenChange={setReopenModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <RotateCcw className="size-5 text-amber-600" />
              <span>{isAcceptedByMe ? "Cancel Donation Commitment" : "Cancel Match & Re-Open Search"}</span>
            </DialogTitle>
            <DialogDescription>
              {isAcceptedByMe
                ? "If you are unable to donate at this time, releasing the commitment allows another donor to step forward immediately."
                : "Release the current donor match and restart automated search for alternative donors."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-3 space-y-1.5 text-amber-900 dark:text-amber-200">
              <p className="font-semibold text-sm">Key assurances:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Request returns to <strong>OPEN</strong> status immediately.</li>
                <li>The Intelligent Matching Engine resumes searching for nearby available donors.</li>
                <li><strong>No cooldown penalty:</strong> The donor remains fully eligible without any penalty.</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cancel-reason" className="text-xs font-semibold">
                Reason for cancellation (optional):
              </Label>
              <Input
                id="cancel-reason"
                placeholder="e.g., Unable to travel, emergency schedule change, etc."
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" onClick={() => setReopenModalOpen(false)}>
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
                setReopenModalOpen(false);
                setReopenReason("");
              }}
            >
              {reopenMutation.isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Confirm Cancellation & Re-Open
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

