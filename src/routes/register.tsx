import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "@/components/AuthDialog";
import { useCurrentUser } from "@/hooks/useAuth";
import type { UserRole } from "@/lib/api/types";
import { HeartPulse } from "lucide-react";

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>): { role: "DONOR" | "RECIPIENT" } => ({
    role: (search["role"] as string) === "RECIPIENT" ? "RECIPIENT" : "DONOR",
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
      else if (user.role === "SYSTEM_ADMIN") navigate({ to: "/admin" });
      else navigate({ to: "/" });
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-background flex flex-col">
      <SiteNav />
      <main className="w-full max-w-7xl 2xl:max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col items-center justify-center">
        <div className="mb-6 flex items-center gap-2 font-bold text-2xl text-primary">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <HeartPulse className="size-6" />
          </div>
          <span>Create an Account</span>
        </div>

        <Card className="w-full max-w-md shadow-[var(--shadow-elegant)] border border-border/80">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold">Join LifeDrop</CardTitle>
            <CardDescription>
              Register as a <strong className="text-primary">{role === "DONOR" ? "Blood Donor" : "Recipient / Patient Family"}</strong> to join the blood management network
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-4">
            <AuthDialog
              defaultTab="register"
              defaultRole={role}
              trigger={
                <Button className="w-full py-2.5 text-sm font-bold bg-[#800000] text-white hover:bg-[#600000] rounded-xl shadow-sm transition-all duration-200">
                  Open Registration Form
                </Button>
              }
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
