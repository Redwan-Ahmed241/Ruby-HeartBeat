import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/requests/new")({
  beforeLoad: () => {
    throw redirect({
      to: "/request-blood",
    });
  },
});
