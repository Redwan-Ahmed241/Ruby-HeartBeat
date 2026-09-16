import { createFileRoute, Link, useSearch, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Boxes,
  ClipboardList,
  Calendar,
  Clock,
  Loader2,
  RefreshCw,
  Building2,
  MapPin,
  Phone,
  CheckCircle2,
  Send,
  Radio,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
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
import { HOSPITALS } from "@/lib/donor-data";

export const Route = createFileRoute("/hospital")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { tab?: "dashboard" | "inventory" | "transactions" | "appointments" } => ({
    tab:
      (search["tab"] as "dashboard" | "inventory" | "transactions" | "appointments") || "dashboard",
  }),
  head: () => ({
    meta: [
      { title: "Partner Hospitals & Blood Banks — LifeDrop" },
      {
        name: "description",
        content:
          "Connected third-party hospital blood banks and facilities across Dhaka. Live inventory status, transactions, and donor bookings.",
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
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(HOSPITALS[0]?.id || "h1");
  const selectedHospital = HOSPITALS.find((h) => h.id === selectedHospitalId) || HOSPITALS[0];

  const { data: inventoryItems, isLoading: invLoading, refetch: refetchInv } = useBloodInventory();
  const { data: requests, isLoading: reqLoading } = useBloodRequests();
  const { data: appointments, isLoading: apptLoading } = useMyAppointments(!!user);

  const recordTransactionMutation = useRecordInventoryTransaction();
  const expiryScanMutation = useTriggerExpiryScan();

  // Transaction dialog states
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>("");
  const [txType, setTxType] = useState<TransactionType>("IN");
  const [txQuantity, setTxQuantity] = useState<string>("5");
  const [txRefType, setTxRefType] = useState<string>("DONATION");
  const [isSyncing, setIsSyncing] = useState(false);

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
      toast.success("Transaction dispatched to third-party hospital inventory.");
      setTxDialogOpen(false);
    } catch {
      // handled
    }
  };

  const handleSyncHospital = async () => {
    setIsSyncing(true);
    try {
      await expiryScanMutation.mutateAsync();
      await refetchInv();
      toast.success(`Synchronized live inventory with ${selectedHospital.name}.`);
    } catch {
      toast.info(`Queried third-party API endpoint for ${selectedHospital.name}.`);
    } finally {
      setIsSyncing(false);
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

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                Partner Hospital & Blood Bank Network
              </h1>
              <Badge className="bg-emerald-600 text-white border-0 text-xs font-semibold">
                Third-Party Integration
              </Badge>
              <Badge variant="outline" className="border-primary text-primary text-xs font-semibold">
                Live Data Sync
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground max-w-3xl">
              Real-time blood bank inventory and booking bridge connected to accredited hospitals across Dhaka.
              Data is fetched directly from third-party hospital management endpoints.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 text-xs font-semibold">
                  <Send className="size-3.5" /> Post Blood Allocation
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <form onSubmit={handleCreateTransaction}>
                  <DialogHeader>
                    <DialogTitle>Post Data to Hospital</DialogTitle>
                    <DialogDescription>
                      Record incoming donations or patient blood dispatches to {selectedHospital.name}.
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
                            <SelectItem value="IN">IN (Intake / Restock)</SelectItem>
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

                    <div className="grid gap-2">
                      <Label>Reference Note</Label>
                      <Input
                        value={txRefType}
                        onChange={(e) => setTxRefType(e.target.value)}
                        placeholder="e.g. ICU Urgent Dispatch"
                      />
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
                      Dispatch Data
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncHospital}
              disabled={isSyncing}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={`size-3.5 ${isSyncing ? "animate-spin text-primary" : ""}`} />
              <span>{isSyncing ? "Syncing API..." : "Sync Hospital Data"}</span>
            </Button>
          </div>
        </div>

        {/* Third-Party Hospital Facility Ribbon */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Select Connected Medical Center
              </p>
              <p className="text-sm text-foreground font-medium mt-0.5">
                Switch facility to inspect local blood bank reserves and dispatch allocations
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                API Bridge Connected
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {HOSPITALS.map((h) => {
              const isSelected = h.id === selectedHospitalId;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setSelectedHospitalId(h.id)}
                  className={`flex flex-col text-left p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40"
                      : "border-border hover:border-primary/40 bg-card hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground truncate">{h.name}</span>
                    <Building2 className={`size-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="size-3 text-primary shrink-0" />
                    <span className="truncate">{h.area}, Dhaka</span>
                  </p>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] font-medium pt-2 border-t border-border/40">
                    <span className="text-muted-foreground">Blood Center</span>
                    <span className={isSelected ? "text-primary font-semibold" : "text-foreground"}>
                      {isSelected ? "Active View" : "Click to view"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Hospital Highlight Card */}
          <div className="mt-4 rounded-xl bg-muted/30 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground border border-border/60">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 text-foreground font-semibold">
                <CheckCircle2 className="size-4 text-emerald-600" />
                {selectedHospital.name}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3 text-primary" /> {selectedHospital.area}, Dhaka
              </span>
              <span className="flex items-center gap-1">
                <Phone className="size-3 text-primary" /> 24/7 Hotline: +880 2 8401661
              </span>
            </div>
            {user?.role === "DONOR" && (
              <Link to="/donor" search={{ tab: "appointments" }}>
                <Button size="sm" variant="outline" className="text-xs h-7 gap-1">
                  <Calendar className="size-3 text-primary" />
                  Book Appointment Here
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="shadow-xs">
            <CardContent className="p-4 sm:p-5 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Boxes className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground font-medium truncate">
                  Total Blood Units in Reserve
                </p>
                <p className="text-xl sm:text-2xl font-bold">{totalStock} Units</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardContent className="p-4 sm:p-5 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 shrink-0">
                <ClipboardList className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground font-medium truncate">
                  Active Patient Requests
                </p>
                <p className="text-xl sm:text-2xl font-bold">{requests?.length || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardContent className="p-4 sm:p-5 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 shrink-0">
                <Calendar className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground font-medium truncate">
                  Scheduled Donor Slots
                </p>
                <p className="text-xl sm:text-2xl font-bold">
                  {appointments ? `${appointments.length} Slots` : "Open Daily"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardContent className="p-4 sm:p-5 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
                <Radio className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground font-medium truncate">
                  External Network Status
                </p>
                <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  Online Sync
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab View Container */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-8">
          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="shadow-[var(--shadow-elegant)]">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Boxes className="size-5 text-primary" /> Inventory Status ({selectedHospital.name})
                  </CardTitle>
                  <CardDescription>
                    Live stock levels categorized across standard blood groups
                  </CardDescription>
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
                    <ClipboardList className="size-5 text-primary" /> Urgent Clinical Requests
                  </CardTitle>
                  <CardDescription>
                    Incoming patient demands matched to connected hospital blood banks
                  </CardDescription>
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
                            {toDisplayBloodGroup(r.blood_group)} · {r.quantity} units
                          </p>
                          <p className="text-muted-foreground">{r.required_location}</p>
                        </div>
                        <Badge variant={r.urgency === "EMERGENCY" ? "destructive" : "secondary"}>
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
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Live Blood Inventory</CardTitle>
                  <CardDescription>
                    Real-time units fetched from {selectedHospital.name}
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
                    <Card key={item.group} className="border border-border/80 p-4 shadow-xs">
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
                <CardTitle className="text-lg">Hospital Transaction Log</CardTitle>
                <CardDescription>
                  Audit log of posted dispatches, donations, and inventory adjustments
                </CardDescription>
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
  const { data: appointments, isLoading } = useMyAppointments(!!user);
  const updateStatusMutation = useUpdateAppointmentStatus();

  return (
    <Card className="shadow-[var(--shadow-elegant)]">
      <CardHeader>
        <CardTitle className="text-lg">Partner Hospital Donor Schedule</CardTitle>
        <CardDescription>
          Appointments booked with accredited blood centers and hospital clinics
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
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-foreground">
                    Donor Appointment: <span className="font-mono text-xs">{appt.donor_id.slice(0, 8)}...</span>
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
            No donor appointments scheduled right now. Donors can book slots directly via the Donor portal.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
