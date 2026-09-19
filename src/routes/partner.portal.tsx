import { createFileRoute, useSearch, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  Activity,
  Boxes,
  Radio,
  Building2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Plus,
  Minus,
  Clock,
  ShieldAlert,
  Trash2,
  Send,
  Save,
  MapPin,
  Phone,
  Mail,
  FileBadge,
  Sparkles,
  Layers,
  AlertCircle,
  Calendar,
  Users,
  Target,
  ExternalLink,
  Megaphone,
} from "lucide-react";
import { PartnerLayout } from "@/components/partner/PartnerLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CANONICAL_BLOOD_GROUPS,
  type CanonicalBloodGroup,
  type PartnerFacilityProfile,
  type PartnerInventoryMatrix,
  type PartnerBloodNeed,
  type NeedUrgency,
  type NeedStatus,
  type EventResponse,
  type DonationEventCreate,
} from "@/lib/api/types";
import {
  partnerPortalService,
  DEFAULT_PARTNER_PROFILE,
  DEFAULT_PARTNER_MATRIX,
  DEFAULT_PARTNER_NEEDS,
  DEFAULT_PARTNER_EVENTS,
  PRESET_PARTNER_PROFILES,
} from "@/lib/api/partner";
import { formatBloodGroup } from "@/lib/formatters";
import { toast } from "sonner";

export const Route = createFileRoute("/partner/portal")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { tab?: "inventory" | "needs" | "profile" | "events" } => ({
    tab:
      search["tab"] === "needs"
        ? "needs"
        : search["tab"] === "profile"
          ? "profile"
          : search["tab"] === "events"
            ? "events"
            : "inventory",
  }),
  head: () => ({
    meta: [
      { title: "Partner Blood Bank Console — LifeDrop" },
      {
        name: "description",
        content: "Institutional B2B blood bank portal for reserve sync, deficit broadcast, and drive management.",
      },
    ],
  }),
  component: PartnerPortalPage,
});

const DHAKA_AREAS = [
  "Panthapath",
  "Shahbagh",
  "Dhanmondi",
  "Gulshan",
  "Banani",
  "Mohakhali",
  "Bashundhara",
  "Mirpur",
  "Uttara",
  "Mohammadpur",
  "Motijheel",
  "Tejgaon",
];

const BLOOD_COMPONENTS = [
  "Whole Blood",
  "Packed Red Blood Cells (PRBC)",
  "Platelets / Apheresis",
  "Fresh Frozen Plasma (FFP)",
  "Cryoprecipitate",
];

