import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/hospital")({
  beforeLoad: () => {
    throw redirect({ to: "/centers" });
  },
  component: () => null,
});
