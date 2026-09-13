import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/donor/appointments")({
  beforeLoad: () => {
    throw redirect({
      to: "/donor",
      search: { tab: "appointments" },
    });
  },
});
