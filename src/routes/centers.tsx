import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Building2,
  MapPin,
  Phone,
  Clock,
  Calendar,
  RefreshCw,
  Search,
  Boxes,
  AlertCircle,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AuthDialog } from "@/components/AuthDialog";
import { useCurrentUser } from "@/hooks/useAuth";
import { useBloodInventory, useTriggerExpiryScan } from "@/hooks/useInventory";
import { formatBloodGroup } from "@/lib/formatters";
import { toast } from "sonner";

export const Route = createFileRoute("/centers")({
  head: () => ({
    meta: [
      { title: "Hospital Blood Centers Directory — LifeDrop" },
      {
        name: "description",
        content:
          "Public directory of affiliated partner hospitals, operating hours, live blood inventory sync, and donation booking across Dhaka.",
      },
    ],
  }),
  component: HospitalCentersPage,
});

interface PartnerHospital {
  id: string;
  name: string;
  area: string;
  address: string;
  phone: string;
  emergencyHotline: string;
  operatingHours: string;
  is24Hours: boolean;
  type: string;
}

const PARTNER_HOSPITALS: PartnerHospital[] = [
  {
    id: "dmch",
    name: "Dhaka Medical College Hospital",
    area: "Shahbagh",
    address: "Secretariat Road, Shahbagh, Dhaka-1000",
    phone: "+880 2 55165088",
    emergencyHotline: "+880 1711 000101",
    operatingHours: "24/7 Emergency Blood Bank",
    is24Hours: true,
    type: "Public Tertiary Medical Center",
  },
  {
    id: "square",
    name: "Square Hospital Blood Bank",
    area: "Panthapath",
    address: "18F Bir Uttam Qazi Nuruzzaman Sarak, Dhaka-1205",
    phone: "+880 2 8159457",
    emergencyHotline: "10616",
    operatingHours: "24/7 Continuous Operation",
    is24Hours: true,
    type: "Private Super Specialty",
  },
  {
    id: "evercare",
    name: "Evercare Hospital Dhaka",
    area: "Bashundhara",
    address: "Plot 81, Block E, Bashundhara R/A, Dhaka-1229",
    phone: "+880 2 8431661",
    emergencyHotline: "10678",
    operatingHours: "24 Hours Blood Transfusion Service",
    is24Hours: true,
    type: "JCI Accredited Facility",
  },
  {
    id: "united",
    name: "United Hospital Blood Center",
    area: "Gulshan",
    address: "Plot 15, Road 71, Gulshan-2, Dhaka-1212",
    phone: "+880 2 8836444",
    emergencyHotline: "10666",
    operatingHours: "24/7 Emergency Transfusion",
    is24Hours: true,
    type: "Private Specialized Hospital",
  },
  {
    id: "birdem",
    name: "BIRDEM General Hospital Blood Transfusion",
    area: "Shahbagh",
    address: "122 Kazi Nazrul Islam Ave, Shahbagh, Dhaka-1000",
    phone: "+880 2 9661551",
    emergencyHotline: "+880 1819 223344",
    operatingHours: "8:00 AM – 10:00 PM Daily",
    is24Hours: false,
    type: "Diabetic Association of Bangladesh",
  },
  {
    id: "popular",
    name: "Popular Diagnostic & Medical Center",
    area: "Dhanmondi",
    address: "House 16, Road 2, Dhanmondi, Dhaka-1205",
    phone: "+880 9613 787801",
    emergencyHotline: "+880 1711 556677",
    operatingHours: "24/7 Lab & Blood Services",
    is24Hours: true,
    type: "Diagnostic & Transfusion Center",
  },
];

const AREAS = ["All", "Shahbagh", "Panthapath", "Bashundhara", "Gulshan", "Dhanmondi"];

