import { useState } from "react";
import {
  Heart,
  PackageCheck,
  Ban,
  ClipboardList,
  Loader2,
  Calendar,
  Building2,
  MapPin,
  Clock,
  User,
  Phone,
  Droplet,
  ExternalLink,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/useAuth";
import { useDonorHistory } from "@/hooks/useDonor";
import { useMyRequests, useBloodRequests } from "@/hooks/useRequests";
import { formatDateTime, formatExactWithRelative } from "@/lib/dateUtils";
import { toDisplayBloodGroup } from "@/lib/api/types";
import type { BloodGroup, BloodRequestResponse } from "@/lib/api/types";

export type LedgerTab = "donated" | "received" | "cancelled" | "all_requests";

interface ActivityLedgerProps {
  defaultTab?: LedgerTab;
  compact?: boolean;
}

export function ActivityLedger({ defaultTab = "donated", compact = false }: ActivityLedgerProps) {
  const [activeTab, setActiveTab] = useState<LedgerTab>(defaultTab);
  const { data: user } = useCurrentUser();
  const { data: historyItems, isLoading: historyLoading } = useDonorHistory(!!user);
  const { data: myRequests, isLoading: myRequestsLoading } = useMyRequests(!!user);
  const { data: allRequests, isLoading: allRequestsLoading } = useBloodRequests();

  const userBloodGroup = user?.donor?.blood_group || "O_POSITIVE";
  const donorId = user?.donor?.donor_id || user?.user_id;

  // 1. Blood Donated (Given)
  // Combines donation history items from API
  const donatedList = historyItems || [];

  // 2. Blood Received (Fulfilled requests where user was recipient)
  const receivedList = (myRequests || []).filter(
    (req) => req.status === "COMPLETED"
  );

  // 3. Cancelled Requests & Dispatches:
  // A: Requests submitted by user that were cancelled
  // B: Match commitments as a donor or recipient that were cancelled / declined
  const cancelledMyRequests = (myRequests || []).filter(
    (req) => req.status === "CANCELLED"
  );

  // Match dispatches where this user was donor and match was declined or request cancelled
  const cancelledDonorDispatches: {
    request: BloodRequestResponse;
    reason: string;
    initiator: string;
    cancelledAt?: string | null;
  }[] = [];

  if (allRequests && donorId) {
    for (const req of allRequests) {
      if (req.matches && req.matches.length > 0) {
        for (const m of req.matches) {
          if (m.donor_id === donorId && (m.response_status === "DECLINED" || req.status === "CANCELLED")) {
            cancelledDonorDispatches.push({
              request: req,
              reason: m.response_status === "DECLINED"
                ? "Declined by Donor"
                : req.notes || "Search cancelled by recipient",
              initiator: m.response_status === "DECLINED" ? "Donor" : "Recipient",
              cancelledAt: req.request_date || null,
            });
          }
        }
      }
    }
  }

  // 4. All Created Requests with statuses
  const allCreatedRequests = myRequests || [];

  const isLoading = historyLoading || myRequestsLoading || allRequestsLoading;

  return (
    <Card className="border-border shadow-xs overflow-hidden">
      <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ClipboardList className="size-5 text-primary" />
              Unified Activity & Donation Ledger
            </CardTitle>
            <CardDescription className="text-xs">
              Complete, verified audit trail of all blood donations, fulfilled requests, and dispatches.
            </CardDescription>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-lg border border-border/50 overflow-x-auto">
            <button
              onClick={() => setActiveTab("donated")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "donated"
                  ? "bg-background text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Heart className="size-3.5 text-red-500" />
              <span>Blood Donated</span>
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                {donatedList.length}
              </Badge>
            </button>

            <button
              onClick={() => setActiveTab("received")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "received"
                  ? "bg-background text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <PackageCheck className="size-3.5 text-emerald-600" />
              <span>Blood Received</span>
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                {receivedList.length}
              </Badge>
            </button>

            <button
              onClick={() => setActiveTab("cancelled")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "cancelled"
                  ? "bg-background text-destructive shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Ban className="size-3.5 text-destructive" />
              <span>Cancelled</span>
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                {cancelledMyRequests.length + cancelledDonorDispatches.length}
              </Badge>
            </button>

            <button
              onClick={() => setActiveTab("all_requests")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "all_requests"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ClipboardList className="size-3.5 text-blue-500" />
              <span>All Requests</span>
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                {allCreatedRequests.length}
              </Badge>
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary mb-2" />
            <p className="text-xs">Loading ledger records...</p>
          </div>
        ) : (
          <div>
            {/* ========================================================================= */}
            {/* SUB-VIEW 1: BLOOD DONATED (GIVEN)                                        */}
            {/* ========================================================================= */}
            {activeTab === "donated" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Verified donations where you gave blood to save a life</span>
                  <span className="font-semibold text-foreground">{donatedList.length} Record(s)</span>
                </div>

                {donatedList.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center">
                    <Heart className="size-8 text-red-500/40 mx-auto mb-2" />
                    <h4 className="text-sm font-semibold text-foreground">No Completed Blood Donations Yet</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      When you accept an incoming blood match and complete the donation at a verified hospital, your official record will be immutably recorded here.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
                    {donatedList.map((item) => {
                      const displayDate = item.completed_at || item.donation_date || item.created_at;
                      const units = item.units_donated ?? item.quantity ?? 1;
                      const facility = item.facility_name || item.center_name || "Verified LifeDrop Center";
                      return (
                        <div
                          key={item.history_id}
                          className="rounded-xl border border-border/70 bg-card hover:bg-muted/10 p-4 transition-all space-y-3 shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="rounded-md bg-red-600 px-2 py-0.5 text-xs font-black text-white">
                                {toDisplayBloodGroup(userBloodGroup as BloodGroup)}
                              </span>
                              <div>
                                <h4 className="text-sm font-bold text-foreground">
                                  {units} Unit ({units * 450} mL) Donated
                                </h4>
                                <span className="text-[11px] text-muted-foreground">
                                  {(item.component_type || "WHOLE_BLOOD").replace("_", " ")}
                                </span>
                              </div>
                            </div>
                            <Badge className="bg-emerald-600 text-white text-[10px] font-semibold">
                              COMPLETED
                            </Badge>
                          </div>

                          <div className="space-y-1 text-xs text-muted-foreground">
                            <p className="flex items-center gap-1.5 font-medium text-foreground">
                              <Building2 className="size-3.5 text-primary shrink-0" />
                              <span className="truncate">{facility}</span>
                            </p>
                            <p className="flex items-center gap-1.5">
                              <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                              <span>Donated On: <strong>{formatDateTime(displayDate)}</strong></span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* SUB-VIEW 2: BLOOD RECEIVED (FULFILLED REQUESTS)                          */}
            {/* ========================================================================= */}
            {activeTab === "received" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Requests created by you that were successfully fulfilled by donors</span>
                  <span className="font-semibold text-foreground">{receivedList.length} Record(s)</span>
                </div>

                {receivedList.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center">
                    <PackageCheck className="size-8 text-emerald-600/40 mx-auto mb-2" />
                    <h4 className="text-sm font-semibold text-foreground">No Fulfilled Blood Requests Yet</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      When a patient request you created receives blood from a verified donor and completion is confirmed, it will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
                    {receivedList.map((req) => {
                      // Find accepted / completed match
                      const completedMatch = (req.matches || []).find(
                        (m) => m.response_status === "ACCEPTED" || m.completed_at
                      );
                      const donorName = req.accepted_donor?.full_name || completedMatch?.donor_name_initial
                        ? `Donor (${completedMatch?.donor_name_initial || "Verified"})`
                        : "Verified Donor";
                      const donorPhone = req.accepted_donor?.phone
                        ? req.accepted_donor.phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")
                        : "Contact Protected";
                      const completionDate = completedMatch?.completed_at || req.request_date;

                      return (
                        <div
                          key={req.request_id}
                          className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3 shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-black text-primary-foreground">
                                {toDisplayBloodGroup(req.blood_group)}
                              </span>
                              <div>
                                <h4 className="text-sm font-bold text-foreground">
                                  {req.quantity} Unit(s) ({req.volume_ml || req.quantity * 450} mL) Received
                                </h4>
                                <span className="text-[11px] text-muted-foreground">
                                  {req.component_type.replace("_", " ")}
                                </span>
                              </div>
                            </div>
                            <Badge className="bg-purple-600 text-white text-[10px] font-semibold">
                              FULFILLED
                            </Badge>
                          </div>

                          <div className="space-y-1.5 text-xs text-muted-foreground">
                            <p className="flex items-center gap-1.5 font-medium text-foreground">
                              <Building2 className="size-3.5 text-primary shrink-0" />
                              <span>{req.hospital_name || req.required_location}</span>
                            </p>
                            <div className="flex items-center justify-between text-[11px] bg-background/60 p-2 rounded-md border border-border/40">
                              <div className="flex items-center gap-1.5">
                                <User className="size-3 text-emerald-600" />
                                <span className="font-semibold text-foreground">{donorName}</span>
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground font-mono">
                                <Phone className="size-3 text-muted-foreground" />
                                <span>{donorPhone}</span>
                              </div>
                            </div>
                            <p className="flex items-center gap-1.5 text-[11px]">
                              <Clock className="size-3 text-muted-foreground shrink-0" />
                              <span>Fulfilled On: <strong>{formatDateTime(completionDate)}</strong></span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* SUB-VIEW 3: CANCELLED REQUESTS & DISPATCHES                              */}
            {/* ========================================================================= */}
            {activeTab === "cancelled" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Cancelled requests and released match dispatches</span>
                  <span className="font-semibold text-foreground">
                    {cancelledMyRequests.length + cancelledDonorDispatches.length} Record(s)
                  </span>
                </div>

                {cancelledMyRequests.length === 0 && cancelledDonorDispatches.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center">
                    <Ban className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                    <h4 className="text-sm font-semibold text-foreground">No Cancelled Records</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      No cancellations found in your history. All blood requests and match dispatches have proceeded smoothly.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Recipient Cancelled Searches */}
                    {cancelledMyRequests.map((req) => (
                      <div
                        key={req.request_id}
                        className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-bold text-foreground">
                              {toDisplayBloodGroup(req.blood_group)}
                            </span>
                            <span className="font-semibold text-foreground">
                              {req.hospital_name || req.required_location}
                            </span>
                            <Badge variant="destructive" className="text-[10px]">
                              CANCELLED
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">
                            Reason: <em>{req.notes || "Search cancelled by recipient (fulfilled externally or no longer required)."}</em>
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Initiator: <strong>Recipient (You)</strong> • Date: {formatExactWithRelative(req.request_date)}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Donor Declined Dispatches */}
                    {cancelledDonorDispatches.map((item, idx) => (
                      <div
                        key={`dispatch-${idx}`}
                        className="rounded-xl border border-border/80 bg-muted/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-bold text-foreground">
                              {toDisplayBloodGroup(item.request.blood_group)}
                            </span>
                            <span className="font-semibold text-foreground">
                              {item.request.hospital_name || item.request.required_location}
                            </span>
                            <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
                              RELEASED
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">
                            Details: <em>{item.reason}</em>
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Initiator: <strong>{item.initiator}</strong> • Date: {formatExactWithRelative(item.cancelledAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* SUB-VIEW 4: OPEN & COMPLETED REQUESTS (HISTORICAL LOG)                    */}
            {/* ========================================================================= */}
            {activeTab === "all_requests" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Complete historical log of all patient blood requests submitted by you</span>
                  <span className="font-semibold text-foreground">{allCreatedRequests.length} Total</span>
                </div>

                {allCreatedRequests.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center">
                    <ClipboardList className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                    <h4 className="text-sm font-semibold text-foreground">No Blood Requests Submitted Yet</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto mb-4">
                      Whenever you create a blood request for yourself or a patient, the complete audit log will be accessible here.
                    </p>
                    <Link to="/request-blood">
                      <Button size="sm" className="text-xs">
                        Create Request Now
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {allCreatedRequests.map((req) => {
                      const statusVariant =
                        req.status === "COMPLETED"
                          ? "default"
                          : req.status === "CANCELLED"
                          ? "destructive"
                          : req.status === "OPEN"
                          ? "secondary"
                          : "outline";

                      return (
                        <div
                          key={req.request_id}
                          className="rounded-xl border border-border/80 bg-card p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs hover:border-primary/40 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="rounded bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                                {toDisplayBloodGroup(req.blood_group)}
                              </span>
                              <span className="font-semibold text-foreground">
                                {req.quantity} Unit(s) ({req.component_type.replace("_", " ")})
                              </span>
                              {req.patient_name && (
                                <span className="text-muted-foreground">for {req.patient_name}</span>
                              )}
                              <Badge variant={statusVariant} className="text-[10px]">
                                {req.status === "COMPLETED" ? "FULFILLED" : req.status}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <MapPin className="size-3 text-primary shrink-0" />
                              <span>{req.hospital_name || req.required_location}</span>
                              {req.area_zone && <span>• {req.area_zone}</span>}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Posted: <strong>{formatExactWithRelative(req.request_date)}</strong>
                            </p>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            <Link
                              to="/request/$requestId"
                              params={{ requestId: req.request_id }}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                              <span>View Details</span>
                              <ExternalLink className="size-3" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
