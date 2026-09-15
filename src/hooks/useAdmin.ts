/**
 * TanStack Query hooks for Admin operations: system logs, campaign notices, events, and user management.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { auditService, noticeService, eventService, userService } from "@/lib/api/services";
import { toast } from "sonner";

export const ADMIN_KEYS = {
  logs: (limit: number, offset: number) => ["admin", "logs", limit, offset] as const,
  notices: ["admin", "notices"] as const,
  events: ["admin", "events"] as const,
  users: ["admin", "users"] as const,
  myRegistrations: ["events", "my-registrations"] as const,
};

export function useSystemLogs(limit = 50, offset = 0, enabled = true) {
  return useQuery({
    queryKey: ADMIN_KEYS.logs(limit, offset),
    queryFn: () => auditService.getLogs(limit, offset),
    enabled,
  });
}

export function useCampaignNotices() {
  return useQuery({
    queryKey: ADMIN_KEYS.notices,
    queryFn: () => noticeService.getNotices(),
  });
}

export function useDonationEvents() {
  return useQuery({
    queryKey: ADMIN_KEYS.events,
    queryFn: () => eventService.listEvents(),
  });
}

export function useAllUsers(filters?: { role?: string; search?: string }, enabled = true) {
  return useQuery({
    queryKey: [...ADMIN_KEYS.users, filters],
    queryFn: () => userService.listUsers(filters),
    enabled,
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: "ACTIVE" | "BLOCKED" }) =>
      userService.updateStatus(userId, { status }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.users });
      toast.success(`User status updated to ${data.status}.`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update user status.");
    },
  });
}

export function useMyRegisteredEvents(enabled = true) {
  return useQuery({
    queryKey: ADMIN_KEYS.myRegistrations,
    queryFn: () => eventService.getMyRegistrations(),
    enabled,
  });
}
