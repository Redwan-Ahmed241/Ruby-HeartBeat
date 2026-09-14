import { createFileRoute, Link, useSearch, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Boxes,
  ClipboardList,
  Calendar,
  ArrowUpDown,
  PlusCircle,
  Clock,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Building2,
  AlertTriangle,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuthDialog } from "@/components/AuthDialog";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  useBloodInventory,
  useRecordInventoryTransaction,
  useTriggerExpiryScan,
} from "@/hooks/useInventory";
import { useBloodRequests } from "@/hooks/useRequests";
import {
  BLOOD_GROUP_UI_MAP,
  toDisplayBloodGroup,
  type ComponentType,
  type StockStatus,
  type TransactionType,
} from "@/lib/api/types";
import { toast } from "sonner";
import { useMyAppointments, useUpdateAppointmentStatus } from "@/hooks/useAppointmentsEventsNotices";

export const Route = createFileRoute("/hospital")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { tab?: "dashboard" | "inventory" | "transactions" | "appointments" } => ({
    tab:
      (search.tab as "dashboard" | "inventory" | "transactions" | "appointments") || "dashboard",
  }),
  head: () => ({
    meta: [
      { title: "Hospital Portal — LifeDrop" },
      {
        name: "description",
        content: "Manage blood bank inventory, dispatch transactions, and donor appointments.",
      },
    ],
  }),
  component: HospitalPortalPage,
});

const GROUPS = Object.values(BLOOD_GROUP_UI_MAP);
const CAPACITY = 60;

