import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/hospital/appointments")({
  beforeLoad: () => {
    throw redirect({
      to: "/hospital",
      search: { tab: "appointments" },
    });
  },
});
