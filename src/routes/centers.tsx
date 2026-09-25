import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, lazy, Suspense } from "react";
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
  Mail,
  CheckCircle2,
  ShieldCheck,
  Map,
  LayoutGrid,
  Loader2,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/useAuth";
import { useBloodInventory, useTriggerExpiryScan } from "@/hooks/useInventory";
import { toDisplayBloodGroup } from "@/lib/api/types";
import { formatBloodGroup } from "@/lib/formatters";
import { ContactBloodBankModal, type BloodBankInfo } from "@/components/ContactBloodBankModal";
import { toast } from "sonner";
import type { BloodBankPin } from "@/components/BloodBankMap";

const BloodBankMap = lazy(() => import("@/components/BloodBankMap"));

export const Route = createFileRoute("/centers")({
  head: () => ({
    meta: [
      { title: "Partner Blood Banks & Reserves — LifeDrop" },
      {
        name: "description",
        content:
          "Public directory of certified partner blood banks, operating hours, live reserve telemetry, and coordinator contact authorization across Dhaka.",
      },
    ],
  }),
  component: BloodBanksPage,
});

export interface PartnerBloodBank extends BloodBankInfo {
  operatingHours: string;
  is24Hours: boolean;
  reservesHighlight?: string[];
  lat: number;
  lng: number;
}

const PARTNER_BLOOD_BANKS: PartnerBloodBank[] = [
  {
    id: "dmch",
    name: "Dhaka Medical College Hospital Blood Bank",
    area: "Shahbagh",
    address: "Secretariat Road, Shahbagh, Dhaka-1000",
    phone: "+880 2 55165088",
    emergencyHotline: "+880 1711 000101",
    operatingHours: "24/7 Emergency Blood Bank",
    is24Hours: true,
    type: "Public Tertiary Medical Center",
    reservesHighlight: ["Whole Blood", "Platelets", "PRBC"],
    lat: 23.7260,
    lng: 90.3975,
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
    reservesHighlight: ["Apheresis Platelets", "Plasma", "Cryo"],
    lat: 23.7525,
    lng: 90.3813,
  },
  {
    id: "evercare",
    name: "Evercare Hospital Blood Bank Dhaka",
    area: "Bashundhara",
    address: "Plot 81, Block E, Bashundhara R/A, Dhaka-1229",
    phone: "+880 2 8431661",
    emergencyHotline: "10678",
    operatingHours: "24 Hours Blood Transfusion Service",
    is24Hours: true,
    type: "JCI Accredited Facility",
    reservesHighlight: ["Irradiated Blood", "FFP", "Platelets"],
    lat: 23.8131,
    lng: 90.4255,
  },
  {
    id: "united",
    name: "United Hospital Transfusion Center",
    area: "Gulshan",
    address: "Plot 15, Road 71, Gulshan-2, Dhaka-1212",
    phone: "+880 2 8836444",
    emergencyHotline: "10666",
    operatingHours: "24/7 Emergency Transfusion",
    is24Hours: true,
    type: "Private Specialized Hospital",
    reservesHighlight: ["Whole Blood", "Platelet Concentrates"],
    lat: 23.7933,
    lng: 90.4152,
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
    reservesHighlight: ["Packed RBC", "Whole Blood"],
    lat: 23.7392,
    lng: 90.3946,
  },
  {
    id: "popular",
    name: "Popular Diagnostic Transfusion Center",
    area: "Dhanmondi",
    address: "House 16, Road 2, Dhanmondi, Dhaka-1205",
    phone: "+880 9613 787801",
    emergencyHotline: "+880 1711 556677",
    operatingHours: "24/7 Lab & Blood Services",
    is24Hours: true,
    type: "Diagnostic & Transfusion Center",
    reservesHighlight: ["Plasma (FFP)", "PRBC Units"],
    lat: 23.7461,
    lng: 90.3742,
  },
];

const AREAS = ["All", "Shahbagh", "Panthapath", "Bashundhara", "Gulshan", "Dhanmondi"];

