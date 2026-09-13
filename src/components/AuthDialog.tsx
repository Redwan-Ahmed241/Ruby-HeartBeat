/**
 * AuthDialog component providing:
 * 1. User login / signup modal matching LifeDrop design tokens
 * 2. Current active session badge
 * 3. REAL One-Click RBAC Role Switcher (creates or logs into real accounts with roles: DONOR, RECIPIENT, HOSPITAL_ADMIN, SYSTEM_ADMIN)
 */

import { useState } from "react";
import {
  User,
  LogIn,
  LogOut,
  ShieldCheck,
  UserCheck,
  Building2,
  UserCog,
  Loader2,
} from "lucide-react";
import { useCurrentUser, useLogin, useLogout, useRegister } from "@/hooks/useAuth";
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

// Real pre-configured test users per role
const RBAC_TEST_ACCOUNTS: Record<
  UserRole,
  { name: string; email: string; pass: string; label: string; desc: string; icon: typeof User }
> = {
  DONOR: {
    name: "Dr. Rafiqul Karim",
    email: "test.donor@lifedrop.org",
    pass: "Password123!",
    label: "Donor",
    desc: "O+ Donor (Banani, Dhaka)",
    icon: UserCheck,
  },
  RECIPIENT: {
    name: "Sadia Sultana",
    email: "test.recipient@lifedrop.org",
    pass: "Password123!",
    label: "Recipient",
    desc: "Seeking O+ Blood for Brother",
    icon: User,
  },
  HOSPITAL_ADMIN: {
    name: "Evercare Blood Bank",
    email: "test.hospital@lifedrop.org",
    pass: "Password123!",
    label: "Hospital Admin",
    desc: "Evercare Hospital Admin",
    icon: Building2,
  },
  SYSTEM_ADMIN: {
    name: "System Supervisor",
    email: "test.sysadmin@lifedrop.org",
    pass: "Password123!",
    label: "System Admin",
    desc: "Full Platform Oversight",
    icon: ShieldCheck,
  },
};

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
  const [isSwitching, setIsSwitching] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("+8801700000000");
  const [selectedRole, setSelectedRole] = useState<UserRole>(defaultRole);

  const { data: currentUser, isLoading } = useCurrentUser();
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logout = useLogout();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await loginMutation.mutateAsync({ email, password });
    setOpen(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
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
              date_of_birth: "1996-06-15",
              gender: "Male",
              weight: 68.0,
              address: "Banani, Dhaka",
              latitude: 23.7937,
              longitude: 90.4066,
              hemoglobin_level: 14.2,
            }
          : null,
      recipient_profile:
        selectedRole === "RECIPIENT"
          ? {
              nid_passport_no: "NID-882716291",
              address: "Gulshan, Dhaka",
              relationship_to_patient: "Brother",
              patient_name: "Patient Rahman",
            }
          : null,
      hospital_profile:
        selectedRole === "HOSPITAL_ADMIN"
          ? {
              hospital_name: "Evercare Hospital",
              address: "Bashundhara R/A, Dhaka",
              latitude: 23.8103,
              longitude: 90.4312,
              contact_number: "+88028401661",
            }
          : null,
    });
    // Switch to login tab
    setActiveTab("login");
  };

  // Real One-Click RBAC Role Switcher
  const handleQuickRoleSwitch = async (role: UserRole) => {
    setIsSwitching(true);
    const testAcc = RBAC_TEST_ACCOUNTS[role];

    try {
      // First attempt direct login
      await loginMutation.mutateAsync({
        email: testAcc.email,
        password: testAcc.pass,
      });
      toast.success(`Switched role to ${testAcc.label}`);
    } catch {
      // If user does not exist yet in DB, register automatically first
      try {
        await registerMutation.mutateAsync({
          full_name: testAcc.name,
          email: testAcc.email,
          phone: "+8801700000000",
          password: testAcc.pass,
          role: role,
          donor_profile:
            role === "DONOR"
              ? {
                  blood_group: "O_PLUS",
                  date_of_birth: "1996-06-15",
                  gender: "Male",
                  weight: 68.0,
                  address: "Banani, Dhaka",
                  latitude: 23.7937,
                  longitude: 90.4066,
                  hemoglobin_level: 14.2,
                }
              : null,
          recipient_profile:
            role === "RECIPIENT"
              ? {
                  nid_passport_no: "NID-882716291",
                  address: "Gulshan, Dhaka",
                  relationship_to_patient: "Brother",
                  patient_name: "Patient Rahman",
                }
              : null,
          hospital_profile:
            role === "HOSPITAL_ADMIN"
              ? {
                  hospital_name: "Evercare Hospital",
                  address: "Bashundhara R/A, Dhaka",
                  latitude: 23.8103,
                  longitude: 90.4312,
                  contact_number: "+88028401661",
                }
              : null,
        });

        // Now login
        await loginMutation.mutateAsync({
          email: testAcc.email,
          password: testAcc.pass,
        });
        toast.success(`Registered and switched to ${testAcc.label}!`);
      } catch (err) {
        toast.error((err as Error).message || "Failed to switch role.");
      }
    } finally {
      setIsSwitching(false);
      setOpen(false);
    }
  };

  if (isLoading) {
    return <div className="size-8 animate-pulse rounded-full bg-primary-glow/40" />;
  }

  // If already logged in, show user badge + dropdown menu with Quick Switcher & Logout
  if (currentUser) {
    const roleColors: Record<UserRole, string> = {
      DONOR: "bg-emerald-600 text-white",
      RECIPIENT: "bg-blue-600 text-white",
      HOSPITAL_ADMIN: "bg-amber-600 text-white",
      SYSTEM_ADMIN: "bg-purple-600 text-white",
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 rounded-full border border-primary-glow/60 bg-primary-glow/30 px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition hover:bg-primary-glow/50"
            title="User Account Menu & RBAC Switcher"
          >
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="max-w-[100px] truncate sm:max-w-none">{currentUser.full_name}</span>
            <Badge
              variant="outline"
              className={`ml-1 border-0 text-[10px] uppercase ${roleColors[currentUser.role]}`}
            >
              {currentUser.role.replace("_", " ")}
            </Badge>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{currentUser.full_name}</p>
              <p className="text-xs leading-none text-muted-foreground">{currentUser.email}</p>
              <p className="pt-1 text-[11px] font-semibold text-primary">
                Role: {currentUser.role}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Switch Real RBAC Role:
          </DropdownMenuLabel>
          {(Object.keys(RBAC_TEST_ACCOUNTS) as UserRole[]).map((role) => {
            const acc = RBAC_TEST_ACCOUNTS[role];
            const Icon = acc.icon;
            const isCurrent = currentUser.role === role;
            return (
              <DropdownMenuItem
                key={role}
                disabled={isCurrent || isSwitching}
                onClick={() => handleQuickRoleSwitch(role)}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-primary" />
                  <span>{acc.label}</span>
                </div>
                {isCurrent && (
                  <Badge variant="secondary" className="text-[10px]">
                    Active
                  </Badge>
                )}
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
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
          <DialogTitle>Account & RBAC Access</DialogTitle>
          <DialogDescription>
            Sign in, create a profile, or use the 1-Click Role Switcher to test as any role against
            the live backend.
          </DialogDescription>
        </DialogHeader>

        {/* Quick RBAC Switcher Toolbar */}
        <div className="rounded-lg border border-border/80 bg-muted/40 p-3">
          <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
            <UserCog className="size-3.5 text-primary" />
            1-Click Real RBAC Role Switcher:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(RBAC_TEST_ACCOUNTS) as UserRole[]).map((role) => {
              const acc = RBAC_TEST_ACCOUNTS[role];
              const Icon = acc.icon;
              return (
                <Button
                  key={role}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSwitching}
                  onClick={() => handleQuickRoleSwitch(role)}
                  className="h-auto py-1.5 px-2 flex items-center justify-start gap-1.5 text-[11px] font-medium"
                >
                  <Icon className="size-3.5 text-primary shrink-0" />
                  <span className="truncate">{acc.label}</span>
                </Button>
              );
            })}
          </div>
          {isSwitching && (
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground animate-pulse">
              <Loader2 className="size-3.5 animate-spin text-primary" />
              Authenticating against Supabase backend...
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="login-email">Email</Label>
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
                <Input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Authenticating..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          {/* Register Tab */}
          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-3 pt-2">
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
                  <Label htmlFor="reg-email">Email</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reg-phone">Phone</Label>
                  <Input
                    id="reg-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="reg-pass">Password</Label>
                  <Input
                    id="reg-pass"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reg-role">Role</Label>
                  <Select
                    value={selectedRole}
                    onValueChange={(v) => setSelectedRole(v as UserRole)}
                  >
                    <SelectTrigger id="reg-role">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DONOR">Donor</SelectItem>
                      <SelectItem value="RECIPIENT">Recipient</SelectItem>
                      <SelectItem value="HOSPITAL_ADMIN">Hospital Admin</SelectItem>
                      <SelectItem value="SYSTEM_ADMIN">System Admin</SelectItem>
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
