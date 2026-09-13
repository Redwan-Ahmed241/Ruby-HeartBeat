import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/hospital/transactions")({
  beforeLoad: () => {
    throw redirect({
      to: "/hospital",
      search: { tab: "transactions" },
    });
  },
});
