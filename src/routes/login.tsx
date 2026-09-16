import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    <div className="min-h-screen w-full bg-slate-50 dark:bg-background flex flex-col">
      <SiteNav />
      <main className="w-full max-w-7xl 2xl:max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col items-center justify-center">
        <div className="mb-6 flex items-center gap-2 font-bold text-2xl text-primary">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Droplet className="size-6 fill-current" />
          </div>
          <span>LifeDrop Access Portal</span>
        </div>

        <Card className="w-full max-w-md shadow-[var(--shadow-elegant)] border border-border/80">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to your LifeDrop account to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-4">
            <AuthDialog
              defaultTab="login"
              trigger={
                <Button className="w-full py-2.5 text-sm font-bold bg-[#800000] text-white hover:bg-[#600000] rounded-xl shadow-sm transition-all duration-200">
                  Open Sign In Dialog
                </Button>
              }
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
