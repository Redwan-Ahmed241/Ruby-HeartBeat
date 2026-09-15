import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Users,
  Search,
  ShieldAlert,
  Loader2,
  ShieldCheck,
  ShieldBan,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentUser } from "@/hooks/useAuth";
import { useAllUsers, useUpdateUserStatus } from "@/hooks/useAdmin";
import type { UserRole } from "@/lib/api/types";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "User Management — LifeDrop Admin" },
      {
        name: "description",
        content: "Manage platform users, view accounts, and control user statuses.",
      },
    ],
  }),
  component: AdminUsersPage,
});

const ROLE_COLORS: Record<UserRole, string> = {
  DONOR: "bg-emerald-600 text-white",
  RECIPIENT: "bg-blue-600 text-white",
  HOSPITAL_ADMIN: "bg-amber-600 text-white",
  SYSTEM_ADMIN: "bg-purple-600 text-white",
};

function AdminUsersPage() {
  const { data: currentUser } = useCurrentUser();
  const isSysAdmin = currentUser?.role === "SYSTEM_ADMIN";

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  const filters = {
    ...(roleFilter !== "ALL" ? { role: roleFilter } : {}),
    ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
  };

  const { data: users, isLoading } = useAllUsers(
    Object.keys(filters).length > 0 ? filters : undefined,
    isSysAdmin,
  );
  const updateStatusMutation = useUpdateUserStatus();

  if (!isSysAdmin) {
    return (
      <div className="py-16 text-center">
        <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 mb-4">
          <ShieldAlert className="size-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Access Restricted</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          User management is only available to System Administrators.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">User Management</h1>
          <p className="mt-2 text-muted-foreground">
            View, search, and manage all platform user accounts.
          </p>
        </div>
      </div>

      <Card className="mt-8 shadow-[var(--shadow-elegant)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5 text-primary" /> All Users
          </CardTitle>
          <CardDescription>
            {users ? `${users.length} user(s) found` : "Loading..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Roles</SelectItem>
                <SelectItem value="DONOR">Donor</SelectItem>
                <SelectItem value="RECIPIENT">Recipient</SelectItem>
                <SelectItem value="HOSPITAL_ADMIN">Hospital Admin</SelectItem>
                <SelectItem value="SYSTEM_ADMIN">System Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin text-primary" /> Loading users...
            </div>
          ) : users && users.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const isCurrentUser = u.user_id === currentUser?.user_id;
                    return (
                      <TableRow key={u.user_id}>
                        <TableCell className="font-medium text-sm">{u.full_name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{u.phone}</TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] ${ROLE_COLORS[u.role]}`}>
                            {u.role.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={u.status === "ACTIVE" ? "default" : "destructive"}
                            className="text-[10px]"
                          >
                            {u.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {isCurrentUser ? (
                            <span className="text-xs text-muted-foreground">You</span>
                          ) : u.status === "ACTIVE" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs text-destructive hover:text-destructive"
                              disabled={updateStatusMutation.isPending}
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  userId: u.user_id,
                                  status: "BLOCKED",
                                })
                              }
                            >
                              <ShieldBan className="mr-1 size-3" />
                              Block
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs text-emerald-600 hover:text-emerald-700"
                              disabled={updateStatusMutation.isPending}
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  userId: u.user_id,
                                  status: "ACTIVE",
                                })
                              }
                            >
                              <ShieldCheck className="mr-1 size-3" />
                              Unblock
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No users found matching your filters.
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
