/**
 * TanStack Query hook for Partner Blood Bank contact authorization.
 */

import { useMutation } from "@tanstack/react-query";
import { bloodBankService } from "@/lib/api/services";
import type { BloodBankContactRequest } from "@/lib/api/types";
import { toast } from "sonner";

export function useRequestBloodBankContact() {
  return useMutation({
    mutationFn: ({
      bankId,
      payload,
    }: {
      bankId: string;
      payload: BloodBankContactRequest;
    }) => bloodBankService.requestContactAccess(bankId, payload),
    onSuccess: (data) => {
      toast.success(
        data.message ||
          "Authorization request dispatched. The blood bank administration has been notified via email and portal alert.",
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to dispatch authorization request.");
    },
  });
}
