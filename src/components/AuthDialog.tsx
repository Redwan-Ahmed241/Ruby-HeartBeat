/**
 * Authentic Authentication Dialog for LifeDrop:
 * 1. Clean Sign In form with Email & Password
 * 2. Clean Registration form with Name, Email, Phone, Password, and Role selection
 * 3. Discreet Evaluator Demo Credentials accordion with real JWT credential auto-fill
 */

import { useState } from "react";
import {
  User,
  LogIn,
  LogOut,
  ShieldCheck,
  UserCheck,
  Building2,
  Lock,
  ChevronDown,
  LayoutDashboard,
  Eye,
  EyeOff,
} from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useCurrentUser, useLogin, useLogout, useRegister } from "@/hooks/useAuth";
import { authService } from "@/lib/api/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserRole } from "@/lib/api/types";
import { toast } from "sonner";

// Pre-seeded production-grade evaluation credentials
const DEMO_CREDENTIALS: Array<{
  role: UserRole;
  label: string;
  email: string;
  pass: string;
  icon: typeof User;
  description: string;
}> = [
    {
      role: "DONOR",
      label: "Blood Donor",
      email: "donor.demo@lifedrop.org",
      pass: "DemoPass123!",
      icon: UserCheck,
      description: "Verified O+ volunteer donor (Banani, Dhaka)",
    },
    {
      role: "RECIPIENT",
      label: "Recipient / Patient Family",
      email: "recipient.demo@lifedrop.org",
      pass: "DemoPass123!",
      icon: User,
      description: "Active emergency blood recipient",
    },
    {
      role: "SYSTEM_ADMIN",
      label: "System Admin",
      email: "admin.demo@lifedrop.org",
      pass: "DemoPass123!",
      icon: ShieldCheck,
      description: "Full platform auditor & system supervisor",
    },
  ];

export interface AuthDialogProps {
  trigger?: React.ReactNode;
  defaultTab?: "login" | "register";
  defaultRole?: UserRole;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AuthDialog({
  trigger,
  defaultTab = "login",
  defaultRole = "DONOR",
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: AuthDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen || setInternalOpen;

  const [activeTab, setActiveTab] = useState<"login" | "register">(defaultTab);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("+8801700000000");
  const [selectedRole, setSelectedRole] = useState<UserRole>(defaultRole);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const { data: currentUser, isLoading } = useCurrentUser();
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logout = useLogout();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginMutation.mutateAsync({ email, password });
      toast.success("Signed in successfully.");
      setOpen(false);
      const me = await authService.getMe();
      const dest =
        me.role === "DONOR" ? "/donor"
          : me.role === "RECIPIENT" ? "/recipient"
            : "/admin";
      navigate({ to: dest });
    } catch {
      // Error handled by mutation toast
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registerMutation.mutateAsync({
        full_name: fullName,
        email,
        phone,
        password,
        role: selectedRole,
        donor_profile:
          selectedRole === "DONOR"
            ? {
              blood_group: "O_PLUS",
              date_of_birth: "1998-05-20",
              gender: "Male",
              weight: 68.0,
              address: "Banani, Dhaka",
              latitude: 23.7937,
              longitude: 90.4066,
              hemoglobin_level: 14.0,
            }
            : null,
        recipient_profile:
          selectedRole === "RECIPIENT"
            ? {
              nid_passport_no: "NID-882716291",
              address: "Gulshan, Dhaka",
              relationship_to_patient: "Family",
              patient_name: "Patient Family Member",
            }
            : null,
        hospital_profile: null,
      });
      toast.success("Account created! You may now sign in.");
      setActiveTab("login");
    } catch {
      // Error handled by mutation toast
    }
  };

  const handleAutofill = (demoEmail: string, demoPass: string, label: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    toast.info(`Filled credentials for ${label}. Click 'Sign In' to authenticate.`);
  };

  if (isLoading) {
    return <div className="size-8 animate-pulse rounded-full bg-primary-glow/40" />;
  }

