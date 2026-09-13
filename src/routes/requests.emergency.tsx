import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/requests/emergency")({
  beforeLoad: () => {
    throw redirect({
      to: "/request-blood",
    });
  },
});
