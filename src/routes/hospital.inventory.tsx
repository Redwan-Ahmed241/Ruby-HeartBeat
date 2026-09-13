import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/hospital/inventory")({
  beforeLoad: () => {
    throw redirect({
      to: "/hospital",
      search: { tab: "inventory" },
    });
  },
});