export function PartnerPortalPage() {
  const search = useSearch({ from: "/partner/portal" });
  const navigate = useNavigate();
  const currentTab = search.tab ?? "inventory";

  // Data states
  const [profile, setProfile] = useState<PartnerFacilityProfile>(DEFAULT_PARTNER_PROFILE);
  const [matrix, setMatrix] = useState<PartnerInventoryMatrix>(DEFAULT_PARTNER_MATRIX);
  const [needs, setNeeds] = useState<PartnerBloodNeed[]>(DEFAULT_PARTNER_NEEDS);
  const [events, setEvents] = useState<EventResponse[]>(DEFAULT_PARTNER_EVENTS);
  const [lastSynced, setLastSynced] = useState<string>("Just now");

  // Facility Switcher state
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("square");

  // Loading & interactive states
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isPublishingEvent, setIsPublishingEvent] = useState(false);

  // Demand form state
  const [needGroup, setNeedGroup] = useState<CanonicalBloodGroup>("O-");
  const [needComponent, setNeedComponent] = useState<string>("Whole Blood");
  const [needUnits, setNeedUnits] = useState<string>("3");
  const [needUrgency, setNeedUrgency] = useState<NeedUrgency>("CRITICAL_ICU");
  const [needReason, setNeedReason] = useState<string>("");
  const [needDeadline, setNeedDeadline] = useState<string>("Within 4 Hours");

  // Blood Drive / Event Form State
  const [eventTitle, setEventTitle] = useState("");
  const [eventCategory, setEventCategory] = useState<"HOSPITAL" | "NGO">("HOSPITAL");
  const [eventLocation, setEventLocation] = useState("Square Hospital Main Transfusion Center, Panthapath, Dhaka");
  const [eventStartDate, setEventStartDate] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  );
  const [eventEndDate, setEventEndDate] = useState(
    new Date(Date.now() + 259200000).toISOString().slice(0, 10),
  );
  const [eventTargetUnits, setEventTargetUnits] = useState("150");
  const [eventContact, setEventContact] = useState("+880 2 8159457");
  const [eventDescription, setEventDescription] = useState("");
  const [eventFocusGroups, setEventFocusGroups] = useState<string[]>(["O-", "B-", "Platelets"]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [loadedProfile, loadedInv, loadedNeeds, loadedEvents] = await Promise.all([
        partnerPortalService.fetchBankProfile(),
        partnerPortalService.fetchBankInventory(),
        partnerPortalService.fetchBloodNeeds(),
        partnerPortalService.fetchEvents(),
      ]);
      if (mounted) {
        setProfile(loadedProfile);
        setMatrix(loadedInv.inventory);
        setLastSynced(loadedInv.last_synced);
        setNeeds(loadedNeeds);
        setEvents(loadedEvents);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Summary tallies
  const inventoryStats = useMemo(() => {
    let totalUnits = 0;
    let criticalCount = 0;
    let lowCount = 0;
    let healthyCount = 0;

    Object.entries(matrix).forEach(([_, reserve]) => {
      const groupTotal = reserve.whole_blood + reserve.platelets + reserve.plasma;
      totalUnits += groupTotal;
      if (groupTotal < 3) criticalCount++;
      else if (groupTotal <= 8) lowCount++;
      else healthyCount++;
    });

    return { totalUnits, criticalCount, lowCount, healthyCount };
  }, [matrix]);

  // Stepper handlers
  const handleUpdateUnits = (
    group: CanonicalBloodGroup,
    field: "whole_blood" | "platelets" | "plasma",
    delta: number,
  ) => {
    setMatrix((prev) => {
      const currentVal = prev[group]?.[field] ?? 0;
      const newVal = Math.max(0, currentVal + delta);
      return {
        ...prev,
        [group]: {
          ...prev[group],
          [field]: newVal,
        },
      };
    });
  };

  const handleDirectInput = (
    group: CanonicalBloodGroup,
    field: "whole_blood" | "platelets" | "plasma",
    valStr: string,
  ) => {
    const num = Math.max(0, parseInt(valStr, 10) || 0);
    setMatrix((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [field]: num,
      },
    }));
  };

  // Sync Inventory Matrix
  const handleSyncInventory = async () => {
    setIsSyncing(true);
    try {
      const res = await partnerPortalService.syncBankInventory(profile.facility_id, matrix);
      setLastSynced(res.last_synced);
      toast.success("Real-time blood reserves synchronized with Central LifeDrop Registry.");
    } catch {
      toast.error("Failed to sync inventory.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Broadcast Demand
  const handleCreateNeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!needUnits || Number(needUnits) <= 0) {
      toast.error("Please specify a valid quantity of units required.");
      return;
    }
    if (!needReason.trim()) {
      toast.error("Please specify the department or clinical reason for this shortage.");
      return;
    }

    setIsBroadcasting(true);
    try {
      const created = await partnerPortalService.broadcastBloodNeed(profile.facility_id, {
        blood_group: needGroup,
        component: needComponent,
        required_units: Number(needUnits),
        urgency: needUrgency,
        clinical_reason: needReason.trim(),
        deadline: needDeadline,
      });

      setNeeds((prev) => [created, ...prev]);
      setNeedReason("");
      setNeedUnits("2");
      toast.success(`Deficit alert broadcasted for ${created.required_units} units of ${created.blood_group}.`);
    } catch {
      toast.error("Failed to broadcast deficit alert.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleToggleNeedStatus = async (needId: string, newStatus: NeedStatus) => {
    try {
      const updated = await partnerPortalService.updateBloodNeedStatus(
        profile.facility_id,
        needId,
        newStatus,
      );
      setNeeds((prev) => prev.map((n) => (n.id === needId ? updated : n)));
      toast.info(`Shortage alert marked as ${newStatus}.`);
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const handleDeleteNeed = async (needId: string) => {
    try {
      await partnerPortalService.deleteBloodNeed(profile.facility_id, needId);
      setNeeds((prev) => prev.filter((n) => n.id !== needId));
      toast.success("Shortage alert removed from public discovery.");
    } catch {
      toast.error("Failed to remove alert.");
    }
  };

  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const updated = await partnerPortalService.updateBankProfile(profile.facility_id, profile);
      setProfile(updated);
      toast.success("Facility institutional credentials and emergency lines saved successfully.");
    } catch {
      toast.error("Failed to save facility profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Facility Switcher Handler
  const handleSwitchFacility = (newId: string) => {
    setSelectedFacilityId(newId);
    const targetPreset = PRESET_PARTNER_PROFILES[newId];
    if (targetPreset) {
      setProfile(targetPreset);
      const isNgo = newId === "red_crescent" || newId === "quantum";
      setEventCategory(isNgo ? "NGO" : "HOSPITAL");
      setEventContact(targetPreset.hotline.split("/")[0]?.trim() || "");
      setEventLocation(targetPreset.address);
      toast.success(`Active Facility: ${targetPreset.facility_name}`);
    }
  };

  // Publish Event Handler
  const handlePublishEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) {
      toast.error("Please enter a campaign title");
      return;
    }
    setIsPublishingEvent(true);
    try {
      const created = await partnerPortalService.publishEvent(selectedFacilityId, {
        title: eventTitle,
        description:
          eventDescription ||
          `Voluntary blood donation drive organized by ${profile.facility_name}. Safe blood collection, medical screening, and donor certificate provided on site.`,
        location: eventLocation || profile.address,
        start_date: new Date(eventStartDate).toISOString(),
        end_date: new Date(eventEndDate).toISOString(),
        organizer_name: profile.facility_name,
        organizer_type: eventCategory,
        target_units: parseInt(eventTargetUnits, 10) || 100,
        contact_phone: eventContact || profile.hotline,
        focus_blood_groups: eventFocusGroups,
      });

      setEvents((prev) => [created, ...prev.filter((item) => item.event_id !== created.event_id)]);
      toast.success("Blood Drive Published! Automatically synced with public /events registry.");
      setEventTitle("");
      setEventDescription("");
    } catch {
      toast.error("Failed to publish event.");
    } finally {
      setIsPublishingEvent(false);
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    partnerPortalService.deleteEventLocally(eventId);
    setEvents((prev) => prev.filter((item) => item.event_id !== eventId));
    toast.info("Campaign removed from registry.");
  };

  const toggleEventFocusGroup = (group: string) => {
    setEventFocusGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group],
    );
  };

  const facilitySelector = (
    <div className="flex items-center gap-1.5">
      <Building2 className="size-3.5 text-teal-400 hidden sm:inline" />
      <Select value={selectedFacilityId} onValueChange={handleSwitchFacility}>
        <SelectTrigger className="h-8 bg-slate-900 border-slate-700 text-xs text-white max-w-[210px] sm:max-w-[260px] truncate font-medium">
          <SelectValue placeholder="Switch Facility" />
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-700 text-white">
          <SelectItem value="square">🏥 Square Hospital Blood Bank</SelectItem>
          <SelectItem value="red_crescent">🩸 Red Crescent Society (BDRCS)</SelectItem>
          <SelectItem value="dmch">🏥 Dhaka Medical College (DMCH)</SelectItem>
          <SelectItem value="quantum">🩸 Quantum Foundation Blood Lab</SelectItem>
          <SelectItem value="evercare">🏥 Evercare Hospital Blood Bank</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <PartnerLayout
      activeTab={currentTab}
      facilityName={profile.facility_name}
      licenseId={profile.license_id}
      facilitySelector={facilitySelector}
    >
      {/* ========================================================================= */}
      {/* TAB 1: LIVE BLOOD RESERVE / STOCK UPDATER (MATRIX GRID)                  */}
      {/* ========================================================================= */}
      {currentTab === "inventory" && (
        <div className="space-y-6">
          {/* Top Bar Summary & Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <Boxes className="size-5 text-teal-400" />
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Live Blood Reserve Matrix
                </h2>
                <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-[11px]">
                  Institutional Grid
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Update available units across all 8 standard blood groups during shift handovers.
                Changes instantly synchronize with central blood dispatch algorithms.
              </p>
              <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                <Clock className="size-3.5 text-teal-400" />
                <span>Last synced with Central LifeDrop Registry: </span>
                <span className="font-semibold text-slate-200">{lastSynced}</span>
              </div>
            </div>

            {/* Quick Tallies & Primary Action */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl bg-slate-950 border border-slate-800 p-2.5 px-3.5 text-xs">
                <div className="text-center">
                  <div className="text-[10px] uppercase text-slate-400 font-semibold">Total Reserve</div>
                  <div className="text-base font-bold text-white">{inventoryStats.totalUnits} <span className="text-[10px] text-slate-400 font-normal">units</span></div>
                </div>
                <div className="h-6 w-px bg-slate-800 mx-1" />
                <div className="text-center">
                  <div className="text-[10px] uppercase text-rose-400 font-semibold">Critical</div>
                  <div className="text-base font-bold text-rose-400">{inventoryStats.criticalCount}</div>
                </div>
                <div className="h-6 w-px bg-slate-800 mx-1" />
                <div className="text-center">
                  <div className="text-[10px] uppercase text-amber-400 font-semibold">Low</div>
                  <div className="text-base font-bold text-amber-400">{inventoryStats.lowCount}</div>
                </div>
                <div className="h-6 w-px bg-slate-800 mx-1" />
                <div className="text-center">
                  <div className="text-[10px] uppercase text-emerald-400 font-semibold">Healthy</div>
                  <div className="text-base font-bold text-emerald-400">{inventoryStats.healthyCount}</div>
                </div>
              </div>

              <Button
                onClick={handleSyncInventory}
                disabled={isSyncing}
                className="bg-teal-600 hover:bg-teal-500 text-white font-semibold gap-2 rounded-xl px-5 h-11 shadow-sm transition-all"
              >
                <RefreshCw className={`size-4 ${isSyncing ? "animate-spin" : ""}`} />
                <span>{isSyncing ? "Syncing Registry..." : "Sync Reserves to LifeDrop Network"}</span>
              </Button>
            </div>
          </div>

          {/* 8-Group Matrix Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
            {CANONICAL_BLOOD_GROUPS.map((group) => {
              const reserve = matrix[group] || { whole_blood: 0, platelets: 0, plasma: 0 };
              const groupTotal = reserve.whole_blood + reserve.platelets + reserve.plasma;

              // Badge calculation: <3 Critical, 3-8 Low, >8 Healthy
              const isCritical = groupTotal < 3;
              const isLow = groupTotal >= 3 && groupTotal <= 8;
              const isHealthy = groupTotal > 8;

              return (
                <Card
                  key={group}
                  className={`border transition-all rounded-2xl bg-slate-900/70 shadow-sm ${
                    isCritical
                      ? "border-rose-500/50 hover:border-rose-400/80"
                      : isLow
                        ? "border-amber-500/40 hover:border-amber-400/70"
                        : "border-slate-800 hover:border-teal-500/40"
                  }`}
                >
                  <CardHeader className="p-4 pb-3 border-b border-slate-800/80 bg-slate-900/90">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-white tracking-tight">
                          {formatBloodGroup(group, "symbol")}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {formatBloodGroup(group, "full")}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-200">
                        {groupTotal} <span className="text-[10px] text-slate-400 font-normal">units</span>
                      </span>
                    </div>

                    {/* Auto-Calculated Dynamic Badge */}
                    <div className="mt-2">
                      {isCritical && (
                        <Badge className="bg-rose-500/15 border-rose-500/40 text-rose-400 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5">
                          CRITICAL SHORTAGE (&lt;3)
                        </Badge>
                      )}
                      {isLow && (
                        <Badge className="bg-amber-500/15 border-amber-500/40 text-amber-400 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5">
                          LOW RESERVE (3-8)
                        </Badge>
                      )}
                      {isHealthy && (
                        <Badge className="bg-emerald-500/15 border-emerald-500/40 text-emerald-400 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5">
                          HEALTHY STOCK (&gt;8)
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3.5">
                    {/* Row 1: Whole Blood */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">Whole Blood</span>
                        <span className="text-slate-400 font-mono text-[11px]">{reserve.whole_blood} units</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateUnits(group, "whole_blood", -1)}
                          className="size-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors border border-slate-700"
                          title="Decrease whole blood units"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <Input
                          type="number"
                          min={0}
                          value={reserve.whole_blood}
                          onChange={(e) => handleDirectInput(group, "whole_blood", e.target.value)}
                          className="h-8 text-center font-bold text-sm bg-slate-950 border-slate-800 text-white rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateUnits(group, "whole_blood", 1)}
                          className="size-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors border border-slate-700"
                          title="Increase whole blood units"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Row 2: Platelets / PRBC */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">Platelets / PRBC</span>
                        <span className="text-slate-400 font-mono text-[11px]">{reserve.platelets} units</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateUnits(group, "platelets", -1)}
                          className="size-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors border border-slate-700"
                          title="Decrease platelets"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <Input
                          type="number"
                          min={0}
                          value={reserve.platelets}
                          onChange={(e) => handleDirectInput(group, "platelets", e.target.value)}
                          className="h-8 text-center font-bold text-sm bg-slate-950 border-slate-800 text-white rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateUnits(group, "platelets", 1)}
                          className="size-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors border border-slate-700"
                          title="Increase platelets"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Row 3: Fresh Frozen Plasma */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">Fresh Frozen Plasma (FFP)</span>
                        <span className="text-slate-400 font-mono text-[11px]">{reserve.plasma} units</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateUnits(group, "plasma", -1)}
                          className="size-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors border border-slate-700"
                          title="Decrease plasma"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <Input
                          type="number"
                          min={0}
                          value={reserve.plasma}
                          onChange={(e) => handleDirectInput(group, "plasma", e.target.value)}
                          className="h-8 text-center font-bold text-sm bg-slate-950 border-slate-800 text-white rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateUnits(group, "plasma", 1)}
                          className="size-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors border border-slate-700"
                          title="Increase plasma"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DEMAND BROADCAST (URGENT BLOOD NEEDS & SHORTAGE ALERTS)            */}
      {/* ========================================================================= */}
      {currentTab === "needs" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Create Need Broadcast Form (5 cols) */}
            <div className="lg:col-span-5">
              <Card className="border-slate-800 bg-slate-900/90 rounded-2xl shadow-sm">
                <CardHeader className="border-b border-slate-800/80 p-5">
                  <div className="flex items-center gap-2 text-teal-400">
                    <Radio className="size-5 animate-pulse" />
                    <CardTitle className="text-lg font-bold text-white">
                      Broadcast Emergency Deficit
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs text-slate-400 mt-1">
                    Trigger prioritized donor discovery and recipient matching across the LifeDrop
                    public mobile and web network.
                  </CardDescription>
                </CardHeader>

                <form onSubmit={handleCreateNeed} className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-300">Blood Group</Label>
                      <Select
                        value={needGroup}
                        onValueChange={(v) => setNeedGroup(v as CanonicalBloodGroup)}
                      >
                        <SelectTrigger className="h-10 bg-slate-950 border-slate-800 text-white rounded-xl">
                          <SelectValue placeholder="Select Group" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                          {CANONICAL_BLOOD_GROUPS.map((g) => (
                            <SelectItem key={g} value={g}>
                              {formatBloodGroup(g, "symbol")} ({formatBloodGroup(g, "full")})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-300">Required Units</Label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={needUnits}
                        onChange={(e) => setNeedUnits(e.target.value)}
                        className="h-10 bg-slate-950 border-slate-800 text-white font-bold rounded-xl"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">Component Required</Label>
                    <Select value={needComponent} onValueChange={setNeedComponent}>
                      <SelectTrigger className="h-10 bg-slate-950 border-slate-800 text-white rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                        {BLOOD_COMPONENTS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Urgency Radio Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">Urgency Level</Label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setNeedUrgency("URGENT")}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          needUrgency === "URGENT"
                            ? "border-amber-500 bg-amber-950/30 text-amber-300"
                            : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <div className="font-bold text-xs">Urgent</div>
                        <div className="text-[10px] opacity-80 mt-0.5">Need within 12 hours</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setNeedUrgency("CRITICAL_ICU")}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          needUrgency === "CRITICAL_ICU"
                            ? "border-rose-500 bg-rose-950/40 text-rose-300"
                            : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <div className="font-bold text-xs flex items-center gap-1">
                          <AlertCircle className="size-3 text-rose-400" />
                          Critical ICU
                        </div>
                        <div className="text-[10px] opacity-80 mt-0.5">Immediate surgery standby</div>
                      </button>
                    </div>
                  </div>

                  {/* Clinical Reason */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">
                      Target Department / Clinical Reason
                    </Label>
                    <Textarea
                      value={needReason}
                      onChange={(e) => setNeedReason(e.target.value)}
                      placeholder="e.g., Thalassemia patient urgent protocol or Emergency OT ICU standby..."
                      rows={3}
                      className="bg-slate-950 border-slate-800 text-white rounded-xl resize-none text-xs placeholder:text-slate-600"
                      required
                    />
                  </div>

                  {/* Deadline Quick Pills */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">Required By / Deadline</Label>
                    <div className="flex flex-wrap gap-2">
                      {["Within 4 Hours", "Within 12 Hours", "Within 24 Hours"].map((dl) => (
                        <button
                          key={dl}
                          type="button"
                          onClick={() => setNeedDeadline(dl)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            needDeadline === dl
                              ? "border-teal-500 bg-teal-500/20 text-teal-300"
                              : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {dl}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isBroadcasting}
                    className="w-full h-11 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl gap-2 mt-2 shadow-sm transition-all"
                  >
                    <Send className="size-4" />
                    <span>{isBroadcasting ? "Broadcasting to Network..." : "Broadcast Deficit to Network"}</span>
                  </Button>
                </form>
              </Card>
            </div>

            {/* Right: Active Demands Table (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-white">Active Facility Broadcasts</h3>
                  <p className="text-xs text-slate-400">
                    Live deficit calls disseminated to verified donors and emergency dispatchers.
                  </p>
                </div>
                <Badge className="bg-slate-800 text-slate-300 border-slate-700">
                  {needs.length} Total Alerts
                </Badge>
              </div>

              {needs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
                  <Radio className="mx-auto size-8 text-slate-600 opacity-50" />
                  <h4 className="mt-3 text-sm font-semibold text-slate-300">No active shortage alerts</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Your facility blood reserves are balanced. Use the broadcast form if an emergency deficit arises.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {needs.map((item) => {
                    const isFulfilled = item.status === "FULFILLED";
                    const isCancelled = item.status === "CANCELLED";

                    return (
                      <Card
                        key={item.id}
                        className={`border transition-all rounded-2xl bg-slate-900/80 p-4 ${
                          isFulfilled
                            ? "border-emerald-500/30 bg-emerald-950/10 opacity-75"
                            : isCancelled
                              ? "border-slate-800 bg-slate-950/60 opacity-60"
                              : item.urgency === "CRITICAL_ICU"
                                ? "border-rose-500/40 bg-rose-950/15"
                                : "border-slate-800"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-lg font-black text-white">
                                {formatBloodGroup(item.blood_group, "symbol")}
                              </span>
                              <span className="text-xs font-semibold text-teal-400">
                                {item.required_units} Units • {item.component}
                              </span>
                              {item.urgency === "CRITICAL_ICU" ? (
                                <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[10px] font-bold">
                                  CRITICAL ICU
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-bold">
                                  URGENT
                                </Badge>
                              )}

                              <Badge
                                variant="outline"
                                className={`text-[10px] font-mono ${
                                  item.status === "ACTIVE"
                                    ? "border-teal-500/40 text-teal-400 bg-teal-950/40"
                                    : item.status === "FULFILLED"
                                      ? "border-emerald-500/40 text-emerald-400 bg-emerald-950/40"
                                      : "border-slate-700 text-slate-500"
                                }`}
                              >
                                {item.status}
                              </Badge>
                            </div>

                            <p className="text-xs text-slate-300 line-clamp-2">
                              {item.clinical_reason}
                            </p>

                            <div className="flex items-center gap-3 text-[11px] text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock className="size-3 text-slate-400" /> {item.deadline}
                              </span>
                              <span>•</span>
                              <span>
                                Broadcasted {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>

                          {/* Action controls */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {item.status === "ACTIVE" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleNeedStatus(item.id, "FULFILLED")}
                                className="h-8 text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/50 rounded-xl"
                              >
                                <CheckCircle2 className="size-3.5 mr-1" /> Mark Fulfilled
                              </Button>
                            )}

                            {item.status === "FULFILLED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleNeedStatus(item.id, "ACTIVE")}
                                className="h-8 text-xs border-slate-700 text-slate-400 hover:bg-slate-800 rounded-xl"
                              >
                                Re-activate
                              </Button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteNeed(item.id)}
                              className="size-8 rounded-xl border border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-950/30 flex items-center justify-center transition-colors"
                              title="Delete alert"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BLOOD BANK PROFILE & FACILITY DETAILS                              */}
      {/* ========================================================================= */}
      {currentTab === "profile" && (
        <div className="max-w-4xl mx-auto">
          <Card className="border-slate-800 bg-slate-900/90 rounded-2xl shadow-sm overflow-hidden">
            <CardHeader className="border-b border-slate-800/80 p-6 bg-slate-900/95">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
                  <FileBadge className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-white">
                    Facility Credentials & Institutional Profile
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400 mt-0.5">
                    Official Directorate General of Health Services (DGHS) registration and emergency dispatch coordinates.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-6">
              {/* Section 1: Official Identifiers */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 mb-3 flex items-center gap-1.5">
                  <Building2 className="size-3.5" /> Institutional Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">Facility Name</Label>
                    <Input
                      value={profile.facility_name}
                      onChange={(e) => setProfile({ ...profile, facility_name: e.target.value })}
                      className="bg-slate-950 border-slate-800 text-white rounded-xl text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">
                      DGHS License / Registration ID
                    </Label>
                    <Input
                      value={profile.license_id}
                      onChange={(e) => setProfile({ ...profile, license_id: e.target.value })}
                      className="bg-slate-950 border-slate-800 text-white rounded-xl text-sm font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Geographic Coordinates & Zone */}
              <div className="pt-2 border-t border-slate-800/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 mb-3 flex items-center gap-1.5">
                  <MapPin className="size-3.5" /> Geographic Location & Zone
                </h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-300">Physical Address</Label>
                      <Input
                        value={profile.address}
                        onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                        className="bg-slate-950 border-slate-800 text-white rounded-xl text-sm"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-300">Dhaka Area / Zone</Label>
                      <Select
                        value={profile.area}
                        onValueChange={(val) => setProfile({ ...profile, area: val })}
                      >
                        <SelectTrigger className="bg-slate-950 border-slate-800 text-white rounded-xl text-sm">
                          <SelectValue placeholder="Select Area" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                          {DHAKA_AREAS.map((a) => (
                            <SelectItem key={a} value={a}>
                              {a}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-300">Latitude (GPS)</Label>
                      <Input
                        type="number"
                        step="any"
                        value={profile.latitude}
                        onChange={(e) => setProfile({ ...profile, latitude: parseFloat(e.target.value) || 0 })}
                        className="bg-slate-950 border-slate-800 text-white rounded-xl text-sm font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-300">Longitude (GPS)</Label>
                      <Input
                        type="number"
                        step="any"
                        value={profile.longitude}
                        onChange={(e) => setProfile({ ...profile, longitude: parseFloat(e.target.value) || 0 })}
                        className="bg-slate-950 border-slate-800 text-white rounded-xl text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Operational Timings */}
              <div className="pt-2 border-t border-slate-800/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 mb-3 flex items-center gap-1.5">
                  <Clock className="size-3.5" /> Operational Protocol
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-semibold text-slate-200">24/7 Transfusion Service</Label>
                      <p className="text-[11px] text-slate-400">Continuous emergency OT operations</p>
                    </div>
                    <Switch
                      checked={profile.is_24_hours}
                      onCheckedChange={(checked) => setProfile({ ...profile, is_24_hours: checked })}
                      className="data-[state=checked]:bg-teal-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">Standard Operating Hours</Label>
                    <Input
                      value={profile.operating_hours}
                      onChange={(e) => setProfile({ ...profile, operating_hours: e.target.value })}
                      className="bg-slate-950 border-slate-800 text-white rounded-xl text-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Emergency Dispatch Contact */}
              <div className="pt-2 border-t border-slate-800/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 mb-3 flex items-center gap-1.5">
                  <Phone className="size-3.5" /> Emergency Dispatch & Hotline
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">24h Emergency Hotline</Label>
                    <Input
                      value={profile.hotline}
                      onChange={(e) => setProfile({ ...profile, hotline: e.target.value })}
                      className="bg-slate-950 border-slate-800 text-white rounded-xl text-sm font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">Duty Officer / Lead Doctor</Label>
                    <Input
                      value={profile.duty_officer}
                      onChange={(e) => setProfile({ ...profile, duty_officer: e.target.value })}
                      className="bg-slate-950 border-slate-800 text-white rounded-xl text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">Official Dispatch Email</Label>
                    <Input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="bg-slate-950 border-slate-800 text-white rounded-xl text-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex justify-end">
                <Button
                  type="submit"
                  disabled={isSavingProfile}
                  className="bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl px-6 h-11 gap-2 shadow-sm transition-all"
                >
                  <Save className="size-4" />
                  <span>{isSavingProfile ? "Saving Credentials..." : "Save Facility Profile"}</span>
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DRIVES & CAMPAIGNS (AUTO-SYNCED TO CENTRAL /events REGISTRY)      */}
      {/* ========================================================================= */}
      {currentTab === "events" && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-teal-950/50 via-slate-900 to-slate-900 border border-teal-500/20 shadow-md">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-[10px] font-mono uppercase tracking-wider">
                  Automated Public Sync
                </Badge>
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">• Central LifeDrop Dispatch</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1.5 flex items-center gap-2">
                <Calendar className="size-6 text-teal-400" />
                Blood Donation Drives & Public Campaigns
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
                Events created by partner blood banks and humanitarian NGOs (e.g. Bangladesh Red Crescent Society, Quantum Foundation) are automatically published to the consumer <code className="text-teal-300 font-mono text-xs">/events</code> registry and central alerts.
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Link
                to="/events"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm"
              >
                <span>View Public Registry</span>
                <ExternalLink className="size-3.5 text-teal-400" />
              </Link>
            </div>
          </div>

          {/* Quick Stats Tally */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-slate-900/80 border-slate-800 p-4 flex items-center gap-3">
              <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                <Calendar className="size-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{events.length}</div>
                <div className="text-xs text-slate-400">Published Drives in Network</div>
              </div>
            </Card>

            <Card className="bg-slate-900/80 border-slate-800 p-4 flex items-center gap-3">
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Target className="size-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {events.reduce((acc, ev) => acc + (ev.target_units || 0), 0)}
                </div>
                <div className="text-xs text-slate-400">Total Blood Units Target</div>
              </div>
            </Card>

            <Card className="bg-slate-900/80 border-slate-800 p-4 flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Users className="size-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {events.reduce((acc, ev) => acc + (ev.registered_count || 0), 0)}
                </div>
                <div className="text-xs text-slate-400">Community Donor RSVPs</div>
              </div>
            </Card>
          </div>

          {/* Two-Column Layout: Left Form, Right Active List */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Form Column (5 cols) */}
            <div className="xl:col-span-5 space-y-6">
              <Card className="bg-slate-900/90 border-slate-800 shadow-lg">
                <CardHeader className="pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Megaphone className="size-5 text-teal-400" />
                    <CardTitle className="text-base text-white font-bold">
                      Host Community Blood Drive
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs text-slate-400">
                    Publish an upcoming donation camp for your facility or NGO.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <form onSubmit={handlePublishEvent} className="space-y-4">
                    {/* Active Organizing Entity */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Organizing Entity:</span>
                        <Badge
                          variant="outline"
                          className={
                            eventCategory === "NGO"
                              ? "border-rose-500/30 bg-rose-950/40 text-rose-300 text-[10px]"
                              : "border-teal-500/30 bg-teal-950/40 text-teal-300 text-[10px]"
                          }
                        >
                          {eventCategory === "NGO" ? "🩸 NGO / Humanitarian" : "🏥 Hospital Blood Bank"}
                        </Badge>
                      </div>
                      <div className="text-sm font-semibold text-white truncate">
                        {profile.facility_name}
                      </div>
                    </div>

                    {/* Campaign Title */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-300">Campaign / Drive Title</Label>
                      <Input
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        placeholder="e.g., Red Crescent National Blood Donation Drive 2026"
                        className="bg-slate-950 border-slate-800 text-white rounded-xl text-sm"
                        required
                      />
                    </div>

                    {/* Target Units & Category */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-300">Target Blood Units</Label>
                        <Input
                          type="number"
                          min="10"
                          max="2000"
                          value={eventTargetUnits}
                          onChange={(e) => setEventTargetUnits(e.target.value)}
                          className="bg-slate-950 border-slate-800 text-white rounded-xl text-sm font-mono"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-300">Organizer Type</Label>
                        <Select
                          value={eventCategory}
                          onValueChange={(val: "HOSPITAL" | "NGO") => setEventCategory(val)}
                        >
                          <SelectTrigger className="bg-slate-950 border-slate-800 text-white rounded-xl text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            <SelectItem value="HOSPITAL">🏥 Hospital Blood Bank</SelectItem>
                            <SelectItem value="NGO">🩸 NGO (Red Crescent / Quantum)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Venue & Public Contact */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-300">Camp Venue / Location</Label>
                      <Input
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        placeholder="Venue address or hospital transfusion room"
                        className="bg-slate-950 border-slate-800 text-white rounded-xl text-sm"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-300">Public Hotline / Phone</Label>
                      <Input
                        value={eventContact}
                        onChange={(e) => setEventContact(e.target.value)}
                        placeholder="+880 2 48310188"
                        className="bg-slate-950 border-slate-800 text-white rounded-xl text-sm font-mono"
                        required
                      />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-300">Start Date</Label>
                        <Input
                          type="date"
                          value={eventStartDate}
                          onChange={(e) => setEventStartDate(e.target.value)}
                          className="bg-slate-950 border-slate-800 text-white rounded-xl text-xs font-mono"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-300">End Date</Label>
                        <Input
                          type="date"
                          value={eventEndDate}
                          onChange={(e) => setEventEndDate(e.target.value)}
                          className="bg-slate-950 border-slate-800 text-white rounded-xl text-xs font-mono"
                          required
                        />
                      </div>
                    </div>

                    {/* Focus Blood Groups */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-300">Urgent Focus Groups / Components</Label>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+", "Platelets", "Whole Blood"].map((grp) => {
                          const isSelected = eventFocusGroups.includes(grp);
                          return (
                            <button
                              key={grp}
                              type="button"
                              onClick={() => toggleEventFocusGroup(grp)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                                isSelected
                                  ? "bg-teal-500/20 border-teal-500/50 text-teal-300 font-semibold"
                                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              {grp}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Description / Instructions */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-300">Donor Instructions & Free Screenings</Label>
                      <Textarea
                        rows={3}
                        value={eventDescription}
                        onChange={(e) => setEventDescription(e.target.value)}
                        placeholder="e.g., Free 5-parameter screening (HIV, HBV, HCV, Syphilis, Malaria) and donor certificate provided."
                        className="bg-slate-950 border-slate-800 text-white rounded-xl text-xs resize-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isPublishingEvent}
                      className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl h-11 gap-2 shadow-md transition-all mt-2"
                    >
                      <Send className="size-4" />
                      <span>{isPublishingEvent ? "Publishing Drive..." : "Publish Drive to LifeDrop Network"}</span>
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* List Column (7 cols) */}
            <div className="xl:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="size-4 text-teal-400" />
                  Live Published Drives ({events.length})
                </h3>
                <span className="text-xs text-slate-400">Auto-synced with public consumer views</span>
              </div>

              {events.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800">
                  <Calendar className="size-10 mx-auto text-slate-600 mb-3" />
                  <div className="text-sm font-semibold text-slate-300">No active drives posted yet</div>
                  <p className="text-xs text-slate-500 mt-1">
                    Use the form on the left to publish a blood donation camp for your facility or NGO.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {events.map((ev) => (
                    <Card
                      key={ev.event_id}
                      className="bg-slate-900/80 border-slate-800 hover:border-slate-700 transition-all shadow-md overflow-hidden"
                    >
                      <div className="p-4 sm:p-5 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className={
                                  ev.organizer_type === "NGO"
                                    ? "bg-rose-950/40 text-rose-300 border-rose-500/40 text-[10px]"
                                    : "bg-teal-950/40 text-teal-300 border-teal-500/40 text-[10px]"
                                }
                              >
                                {ev.organizer_type === "NGO" ? "🩸 NGO Organizers" : "🏥 Hospital Blood Bank"}
                              </Badge>

                              <Badge
                                className={
                                  ev.status === "ONGOING"
                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]"
                                    : "bg-blue-500/20 text-blue-300 border-blue-500/40 text-[10px]"
                                }
                              >
                                {ev.status}
                              </Badge>
                            </div>

                            <h4 className="text-base font-bold text-white mt-1.5 leading-snug">
                              {ev.title}
                            </h4>
                            <div className="text-xs text-slate-400 font-medium">
                              Organized by: <span className="text-slate-200 font-semibold">{ev.organizer_name}</span>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEvent(ev.event_id)}
                            className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 size-8 p-0 shrink-0"
                            title="Withdraw / Remove Drive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {ev.description}
                        </p>

                        {/* Details grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="size-3.5 text-teal-400 shrink-0" />
                            <span className="truncate">{ev.location}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="size-3.5 text-teal-400 shrink-0" />
                            <span>
                              {new Date(ev.start_date).toLocaleDateString()} — {new Date(ev.end_date).toLocaleDateString()}
                            </span>
                          </div>
                          {ev.contact_phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="size-3.5 text-teal-400 shrink-0" />
                              <span className="font-mono text-slate-300">{ev.contact_phone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Target className="size-3.5 text-teal-400 shrink-0" />
                            <span className="text-slate-300 font-semibold">
                              Goal: {ev.target_units || 100} Units ({ev.registered_count || 0} RSVPs)
                            </span>
                          </div>
                        </div>

                        {/* Focus groups */}
                        {ev.focus_blood_groups && ev.focus_blood_groups.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <span className="text-[11px] text-slate-400 font-medium">Focus:</span>
                            {ev.focus_blood_groups.map((grp) => (
                              <span
                                key={grp}
                                className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-teal-300 border border-slate-700"
                              >
                                {grp}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PartnerLayout>
  );
}
export default PartnerPortalPage;