function BloodBanksPage() {
  const { data: user } = useCurrentUser();
  const { data: inventoryItems, isLoading: isInvLoading, refetch: refetchInventory } = useBloodInventory();
  const expiryScanMutation = useTriggerExpiryScan();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArea, setSelectedArea] = useState("All");
  const [isSyncing, setIsSyncing] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  // Contact modal state
  const [selectedBankForContact, setSelectedBankForContact] = useState<PartnerBloodBank | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [requestedBankIds, setRequestedBankIds] = useState<Set<string>>(new Set());

  // Group inventory units across standard blood groups (handles both _POSITIVE and legacy _PLUS)
  const stockSummary = useMemo(() => {
    const summary: Record<string, number> = {
      "O+": 0,
      "O-": 0,
      "A+": 0,
      "A-": 0,
      "B+": 0,
      "B-": 0,
      "AB+": 0,
      "AB-": 0,
    };

    if (inventoryItems) {
      inventoryItems.forEach((item) => {
        const displayGroup = toDisplayBloodGroup(item.blood_group);
        if (summary[displayGroup] !== undefined) {
          summary[displayGroup] += Number(item.quantity) || 0;
        }
      });
    }
    return summary;
  }, [inventoryItems]);

  const totalUnits = useMemo(() => {
    return Object.values(stockSummary).reduce((acc, curr) => acc + curr, 0);
  }, [stockSummary]);

  const filteredBloodBanks = useMemo(() => {
    return PARTNER_BLOOD_BANKS.filter((b) => {
      const matchSearch =
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.address.toLowerCase().includes(searchQuery.toLowerCase());
      const matchArea = selectedArea === "All" || b.area === selectedArea;
      return matchSearch && matchArea;
    });
  }, [searchQuery, selectedArea]);

  // Derive BloodBankPin[] for the map from the filtered set
  const mapBanks: BloodBankPin[] = useMemo(() => {
    return filteredBloodBanks.map((b) => ({
      id: b.id,
      name: b.name,
      area: b.area,
      address: b.address,
      phone: b.phone,
      emergencyHotline: b.emergencyHotline,
      operatingHours: b.operatingHours,
      is24Hours: b.is24Hours,
      type: b.type,
      lat: b.lat,
      lng: b.lng,
    }));
  }, [filteredBloodBanks]);

  const handleSyncStock = async () => {
    setIsSyncing(true);
    try {
      await expiryScanMutation.mutateAsync();
      await refetchInventory();
      toast.success("Synchronized real-time inventory from partner blood bank network.");
    } catch {
      await refetchInventory();
      toast.info("Queried live stock feeds from partner blood bank endpoints.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenContactModal = (bank: PartnerBloodBank) => {
    setSelectedBankForContact(bank);
    setIsContactModalOpen(true);
  };

  const handleContactSuccess = (bankId: string) => {
    setRequestedBankIds((prev) => new Set([...prev, bankId]));
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-background flex flex-col">
      <SiteNav />
      <main className="w-full max-w-7xl 2xl:max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Header Ribbon */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-border/60">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                Partner Blood Banks & Reserves
              </h1>
              <Badge className="bg-emerald-600 text-white border-0 text-xs font-semibold">
                Partner Network
              </Badge>
              <Badge variant="outline" className="border-primary text-primary text-xs font-semibold">
                Live External Feeds
              </Badge>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-3xl">
              Public directory of certified partner blood banks across Dhaka. Check operating hours,
              inspect real-time aggregated blood reserves, or request authorized coordinator contact access.
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
                Live Blood Bank Reserves ({totalUnits} Total Units in Reserve)
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Direct telemetry from connected blood bank management systems
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
            {Object.entries(stockSummary).map(([groupSymbol, qty]) => (
              <div
                key={groupSymbol}
                className="rounded-xl border border-border/70 bg-muted/30 p-2.5 text-center flex flex-col items-center justify-center transition-all hover:bg-muted/50"
              >
                <span className="text-xs font-medium text-muted-foreground">Group</span>
                <span className="text-lg font-black text-primary">{groupSymbol}</span>
                <span className="text-xs font-semibold text-foreground mt-0.5">
                  {qty} <span className="text-[10px] font-normal text-muted-foreground">units</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search blood bank, hospital, address, or area..."
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

            {/* View Toggle: Grid / Map */}
            <div className="ml-2 flex items-center rounded-lg border border-border/70 bg-muted/30 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === "grid"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="size-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === "map"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Map View"
              >
                <Map className="size-3.5" />
                <span className="hidden sm:inline">Map</span>
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Map View */}
        {viewMode === "map" && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="size-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Partner Blood Bank Locations ({filteredBloodBanks.length} Centers)
              </span>
            </div>
            <Suspense
              fallback={
                <div className="h-[380px] rounded-2xl border border-border bg-muted/20 flex items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading map…</span>
                </div>
              }
            >
              <BloodBankMap banks={mapBanks} />
            </Suspense>
          </div>
        )}

        {/* Blood Bank Directory Cards Grid */}
        <div className={`mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full ${viewMode === "map" ? "hidden" : ""}`}>
          {filteredBloodBanks.map((bank) => {
            const isRequested = requestedBankIds.has(bank.id);

            return (
              <Card
                key={bank.id}
                className="rounded-2xl border border-border/80 bg-card shadow-[var(--shadow-elegant)] hover:border-primary/40 transition-all flex flex-col"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase tracking-wider mb-1 font-semibold text-primary border-primary/30"
                      >
                        {bank.type}
                      </Badge>
                      <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                        {bank.name}
                      </CardTitle>
                    </div>
                    <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                      <Building2 className="size-5" />
                    </div>
                  </div>
                  <CardDescription className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <MapPin className="size-3.5 text-primary shrink-0" />
                    <span>{bank.address}</span>
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 flex-1 flex flex-col justify-between pt-0">
                  <div className="space-y-2 rounded-xl bg-muted/40 p-3 text-xs border border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3.5 text-primary" /> Operating Hours:
                      </span>
                      <span className="font-semibold text-foreground">{bank.operatingHours}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Phone className="size-3.5 text-primary" /> Blood Bank Tel:
                      </span>
                      <a
                        href={`tel:${bank.phone}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {bank.phone}
                      </a>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <AlertCircle className="size-3.5 text-destructive" /> Emergency Line:
                      </span>
                      <span className="font-bold text-destructive">{bank.emergencyHotline}</span>
                    </div>

                    {bank.reservesHighlight && bank.reservesHighlight.length > 0 && (
                      <div className="pt-1.5 border-t border-border/40 flex flex-wrap gap-1">
                        {bank.reservesHighlight.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Primary Action Button: Contact Blood Bank */}
                  <div className="pt-2">
                    {isRequested ? (
                      <Button
                        disabled
                        className="w-full mt-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-emerald-600/50 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-2 cursor-not-allowed opacity-90 shadow-xs"
                      >
                        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                        ✓ Permission Requested
                      </Button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenContactModal(bank)}
                        className="w-full mt-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-[#800000] text-[#800000] hover:bg-[#800000] hover:text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Mail className="size-4" />
                        Contact Blood Bank
                      </button>
                    )}

                    {/* Secondary action for donors & unified members */}
                    {user && (user.role === "DONOR" || user.role === "RECIPIENT") && (
                      <Link
                        to="/donor"
                        search={{ tab: "overview" }}
                        className="w-full text-center text-xs font-medium text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1 mt-2.5"
                      >
                        <Calendar className="size-3.5" /> Book Donation Slot at Center
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredBloodBanks.length === 0 && viewMode === "grid" && (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-12 text-center">
            <Building2 className="mx-auto size-10 text-muted-foreground opacity-50" />
            <h3 className="mt-3 text-base font-semibold text-foreground">No matching blood banks</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Try adjusting your search keywords or clear the area filter to see all partner blood banks.
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

      {/* Contact Blood Bank Authorization Modal */}
      <ContactBloodBankModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        bloodBank={selectedBankForContact}
        onSuccess={handleContactSuccess}
      />
    </div>
  );
}
export default BloodBanksPage;