  // If already logged in, show user badge + dropdown menu
  if (currentUser) {
    const roleColors: Record<UserRole, string> = {
      DONOR: "bg-emerald-600 text-white",
      RECIPIENT: "bg-blue-600 text-white",
      HOSPITAL_ADMIN: "bg-amber-600 text-white",
      SYSTEM_ADMIN: "bg-purple-600 text-white",
    };

    const dashboardPath =
      currentUser.role === "DONOR"
        ? "/donor"
        : currentUser.role === "RECIPIENT"
          ? "/recipient"
          : currentUser.role === "HOSPITAL_ADMIN"
            ? "/hospital"
            : "/admin";

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 rounded-full border border-primary-glow/60 bg-primary-glow/30 px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition hover:bg-primary-glow/50"
            title="User Account Menu"
          >
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="max-w-[110px] truncate sm:max-w-none">{currentUser.full_name}</span>
            <Badge
              variant="outline"
              className={`ml-1 border-0 text-[10px] uppercase font-semibold ${roleColors[currentUser.role]}`}
            >
              {currentUser.role.replace("_", " ")}
            </Badge>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{currentUser.full_name}</p>
              <p className="text-xs leading-none text-muted-foreground">{currentUser.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link to={dashboardPath} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <LayoutDashboard className="size-4 text-primary" />
              <span>Go to My Dashboard</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
            <LogOut className="mr-2 size-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Logged out: Show Sign in button or custom trigger
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="border-primary-glow/60 bg-primary-glow/20 text-xs font-semibold text-primary-foreground hover:bg-primary-glow/40"
          >
            <LogIn className="mr-1.5 size-3.5" />
            Sign In
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Account Access</DialogTitle>
          <DialogDescription>
            Sign in to access your donor profile, hospital records, or emergency requests.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login" className="space-y-4 pt-2">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="login-email">Email Address</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showLoginPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowLoginPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showLoginPassword ? "Hide password" : "Show password"}
                  >
                    {showLoginPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Authenticating..." : "Sign In"}
              </Button>
            </form>

            {/* Subtle, Collapsible Accordion for Evaluator Demo Credentials */}
            <Accordion type="single" collapsible className="w-full border-t border-border/60 pt-1">
              <AccordionItem value="evaluator-creds" className="border-b-0">
                <AccordionTrigger className="py-2 text-xs text-muted-foreground hover:text-foreground font-medium">
                  <div className="flex items-center gap-1.5">
                    <Lock className="size-3 text-primary" />
                    <span>Demo Credentials (For Evaluators)</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-1 space-y-2">
                  <div className="rounded-lg border border-border/80 bg-muted/30 p-2.5 space-y-2 text-xs">
                    {DEMO_CREDENTIALS.map((cred) => {
                      const Icon = cred.icon;
                      return (
                        <div
                          key={cred.role}
                          className="flex items-center justify-between gap-2 border-b border-border/40 pb-1.5 last:border-b-0 last:pb-0"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground flex items-center gap-1 text-[11px]">
                              <Icon className="size-3 text-primary shrink-0" />
                              {cred.label}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">{cred.email}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] font-semibold text-primary hover:bg-primary/10"
                            onClick={() => handleAutofill(cred.email, cred.pass, cred.label)}
                          >
                            Auto-fill
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">
                    Auto-fill populates the fields. Click "Sign In" to issue an authentic signed JWT.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          {/* Register Tab */}
          <TabsContent value="register" className="pt-2">
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="reg-name">Full Name</Label>
                <Input
                  id="reg-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Ayesha Rahman"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="reg-email">Email Address</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="ayesha@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reg-phone">Phone Number</Label>
                  <Input
                    id="reg-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+8801700000000"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="reg-pass">Password</Label>
                  <div className="relative">
                    <Input
                      id="reg-pass"
                      type={showRegisterPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowRegisterPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                    >
                      {showRegisterPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reg-role">Register as</Label>
                  <Select
                    value={selectedRole}
                    onValueChange={(v) => setSelectedRole(v as UserRole)}
                  >
                    <SelectTrigger id="reg-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DONOR">Blood Donor</SelectItem>
                      <SelectItem value="RECIPIENT">Recipient / Patient Family</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" className="w-full mt-2" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
