import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Boxes,
  CheckCircle2,
  ClipboardList,
  ShieldCheck,
  Users,
  Activity,
  ShieldAlert,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentUser } from "@/hooks/useAuth";
import { useBloodRequests } from "@/hooks/useRequests";
import { useBloodInventory } from "@/hooks/useInventory";
import { useSystemLogs } from "@/hooks/useAdmin";
import { toDisplayBloodGroup } from "@/lib/api/types";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Control & Audit Trail — LifeDrop" },
      {
        name: "description",
        content:
          "Live system analytics, real blood requests, and immutable audit logs backed by FastAPI & Supabase PostgreSQL.",
      },
      { property: "og:title", content: "Admin Control & Audit Trail — LifeDrop" },
      {
        property: "og:description",
        content: "System stats, live request queue, and audit trail for LifeDrop administrators.",
      },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: currentUser } = useCurrentUser();
  const isSysAdmin = currentUser?.role === "SYSTEM_ADMIN";
  const isHospitalAdmin = currentUser?.role === "HOSPITAL_ADMIN";
  const hasAdminAccess = isSysAdmin || isHospitalAdmin;

  // Real backend queries
  const {
    data: bloodRequests,
    isLoading: requestsLoading,
    refetch: refetchRequests,
  } = useBloodRequests();

  const {
    data: inventory,
    isLoading: inventoryLoading,
  } = useBloodInventory();

  const {
    data: auditLogs,
    isLoading: logsLoading,
    refetch: refetchLogs,
  } = useSystemLogs(50, 0, isSysAdmin);

  // Compute live system stats
  const totalStock = useMemo(
    () => (inventory ? inventory.reduce((sum, item) => sum + Number(item.quantity), 0) : 0),
    [inventory]
  );

  const pendingRequestsCount = useMemo(
    () => (bloodRequests ? bloodRequests.filter((r) => r.status === "PENDING" || r.status === "MATCHED").length : 0),
    [bloodRequests]
  );

  const stats = [
    {
      label: "Pending & Active Requests",
      value: pendingRequestsCount,
      icon: ClipboardList,
      hint: "Requests awaiting fulfillment",
    },
    {
      label: "Total Units in Stock",
      value: `${totalStock} units`,
      icon: Boxes,
      hint: "Across connected hospital banks",
    },
    {
      label: "System Audit Logs",
      value: auditLogs ? auditLogs.length : 0,
      icon: Activity,
      hint: "Security events recorded",
    },
    {
      label: "Current Admin Session",
      value: currentUser ? currentUser.role.replace("_", " ") : "Guest",
      icon: ShieldCheck,
      hint: currentUser?.email || "Sign in as Admin",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Admin Control & Audit</h1>
            <p className="mt-2 text-muted-foreground">
              Live system operations, blood request queue, and real-time security audit trails from
              Supabase.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchRequests();
                if (isSysAdmin) refetchLogs();
              }}
            >
              <RefreshCw className="mr-2 size-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        {!hasAdminAccess && (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
            <ShieldAlert className="size-5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <span className="font-semibold">Restricted View:</span> You are currently viewing as{" "}
              <strong>{currentUser?.role || "Guest"}</strong>. To view live audit logs and manage
              system queues, click <strong>Sign In</strong> and select the <strong>Hospital Admin</strong> or{" "}
              <strong>System Admin</strong> 1-Click test role.
            </div>
          </div>
        )}

        {/* Live Metrics Cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="shadow-[var(--shadow-elegant)]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                  <s.icon className="size-4 text-primary" />
                </div>
                <p className="mt-2 text-2xl font-bold tracking-tight">{s.value}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{s.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Live Blood Requests Queue */}
        <Card className="mt-8 shadow-[var(--shadow-elegant)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-5 text-primary" /> Live Blood Requests Queue
            </CardTitle>
            <CardDescription>
              Real requests recorded in `blood_requests` table with urgency status
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {requestsLoading ? (
              <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin text-primary" /> Loading requests...
              </div>
            ) : bloodRequests && bloodRequests.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Required Group</TableHead>
                    <TableHead>Component</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bloodRequests.map((r) => (
                    <TableRow key={r.request_id}>
                      <TableCell className="font-mono text-xs">
                        {r.request_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                          {toDisplayBloodGroup(r.blood_group)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">{r.component_type}</TableCell>
                      <TableCell className="text-xs font-semibold">{r.quantity} units</TableCell>
                      <TableCell>
                        <Badge
                          variant={r.urgency === "EMERGENCY" ? "destructive" : "secondary"}
                          className="text-[10px]"
                        >
                          {r.urgency}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={r.status === "COMPLETED" ? "default" : "outline"}
                          className="text-[10px]"
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {r.required_location}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No blood requests found in the database.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Immutable Audit Logs (System Admin Only) */}
        {isSysAdmin && (
          <Card className="mt-8 shadow-[var(--shadow-elegant)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-5 text-primary" /> Immutable System Audit Trail
              </CardTitle>
              <CardDescription>
                Direct records from `system_logs` table tracking sensitive system operations
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {logsLoading ? (
                <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin text-primary" /> Loading audit logs...
                </div>
              ) : auditLogs && auditLogs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target Entity</TableHead>
                      <TableHead>Entity ID</TableHead>
                      <TableHead>Origin IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.log_id}>
                        <TableCell className="font-mono text-[11px] text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-xs">{log.entity}</TableCell>
                        <TableCell className="font-mono text-[11px] text-muted-foreground">
                          {log.entity_id ? `${log.entity_id.slice(0, 8)}...` : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-muted-foreground">
                          {log.ip_address || "127.0.0.1"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No audit logs recorded yet.
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
