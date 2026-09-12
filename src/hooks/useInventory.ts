/**
 * TanStack Query hooks for Blood Inventory, stock transactions, and expiry sweeps.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inventoryService } from "@/lib/api/services";
import type { InventoryTransactionCreate } from "@/lib/api/types";
import { toast } from "sonner";

export const INVENTORY_KEYS = {
  all: ["inventory"] as const,
  list: (filters?: Record<string, string | undefined>) =>
    ["inventory", "list", filters] as const,
};

export function useBloodInventory(filters?: {
  hospital_id?: string;
  blood_group?: string;
  component_type?: string;
}) {
  return useQuery({
    queryKey: INVENTORY_KEYS.list(filters),
    queryFn: () => inventoryService.getInventory(filters),
  });
}

export function useRecordInventoryTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: InventoryTransactionCreate) =>
      inventoryService.recordTransaction(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
      toast.success(
        `Stock ${data.type} transaction recorded: ${data.quantity} units updated.`
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to record stock transaction.");
    },
  });
}

export function useTriggerExpiryScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => inventoryService.triggerExpiryScan(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
      if (data.expiring_soon_count > 0) {
        toast.warning(
          `Expiry Sweep Alert: ${data.expiring_soon_count} of ${data.scanned_count} units expiring within 72 hours.`
        );
      } else {
        toast.success(
          `Expiry Sweep Complete: All ${data.scanned_count} units are within safe validity periods.`
        );
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to trigger expiry scan.");
    },
  });
}
