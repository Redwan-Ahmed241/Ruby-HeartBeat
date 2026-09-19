import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/requests/new")({
  validateSearch: (search: Record<string, unknown>): { urgency?: "NORMAL" | "URGENT" | "EMERGENCY" | undefined } => ({
    urgency: (search["urgency"] as "NORMAL" | "URGENT" | "EMERGENCY") || undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/request-blood",
      search: search.urgency ? { urgency: search.urgency } : {},
    });
  },
});
