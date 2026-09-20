import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/donor/history")({
  beforeLoad: () => {
    throw redirect({
      to: "/dashboard",
      search: { tab: "donate" },
    });
  },
});