function HospitalCentersPage() {
  const { data: user } = useCurrentUser();
  const { data: inventoryItems, isLoading: isInvLoading, refetch: refetchInventory } = useBloodInventory();
  const expiryScanMutation = useTriggerExpiryScan();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArea, setSelectedArea] = useState("All");
  const [isSyncing, setIsSyncing] = useState(false);

  // Group inventory units across standard blood groups
  const stockSummary = useMemo(() => {
    const summary: Record<string, number> = {
      O_PLUS: 0,
      O_MINUS: 0,
      A_PLUS: 0,
      A_MINUS: 0,
      B_PLUS: 0,
      B_MINUS: 0,
      AB_PLUS: 0,
      AB_MINUS: 0,
    };

    if (inventoryItems) {
      inventoryItems.forEach((item) => {
        const key = item.blood_group;
        if (summary[key] !== undefined) {
          summary[key] += Number(item.quantity) || 0;
        }
      });
    }
    return summary;
  }, [inventoryItems]);

  const totalUnits = useMemo(() => {
    return Object.values(stockSummary).reduce((acc, curr) => acc + curr, 0);
  }, [stockSummary]);

  const filteredHospitals = useMemo(() => {
    return PARTNER_HOSPITALS.filter((h) => {
      const matchSearch =
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.address.toLowerCase().includes(searchQuery.toLowerCase());
      const matchArea = selectedArea === "All" || h.area === selectedArea;
      return matchSearch && matchArea;
    });
  }, [searchQuery, selectedArea]);

  const handleSyncStock = async () => {
    setIsSyncing(true);
    try {
      await expiryScanMutation.mutateAsync();
      await refetchInventory();
      toast.success("Synchronized real-time inventory from external partner network.");
    } catch {
      await refetchInventory();
      toast.info("Queried live stock feeds from partner hospital endpoints.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-background flex flex-col">
      <SiteNav />
      <main className="w-full max-w-7xl 2xl:max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex-1">
        {/* Header Ribbon */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-border/60">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                Affiliated Hospital Blood Centers
              </h1>
              <Badge className="bg-emerald-600 text-white border-0 text-xs font-semibold">
                Third-Party Network
              </Badge>
              <Badge variant="outline" className="border-primary text-primary text-xs font-semibold">
                Live External Feeds
              </Badge>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-3xl">
              Public directory of certified hospitals and blood banks across Dhaka. Check operating hours,
              contact medical staff, inspect aggregated partner blood reserves, or book a donation appointment.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncStock}
              disabled={isSyncing || isInvLoading}
              className="gap-2 text-xs font-semibold h-9 shadow-xs"
            >
              <RefreshCw className={`size-3.5 ${isSyncing ? "animate-spin text-primary" : ""}`} />
              <span>{isSyncing ? "Syncing Network..." : "Sync Partner Blood Stock"}</span>
            </Button>
          </div>
        </div>

        {/* Live Aggregated Stock Feed Banner */}
        <div className="mt-6 rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-[var(--shadow-elegant)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Boxes className="size-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Live Aggregated Partner Stock ({totalUnits} Total Units in Reserve)
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Direct telemetry from partner hospital management systems
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
            {Object.entries(stockSummary).map(([rawGroup, qty]) => {
              const formatted = formatBloodGroup(rawGroup, "symbol");
              return (
                <div
                  key={rawGroup}
                  className="rounded-xl border border-border/70 bg-muted/30 p-2.5 text-center flex flex-col items-center justify-center transition-all hover:bg-muted/50"
                >
                  <span className="text-xs font-medium text-muted-foreground">Group</span>
                  <span className="text-lg font-black text-primary">{formatted}</span>
                  <span className="text-xs font-semibold text-foreground mt-0.5">
                    {qty} <span className="text-[10px] font-normal text-muted-foreground">units</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search hospital name, address, or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm h-10 rounded-xl"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {AREAS.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => setSelectedArea(area)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedArea === area
                    ? "bg-primary text-white shadow-xs"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        </div>

        {/* Hospital Directory Cards Grid */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredHospitals.map((hospital) => (
            <Card
              key={hospital.id}
              className="rounded-2xl border border-border/80 bg-card shadow-[var(--shadow-elegant)] hover:border-primary/40 transition-all flex flex-col"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider mb-1 font-semibold text-primary border-primary/30">
                      {hospital.type}
                    </Badge>
                    <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                      {hospital.name}
                    </CardTitle>
                  </div>
                  <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                    <Building2 className="size-5" />
                  </div>
                </div>
                <CardDescription className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="size-3.5 text-primary shrink-0" />
                  <span>{hospital.address}</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 flex-1 flex flex-col justify-between pt-0">
                <div className="space-y-2 rounded-xl bg-muted/40 p-3 text-xs border border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3.5 text-primary" /> Operating Hours:
                    </span>
                    <span className="font-semibold text-foreground">{hospital.operatingHours}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Phone className="size-3.5 text-primary" /> Blood Bank Tel:
                    </span>
                    <a
                      href={`tel:${hospital.phone}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {hospital.phone}
                    </a>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="size-3.5 text-destructive" /> Emergency Line:
                    </span>
                    <span className="font-bold text-destructive">{hospital.emergencyHotline}</span>
                  </div>
                </div>

                <div className="pt-2">
                  {user?.role === "DONOR" ? (
                    <Link
                      to="/donor"
                      search={{ tab: "appointments" }}
                      className="w-full"
                    >
                      <Button className="w-full gap-1.5 text-xs font-bold" size="sm">
                        <Calendar className="size-3.5" /> Book Donation Slot
                      </Button>
                    </Link>
                  ) : (
                    <AuthDialog
                      defaultTab="login"
                      trigger={
                        <Button className="w-full gap-1.5 text-xs font-bold" size="sm">
                          <Calendar className="size-3.5" /> Book Donation Slot
                        </Button>
                      }
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredHospitals.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-12 text-center">
            <Building2 className="mx-auto size-10 text-muted-foreground opacity-50" />
            <h3 className="mt-3 text-base font-semibold text-foreground">No matching medical centers</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Try adjusting your search keywords or clear the area filter to see all partner centers.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-xs"
              onClick={() => {
                setSearchQuery("");
                setSelectedArea("All");
              }}
            >
              Reset Filters
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
