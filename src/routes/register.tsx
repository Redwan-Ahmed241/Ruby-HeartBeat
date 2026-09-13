import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthDialog } from "@/components/AuthDialog";
import { useCurrentUser } from "@/hooks/useAuth";
import type { UserRole } from "@/lib/api/types";
import { HeartPulse } from "lucide-react";

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>) => ({
    role: (search.role as UserRole) || "DONOR",
  }),
  head: () => ({
    meta: [
      { title: "Register — LifeDrop Blood Management" },
      { name: "description", content: "Join the LifeDrop network as a blood donor or recipient." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { role } = useSearch({ from: "/register" });
  const { data: user } = useCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === "DONOR") navigate({ to: "/donor" });
      else if (user.role === "RECIPIENT") navigate({ to: "/recipient" });
      else if (user.role === "HOSPITAL_ADMIN") navigate({ to: "/hospital" });
      else if (user.role === "SYSTEM_ADMIN") navigate({ to: "/admin" });
      else navigate({ to: "/" });
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-16">
        <div className="mb-6 flex items-center gap-2 font-bold text-2xl text-primary">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <HeartPulse className="size-6" />
          </div>
          <span>Create an Account</span>
        </div>

        <Card className="w-full shadow-[var(--shadow-elegant)]">
          <CardHeader className="text-center">
            <CardTitle>Join LifeDrop</CardTitle>
            <CardDescription>
              Register as a <strong>{role}</strong> to join the blood management network
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-4">
            <AuthDialog defaultTab="register" defaultRole={role} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
