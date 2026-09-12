/**
 * TanStack Query hooks for Admin operations: system logs, campaign notices, and events.
 */

import { useQuery } from "@tanstack/react-query";
import { auditService, noticeService, eventService } from "@/lib/api/services";

export const ADMIN_KEYS = {
  logs: (limit: number, offset: number) => ["admin", "logs", limit, offset] as const,
  notices: ["admin", "notices"] as const,
  events: ["admin", "events"] as const,
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
