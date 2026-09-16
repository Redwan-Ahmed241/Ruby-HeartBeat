import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Droplet,
  Search,
  Siren,
  RefreshCw,
  PlusCircle,
  Loader2,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  useBloodInventory,
  useRecordInventoryTransaction,
  useTriggerExpiryScan,
} from "@/hooks/useInventory";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  BLOOD_GROUP_UI_MAP,
  toApiBloodGroup,
  toDisplayBloodGroup,
  type BloodGroup,
  type ComponentType,
  type StockStatus,
  type TransactionType,
} from "@/lib/api/types";
import { formatBloodGroup } from "@/lib/formatters";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Blood Inventory Levels — LifeDrop" },
      {
        name: "description",
        content:
          "Live stock levels by blood group and component, shortage alerts, and emergency request tracking across partner blood banks.",
      },
      { property: "og:title", content: "Blood Inventory Levels — LifeDrop" },
      {
        property: "og:description",
        content: "Track units per group and component, with critical shortage alerts in real time.",
      },
    ],
  }),
  component: Inventory,
});

const GROUPS = Object.values(BLOOD_GROUP_UI_MAP);
const COMPONENTS: ComponentType[] = ["WHOLE_BLOOD", "PLASMA", "PLATELETS"];
const CAPACITY = 60;

const STATUS_DISPLAY: Record<StockStatus, { label: string; className: string }> = {
  HEALTHY: { label: "Healthy", className: "bg-emerald-600 text-white" },
  LOW_STOCK: { label: "Low Stock", className: "bg-amber-600 text-white" },
  CRITICAL: { label: "Critical", className: "bg-rose-600 text-white" },
  OUT_OF_STOCK: { label: "Out of Stock", className: "bg-destructive text-destructive-foreground" },
};

function Inventory() {
  const { data: currentUser } = useCurrentUser();
  const { data: inventoryItems, isLoading, refetch } = useBloodInventory();
  const recordTransactionMutation = useRecordInventoryTransaction();
  const expiryScanMutation = useTriggerExpiryScan();

  const [query, setQuery] = useState("");
  const [componentFilter, setComponentFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Transaction dialog states
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>("");
  const [txType, setTxType] = useState<TransactionType>("IN");
  const [txQuantity, setTxQuantity] = useState<string>("5");
  const [txRefType, setTxRefType] = useState<string>("DONATION");

  // Aggregate items by blood group
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
          // worst status wins
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

  const shortages = groupedInventory.filter(
    (r) => r.status === "CRITICAL" || r.status === "OUT_OF_STOCK",
  );

  const visible = groupedInventory.filter((r) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || r.group.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "All" || r.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const totalUnits = groupedInventory.reduce((s, r) => s + r.total, 0);

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInventoryId) {
      toast.error("Please select a blood inventory unit.");
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
      // toast in hook
    }
  };

  const handleScanExpiries = async () => {
    await expiryScanMutation.mutateAsync();
  };

  const isHospitalOrAdmin = !!currentUser;

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      {shortages.length > 0 && (
        <div
          role="alert"
          className="animate-pulse-slow border-b border-destructive/40 bg-destructive text-destructive-foreground"
        >
          <div className="w-full max-w-7xl 2xl:max-w-[1500px] mx-auto flex flex-wrap items-center gap-3 px-4 sm:px-6 lg:px-8 py-3">
            <AlertTriangle className="size-5 shrink-0" />
            <p className="text-sm font-semibold">
              CRITICAL SHORTAGE — {shortages.map((s) => formatBloodGroup(s.group, "symbol")).join(", ")}{" "}
              {shortages.length === 1 ? "is" : "are"} critically low or out of stock in connected
              blood banks.
            </p>
          </div>
        </div>
      )}

      <main className="w-full max-w-7xl 2xl:max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">Blood Inventory</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {isLoading ? "Loading stock..." : `${totalUnits} units in stock`} across
              connected hospital blood banks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleScanExpiries}
              disabled={expiryScanMutation.isPending}
            >
              {expiryScanMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Clock className="mr-2 size-4 text-amber-500" />
              )}
              72h Expiry Scan
            </Button>

            {isHospitalOrAdmin && (
              <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <PlusCircle className="mr-2 size-4" />
                    Record Stock Transaction
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Stock Transaction</DialogTitle>
                    <DialogDescription>
                      Update stock quantity (IN, OUT, ADJUSTMENT) and recalculate inventory status.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleCreateTransaction} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="inv-sel">Select Inventory Unit</Label>
                      <Select value={selectedInventoryId} onValueChange={setSelectedInventoryId}>
                        <SelectTrigger id="inv-sel">
                          <SelectValue placeholder="Choose inventory unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryItems?.map((item) => (
                            <SelectItem key={item.inventory_id} value={item.inventory_id}>
                              {formatBloodGroup(toDisplayBloodGroup(item.blood_group), "symbol")} · {item.component_type} (
                              {item.quantity} units)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="tx-t">Transaction Type</Label>
                        <Select
                          value={txType}
                          onValueChange={(v) => setTxType(v as TransactionType)}
                        >
                          <SelectTrigger id="tx-t">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="IN">IN (Stock Received)</SelectItem>
                            <SelectItem value="OUT">OUT (Stock Dispatched)</SelectItem>
                            <SelectItem value="ADJUSTMENT">ADJUSTMENT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="tx-q">Quantity (Units)</Label>
                        <Input
                          id="tx-q"
                          type="number"
                          step="0.5"
                          min={0.5}
                          value={txQuantity}
                          onChange={(e) => setTxQuantity(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="tx-ref">Reference</Label>
                      <Input
                        id="tx-ref"
                        placeholder="e.g. Mobile Drive, Emergency Surgery"
                        value={txRefType}
                        onChange={(e) => setTxRefType(e.target.value)}
                        required
                      />
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setTxDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={recordTransactionMutation.isPending}>
                        {recordTransactionMutation.isPending && (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        )}
                        Commit Transaction
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}

            <Button variant="ghost" size="icon" onClick={() => refetch()} title="Refresh Live Data">
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mt-6 shadow-xs border border-border/80">
          <CardContent className="grid gap-4 p-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="q">Search Blood Group</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="q"
                  className="pl-9"
                  placeholder="e.g. O+"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="st">Stock Status Filter</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="st">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  {Object.keys(STATUS_DISPLAY).map((k) => (
                    <SelectItem key={k} value={k}>
                      {STATUS_DISPLAY[k as StockStatus].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stock Cards Grid */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
          {visible.map((row) => (
            <Card key={row.group} className="shadow-[var(--shadow-elegant)] border border-border/80">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-2xl font-bold text-primary">
                    <Droplet className="size-5" />
                    {formatBloodGroup(row.group, "symbol")}
                  </span>
                  <Badge className={STATUS_DISPLAY[row.status].className}>
                    {STATUS_DISPLAY[row.status].label}
                  </Badge>
                </div>

                <Progress value={Math.min(100, (row.total / CAPACITY) * 100)} />
                <p className="text-xs text-muted-foreground">{row.total} units available</p>

                <ul className="space-y-1 border-t border-border pt-3 text-xs">
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground">Whole Blood</span>
                    <span className="font-semibold text-foreground">
                      {row.byComponent.WHOLE_BLOOD} units
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground">Plasma</span>
                    <span className="font-semibold text-foreground">
                      {row.byComponent.PLASMA} units
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground">Platelets</span>
                    <span className="font-semibold text-foreground">
                      {row.byComponent.PLATELETS} units
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
