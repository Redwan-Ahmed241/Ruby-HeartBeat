import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthDialog } from "@/components/AuthDialog";
import { useCurrentUser } from "@/hooks/useAuth";
import { Droplet } from "lucide-react";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: (search["redirect"] as string) || "/",
  }),
  head: () => ({
    meta: [
      { title: "Sign In — LifeDrop" },
      {
        name: "description",
        content: "Sign in to access your role-based blood management dashboard.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = useSearch({ from: "/login" });
  const { data: user } = useCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (redirect && redirect !== "/") {
        navigate({ to: redirect });
      } else {
        const dest =
          user.role === "DONOR" ? "/donor"
          : user.role === "RECIPIENT" ? "/recipient"
          : user.role === "SYSTEM_ADMIN" ? "/admin"
          : "/";
        navigate({ to: dest });
      }
    }
  }, [user, redirect, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-16">
        <div className="mb-6 flex items-center gap-2 font-bold text-2xl text-primary">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Droplet className="size-6 fill-current" />
          </div>
          <span>LifeDrop Access Portal</span>
        </div>

        <Card className="w-full shadow-[var(--shadow-elegant)]">
          <CardHeader className="text-center">
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>
              Sign in to your LifeDrop account to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-4">
            <AuthDialog defaultTab="login" />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