function HospitalPortalPage() {
  const search = useSearch({ from: "/hospital" });
  const navigate = useNavigate();
  const activeTab = search["tab"] || "dashboard";

  const handleTabChange = (newTab: string) => {
    navigate({
      to: "/hospital",
      search: { tab: newTab as "dashboard" | "inventory" | "transactions" | "appointments" },
    });
  };

  const { data: user, isLoading: userLoading } = useCurrentUser();

  const { data: inventoryItems, isLoading: invLoading, refetch: refetchInv } = useBloodInventory();
  const { data: requests, isLoading: reqLoading } = useBloodRequests();
  const recordTransactionMutation = useRecordInventoryTransaction();
  const expiryScanMutation = useTriggerExpiryScan();

  // Transaction dialog states
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>("");
  const [txType, setTxType] = useState<TransactionType>("IN");
  const [txQuantity, setTxQuantity] = useState<string>("5");
  const [txRefType, setTxRefType] = useState<string>("DONATION");

  // Group inventory
  const groupedInventory = useMemo(() => {
    const map: Record<
      string,
      {
        total: number;
        status: StockStatus;
        byComponent: Record<ComponentType, number>;
        ids: string[];
      }
    > = {};

    GROUPS.forEach((g) => {
      map[g] = {
        total: 0,
        status: "OUT_OF_STOCK",
        byComponent: { WHOLE_BLOOD: 0, PLASMA: 0, PLATELETS: 0 },
        ids: [],
      };
    });

    if (inventoryItems) {
      inventoryItems.forEach((item) => {
        const displayGroup = toDisplayBloodGroup(item.blood_group);
        if (map[displayGroup]) {
          const qty = Number(item.quantity);
          map[displayGroup].total += qty;
          map[displayGroup].byComponent[item.component_type] =
            (map[displayGroup].byComponent[item.component_type] || 0) + qty;
          map[displayGroup].ids.push(item.inventory_id);
          if (
            item.status === "OUT_OF_STOCK" ||
            (item.status === "CRITICAL" && map[displayGroup].status !== "OUT_OF_STOCK") ||
            (item.status === "LOW_STOCK" && map[displayGroup].status === "HEALTHY")
          ) {
            map[displayGroup].status = item.status;
          } else if (map[displayGroup].status === "OUT_OF_STOCK" && qty > 0) {
            map[displayGroup].status = item.status;
          }
        }
      });
    }

    return Object.entries(map).map(([group, data]) => ({
      group,
      total: data.total,
      status: data.total === 0 ? "OUT_OF_STOCK" : data.status,
      byComponent: data.byComponent,
      inventoryId: data.ids[0] || "",
    }));
  }, [inventoryItems]);

  const totalStock = groupedInventory.reduce((acc, curr) => acc + curr.total, 0);

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInventoryId) {
      toast.error("Please select a blood inventory item.");
      return;
    }
    try {
      await recordTransactionMutation.mutateAsync({
        inventory_id: selectedInventoryId,
        type: txType,
        quantity: Number(txQuantity),
        reference_type: txRefType,
      });
      setTxDialogOpen(false);
    } catch {
      // handled
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteNav />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Route Guard check: only HOSPITAL_ADMIN or SYSTEM_ADMIN
  if (!user || (user.role !== "HOSPITAL_ADMIN" && user.role !== "SYSTEM_ADMIN")) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 mb-4">
            <ShieldAlert className="size-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Hospital Administration Portal</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            {user
              ? `You are signed in as ${user.role}. This portal is strictly restricted to certified Hospital Administrators.`
              : "Sign in with an authorized Hospital Administrator account to manage hospital blood reserves and transactions."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <AuthDialog defaultTab="login" defaultRole="HOSPITAL_ADMIN" />
            <Link to="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 py-10">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Hospital Administration
              </h1>
              <Badge
                variant="outline"
                className="text-xs font-semibold text-primary border-primary bg-primary/5"
              >
                Hospital Authority
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Connected to Dhaka Medical College & Central Blood Bank Network.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <PlusCircle className="mr-1.5 size-4" /> Record Transaction
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreateTransaction}>
                  <DialogHeader>
                    <DialogTitle>Log Stock Transaction</DialogTitle>
                    <DialogDescription>
                      Record incoming donations or patient blood dispatches.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Target Blood Group</Label>
                      <Select value={selectedInventoryId} onValueChange={setSelectedInventoryId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select group to adjust" />
                        </SelectTrigger>
                        <SelectContent>
                          {groupedInventory
                            .filter((g) => g.inventoryId)
                            .map((g) => (
                              <SelectItem key={g.inventoryId} value={g.inventoryId}>
                                {g.group} ({g.total} units available)
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Transaction Type</Label>
                        <Select
                          value={txType}
                          onValueChange={(v) => setTxType(v as TransactionType)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="IN">IN (Donation / Intake)</SelectItem>
                            <SelectItem value="OUT">OUT (Patient Dispatch)</SelectItem>
                            <SelectItem value="EXPIRED">EXPIRED (Disposal)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Units (Bags)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          value={txQuantity}
                          onChange={(e) => setTxQuantity(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setTxDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={recordTransactionMutation.isPending}>
                      {recordTransactionMutation.isPending && (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      )}
                      Record Entry
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchInv();
                expiryScanMutation.mutate();
              }}
            >
              <RefreshCw className="mr-1.5 size-3.5" /> Scan Expiries
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Boxes className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Total Blood Units in Reserve
                </p>
                <p className="text-2xl font-bold">{totalStock} Units</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <ClipboardList className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Pending Clinical Requests
                </p>
                <p className="text-2xl font-bold">{requests?.length || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <Calendar className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Donor Appointments Today
                </p>
                <p className="text-2xl font-bold">12 Slots</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Views: Dashboard, Inventory, Transactions, Appointments driven by URL Search Params */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-8">
          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="shadow-[var(--shadow-elegant)]">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Boxes className="size-5 text-primary" /> Inventory Status Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {groupedInventory.slice(0, 4).map((item) => (
                    <div key={item.group} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold">{item.group}</span>
                        <span className="text-muted-foreground">
                          {item.total} / {CAPACITY} units ({item.status})
                        </span>
                      </div>
                      <Progress value={(item.total / CAPACITY) * 100} className="h-2" />
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => handleTabChange("inventory")}
                  >
                    View All 8 Blood Groups
                  </Button>
                </CardContent>
              </Card>

              <Card className="shadow-[var(--shadow-elegant)]">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardList className="size-5 text-primary" /> Urgent Clinical Dispatches
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!requests || requests.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-6 text-center">
                      No active requests in queue.
                    </p>
                  ) : (
                    requests.slice(0, 4).map((r) => (
                      <div
                        key={r.request_id}
                        className="flex items-center justify-between rounded-lg border border-border p-3 text-xs"
                      >
                        <div>
                          <p className="font-bold text-foreground">
                            {toDisplayBloodGroup(r.blood_group)} · {r.units_needed} units
                          </p>
                          <p className="text-muted-foreground">
                            {r.hospital_name || "Assigned Facility"}
                          </p>
                        </div>
                        <Badge variant={r.urgency === "CRITICAL" ? "destructive" : "secondary"}>
                          {r.urgency}
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Blood Inventory Tab */}
          <TabsContent value="inventory" className="mt-6">
            <Card className="shadow-[var(--shadow-elegant)]">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Real-Time Blood Bank Inventory</CardTitle>
                  <CardDescription>
                    Live stock levels across Whole Blood, Plasma, and Platelets
                  </CardDescription>
                </div>
                <Link to="/inventory">
                  <Button variant="outline" size="sm">
                    Dedicated Inventory View
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {groupedInventory.map((item) => (
                    <Card key={item.group} className="border border-border/80 p-4">
                      <div className="flex items-start justify-between">
                        <span className="text-2xl font-black text-primary">{item.group}</span>
                        <Badge
                          variant={item.total === 0 ? "destructive" : "outline"}
                          className="text-[10px]"
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <p className="mt-2 text-2xl font-bold">
                        {item.total}{" "}
                        <span className="text-xs font-normal text-muted-foreground">units</span>
                      </p>
                      <Progress value={(item.total / CAPACITY) * 100} className="mt-2 h-1.5" />
                      <div className="mt-3 space-y-1 text-[11px] text-muted-foreground border-t border-border/50 pt-2">
                        <div className="flex justify-between">
                          <span>Whole Blood:</span> <strong>{item.byComponent.WHOLE_BLOOD}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Plasma:</span> <strong>{item.byComponent.PLASMA}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Platelets:</span> <strong>{item.byComponent.PLATELETS}</strong>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="mt-6">
            <Card className="shadow-[var(--shadow-elegant)]">
              <CardHeader>
                <CardTitle className="text-lg">Inventory Audit Log</CardTitle>
                <CardDescription>Record of verified intake and hospital dispatches</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    {
                      type: "IN",
                      group: "O+",
                      qty: 10,
                      ref: "Mobile Campaign Drive #4",
                      time: "Today at 2:15 PM",
                    },
                    {
                      type: "OUT",
                      group: "A+",
                      qty: 3,
                      ref: "Emergency ICU Patient #402",
                      time: "Today at 11:30 AM",
                    },
                    {
                      type: "IN",
                      group: "B-",
                      qty: 2,
                      ref: "Voluntary Walk-in Donor",
                      time: "Yesterday",
                    },
                    {
                      type: "EXPIRED",
                      group: "AB+",
                      qty: 1,
                      ref: "Platelets 5-day Shelf Expiry",
                      time: "2 days ago",
                    },
                  ].map((tx, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            tx.type === "IN"
                              ? "default"
                              : tx.type === "OUT"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {tx.type}
                        </Badge>
                        <div>
                          <p className="font-semibold text-foreground">
                            {tx.qty} units of {tx.group}
                          </p>
                          <p className="text-xs text-muted-foreground">{tx.ref}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{tx.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="mt-6">
            <HospitalAppointmentsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function HospitalAppointmentsTab() {
  const { data: user } = useCurrentUser();
  const isHospital = user?.role === "HOSPITAL_ADMIN";
  const { data: appointments, isLoading } = useMyAppointments(isHospital);
  const updateStatusMutation = useUpdateAppointmentStatus();

  return (
    <Card className="shadow-[var(--shadow-elegant)]">
      <CardHeader>
        <CardTitle className="text-lg">Hospital Donor Appointments</CardTitle>
        <CardDescription>
          Live booked slots for blood intake at the hospital facility
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin text-primary" /> Loading appointments...
          </div>
        ) : appointments && appointments.length > 0 ? (
          <div className="space-y-3">
            {appointments.map((appt) => (
              <div
                key={appt.appointment_id}
                className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-foreground">
                    Donor: <span className="font-mono text-xs">{appt.donor_id.slice(0, 8)}...</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Date: {new Date(appt.appointment_date).toLocaleDateString()} · Slot: {appt.appointment_time}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={appt.status === "COMPLETED" ? "default" : appt.status === "CANCELLED" ? "destructive" : "outline"}
                  >
                    {appt.status}
                  </Badge>
                  {appt.status === "SCHEDULED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      disabled={updateStatusMutation.isPending}
                      onClick={() =>
                        updateStatusMutation.mutate({
                          appointmentId: appt.appointment_id,
                          payload: { status: "COMPLETED" },
                        })
                      }
                    >
                      Mark Complete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No donor appointments found for this hospital.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
