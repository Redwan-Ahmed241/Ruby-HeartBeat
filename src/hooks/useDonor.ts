/**
 * TanStack Query hooks for Donor profiles, eligibility, and history.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { donorService } from "@/lib/api/services";
import type {
  DonorProfileUpdate,
  AvailabilityUpdate,
  MedicalInfoUpsert,
  DonationHistoryCreate,
} from "@/lib/api/types";
import { toast } from "sonner";
import { AUTH_KEYS } from "./useAuth";

export const DONOR_KEYS = {
  profile: ["donor", "profile"] as const,
  eligibility: ["donor", "eligibility"] as const,
  history: ["donor", "history"] as const,
  top: (limit: number) => ["donor", "top", limit] as const,
};

export function useDonorProfile(enabled = true) {
  return useQuery({
    queryKey: DONOR_KEYS.profile,
    queryFn: () => donorService.getProfile(),
    enabled,
  });
}

export function useTopDonors(limit: number = 10, enabled = true) {
  return useQuery({
    queryKey: DONOR_KEYS.top(limit),
    queryFn: () => donorService.getTopDonors(limit),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useDonorEligibility(enabled = true) {
  return useQuery({
    queryKey: DONOR_KEYS.eligibility,
    queryFn: () => donorService.getEligibility(),
    enabled,
  });
}

export function useDonorHistory(enabled = true) {
  return useQuery({
    queryKey: DONOR_KEYS.history,
    queryFn: () => donorService.getHistory(),
    enabled,
  });
}

export function useUpdateDonorProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DonorProfileUpdate) => donorService.updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.me });
      queryClient.invalidateQueries({ queryKey: DONOR_KEYS.eligibility });
      toast.success("Profile updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update profile.");
    },
  });
}

export function useToggleAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AvailabilityUpdate) => donorService.toggleAvailability(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.me });
      toast.success(
        `Availability status set to ${data.availability_status === "AVAILABLE" ? "Available" : "Unavailable"}.`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to toggle availability.");
    },
  });
}

export function useUpsertMedicalInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: MedicalInfoUpsert) => donorService.upsertMedicalInfo(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.me });
      queryClient.invalidateQueries({ queryKey: DONOR_KEYS.eligibility });
      toast.success("Medical info updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update medical details.");
    },
  });
}

export function useRecordDonationHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DonationHistoryCreate) => donorService.recordHistory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DONOR_KEYS.history });
      queryClient.invalidateQueries({ queryKey: DONOR_KEYS.eligibility });
      toast.success("Donation record saved!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save donation record.");
    },
  });
}
