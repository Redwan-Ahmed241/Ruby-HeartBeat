import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/notices")({
  beforeLoad: () => {
    throw redirect({
      to: "/events",
    });
  },
});
