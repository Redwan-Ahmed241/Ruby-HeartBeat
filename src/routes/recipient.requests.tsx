import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/recipient/requests")({
  beforeLoad: () => {
    throw redirect({
      to: "/dashboard",
      search: { tab: "request" },
    });
  },
});
