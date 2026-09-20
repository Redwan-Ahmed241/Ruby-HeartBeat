/**
 * TanStack Query hooks for Blood Requests and Matches.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requestService } from "@/lib/api/services";
import type { BloodRequestCreate, MatchRespondRequest, DonorContactReveal } from "@/lib/api/types";
import { toast } from "sonner";

export const REQUEST_KEYS = {
  all: ["requests"] as const,
  list: (filters?: Record<string, string | undefined>) => ["requests", "list", filters] as const,
  detail: (id: string) => ["requests", "detail", id] as const,
  matches: (id: string) => ["requests", "matches", id] as const,
};

export function useBloodRequests(filters?: {
  blood_group?: string;
  urgency?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: REQUEST_KEYS.list(filters),
    queryFn: () => requestService.listRequests(filters),
  });
}

export function useBloodRequest(requestId: string, enabled = true) {
  return useQuery({
    queryKey: REQUEST_KEYS.detail(requestId),
    queryFn: () => requestService.getRequest(requestId),
    enabled: !!requestId && enabled,
  });
}

export function useCreateBloodRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BloodRequestCreate) => requestService.createRequest(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: REQUEST_KEYS.all });
      const matchCount = data.matches?.length || 0;
      toast.success(
        `Blood request created! Matching engine identified ${matchCount} eligible nearby donor(s).`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create blood request.");
    },
  });
}

export function useCreateEmergencyRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BloodRequestCreate) => requestService.createEmergencyRequest(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: REQUEST_KEYS.all });
      const matchCount = data.matches?.length || 0;
      toast.error(
        `EMERGENCY broadcast dispatched across 50km! ${matchCount} compatible donor(s) notified.`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to dispatch emergency request.");
    },
  });
}

export function useRespondToMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ matchId, payload }: { matchId: string; payload: MatchRespondRequest }) =>
      requestService.respondToMatch(matchId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: REQUEST_KEYS.all });
      toast.success(`Match response updated to ${data.response_status}.`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to submit response.");
    },
  });
}

export function useRevealDonorContact() {
  return useMutation<DonorContactReveal, Error, string>({
    mutationFn: (matchId: string) => requestService.revealDonorContact(matchId),
    onError: (error: Error) => {
      // Honors backend Contact Reveal Safeguard error message (403)
      toast.error(error.message);
    },
  });
}

export function useAcceptRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => requestService.acceptRequest(requestId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: REQUEST_KEYS.all });
      queryClient.invalidateQueries({ queryKey: REQUEST_KEYS.detail(data.request_id) });
      toast.success("Request accepted! Attendant contact details are now unmasked.");
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.detail?.message || error?.message || "Failed to accept blood request.";
      toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
    },
  });
}

export function useUpdateRequestStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      payload,
    }: {
      requestId: string;
      payload: { status: string; accepted_donor_id?: string };
    }) => requestService.updateRequestStatus(requestId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: REQUEST_KEYS.all });
      queryClient.invalidateQueries({ queryKey: REQUEST_KEYS.detail(data.request_id) });
      toast.success(`Request status updated to ${data.status}.`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update request status.");
    },
  });
}

