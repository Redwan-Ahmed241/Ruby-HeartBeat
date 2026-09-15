/**
 * TanStack Query hooks for Appointments, Events, and Campaign Notices mutations.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { appointmentService, eventService, noticeService } from "@/lib/api/services";
import type {
  AppointmentCreate,
  AppointmentStatusUpdate,
  CampaignNoticeCreate,
  EventParticipantCreate,
} from "@/lib/api/types";
import { toast } from "sonner";
import { ADMIN_KEYS } from "./useAdmin";

// ============================================================================
// APPOINTMENT HOOKS
// ============================================================================

export const APPOINTMENT_KEYS = {
  myAppointments: ["appointments", "mine"] as const,
};

export function useMyAppointments(enabled = true) {
  return useQuery({
    queryKey: APPOINTMENT_KEYS.myAppointments,
    queryFn: () => appointmentService.getMyAppointments(),
    enabled,
  });
}

export function useBookAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AppointmentCreate) => appointmentService.bookAppointment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPOINTMENT_KEYS.myAppointments });
      toast.success("Appointment booked successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to book appointment.");
    },
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      appointmentId,
      payload,
    }: {
      appointmentId: string;
      payload: AppointmentStatusUpdate;
    }) => appointmentService.updateStatus(appointmentId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: APPOINTMENT_KEYS.myAppointments });
      toast.success(`Appointment status updated to ${data.status}.`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update appointment status.");
    },
  });
}

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
      queryClient.invalidateQueries({ queryKey: APPOINTMENT_KEYS.myAppointments });
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
