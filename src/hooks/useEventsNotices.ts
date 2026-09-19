/**
 * TanStack Query hooks for Events and Campaign Notices mutations.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eventService, noticeService } from "@/lib/api/services";
import type {
  CampaignNoticeCreate,
  EventParticipantCreate,
} from "@/lib/api/types";
import { toast } from "sonner";
import { ADMIN_KEYS } from "./useAdmin";

// ============================================================================
// EVENT REGISTRATION HOOK
// ============================================================================

export function useRegisterForEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      payload,
    }: {
      eventId: string;
      payload: EventParticipantCreate;
    }) => eventService.registerForEvent(eventId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.events });
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.myRegistrations });
      toast.success("Successfully registered for the event!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to register for event.");
    },
  });
}

// ============================================================================
// CAMPAIGN NOTICE CREATION HOOK
// ============================================================================

export function useCreateCampaignNotice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CampaignNoticeCreate) => noticeService.createNotice(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.notices });
      toast.success("Campaign notice published successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to publish notice.");
    },
  });
}
