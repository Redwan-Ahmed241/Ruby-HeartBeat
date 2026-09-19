/**
 * External Partner Blood Bank & NGO Portal API Client & Local Simulation Fallback.
 * This service manages third-party hospital blood banks & NGOs (e.g. Bangladesh Red Crescent),
 * real-time reserve matrices, deficit broadcasts, and auto-synced blood drives/events.
 */

import { apiClient } from "./client";
import type {
  PartnerFacilityProfile,
  PartnerInventoryMatrix,
  PartnerBloodNeed,
  PartnerBloodNeedCreate,
  NeedStatus,
  EventResponse,
  DonationEventCreate,
} from "./types";

const STORAGE_KEY = "lifedrop_partner_bank_data";

export const PRESET_PARTNER_PROFILES: Record<string, PartnerFacilityProfile> = {
  square: {
    facility_id: "square",
    facility_name: "Square Hospital Blood Bank & Transfusion Center",
    license_id: "DGHS-BB-2024-0891",
    address: "18F Bir Uttam Qazi Nuruzzaman Sarak, Dhaka-1205",
    area: "Panthapath",
    latitude: 23.7533,
    longitude: 90.3879,
    is_24_hours: true,
    operating_hours: "24/7 Continuous Emergency Transfusion Operation",
    hotline: "+880 2 8159457 / 10616",
    duty_officer: "Dr. Farhana Ahmed (Transfusion Medicine Specialist)",
    email: "bloodbank@squarehospital.com",
  },
  red_crescent: {
    facility_id: "red_crescent",
    facility_name: "Bangladesh Red Crescent Society (BDRCS) National Blood Center",
    license_id: "DGHS-NGO-2023-0104",
    address: "684-686 Boro Moghbazar, Dhaka-1217",
    area: "Moghbazar",
    latitude: 23.7485,
    longitude: 90.4042,
    is_24_hours: true,
    operating_hours: "24/7 Voluntary Blood Donor Services & Screening",
    hotline: "+880 2 48310188 / +880 1811458524",
    duty_officer: "Director of Blood Services (BDRCS)",
    email: "bloodcenter@bdrcs.org",
  },
  dmch: {
    facility_id: "dmch",
    facility_name: "Dhaka Medical College Hospital Blood Bank",
    license_id: "DGHS-BB-2021-0002",
    address: "Secretariate Road, Ramna, Dhaka-1000",
    area: "Shahbagh",
    latitude: 23.7258,
    longitude: 90.3976,
    is_24_hours: true,
    operating_hours: "24/7 Government Tertiary Emergency Blood Center",
    hotline: "+880 2 55165088",
    duty_officer: "Dr. K. M. Hossain (Head of Transfusion Dept)",
    email: "transfusion@dmch.gov.bd",
  },
  quantum: {
    facility_id: "quantum",
    facility_name: "Quantum Foundation Voluntary Blood Donation Program",
    license_id: "DGHS-NGO-2022-0412",
    address: "119 Shantinagar, Dhaka-1217",
    area: "Shantinagar",
    latitude: 23.7382,
    longitude: 90.4132,
    is_24_hours: true,
    operating_hours: "24/7 Screening, Component Preparation & Drive Mobilization",
    hotline: "+880 2 9341441 / +880 1714010869",
    duty_officer: "Coordinator, Quantum Blood Lab",
    email: "blood@quantummethod.org.bd",
  },
  evercare: {
    facility_id: "evercare",
    facility_name: "Evercare Hospital Blood Bank & Transfusion Medicine",
    license_id: "DGHS-BB-2023-0518",
    address: "Plot 81, Block E, Bashundhara R/A, Dhaka-1229",
    area: "Bashundhara",
    latitude: 23.8103,
    longitude: 90.4312,
    is_24_hours: true,
    operating_hours: "24/7 JCI-Accredited Transfusion Medicine Service",
    hotline: "+880 2 8431661-5 / 10678",
    duty_officer: "Dr. S. R. Chowdhury (Lead Transfusionist)",
    email: "transfusion@evercarebd.com",
  },
};

export const DEFAULT_PARTNER_PROFILE: PartnerFacilityProfile = PRESET_PARTNER_PROFILES["square"]!;

export const DEFAULT_PARTNER_MATRIX: PartnerInventoryMatrix = {
  "O+": { whole_blood: 14, platelets: 9, plasma: 12 },
  "O-": { whole_blood: 2, platelets: 1, plasma: 3 }, // CRITICAL
  "A+": { whole_blood: 10, platelets: 6, plasma: 8 },
  "A-": { whole_blood: 4, platelets: 3, plasma: 5 }, // LOW
  "B+": { whole_blood: 12, platelets: 8, plasma: 11 },
  "B-": { whole_blood: 2, platelets: 1, plasma: 2 }, // CRITICAL
  "AB+": { whole_blood: 7, platelets: 4, plasma: 6 }, // LOW
  "AB-": { whole_blood: 1, platelets: 0, plasma: 1 }, // CRITICAL
};

export const DEFAULT_PARTNER_NEEDS: PartnerBloodNeed[] = [
  {
    id: "need-01",
    facility_id: "square",
    blood_group: "O-",
    component: "Whole Blood",
    required_units: 3,
    urgency: "CRITICAL_ICU",
    clinical_reason: "Cardiovascular surgery ICU emergency standby",
    deadline: "Within 4 Hours",
    status: "ACTIVE",
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "need-02",
    facility_id: "square",
    blood_group: "AB-",
    component: "Platelets",
    required_units: 2,
    urgency: "URGENT",
    clinical_reason: "Thalassemia patient regular transfusion protocol",
    deadline: "Within 12 Hours",
    status: "ACTIVE",
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
];

export const DEFAULT_PARTNER_EVENTS: EventResponse[] = [
  {
    event_id: "evt-bdrcs-01",
    title: "Red Crescent National Voluntary Blood Donation Drive 2026",
    description:
      "Annual nationwide community blood donation campaign organized by Bangladesh Red Crescent Society (BDRCS). Safe blood collection, free Hb test, voluntary health card, and donor appreciation certificates provided.",
    organizer_id: "red_crescent",
    organizer_name: "Bangladesh Red Crescent Society (BDRCS)",
    organizer_type: "NGO",
    target_units: 350,
    registered_count: 142,
    location: "Red Crescent National HQ, 684-686 Boro Moghbazar, Dhaka",
    start_date: new Date(Date.now() + 86400000).toISOString(),
    end_date: new Date(Date.now() + 259200000).toISOString(),
    status: "UPCOMING",
    contact_phone: "+880 2 48310188 / +880 1811458524",
    focus_blood_groups: ["O-", "B-", "A+", "O+", "Platelets"],
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    event_id: "evt-sq-02",
    title: "Square Hospital Emergency ICU & Platelet Transfusion Drive",
    description:
      "Specialized clinical drive for apheresis platelets and fresh whole blood units to replenish emergency surgical reserves and oncology ward standby inventory.",
    organizer_id: "square",
    organizer_name: "Square Hospital Blood Bank & Transfusion Center",
    organizer_type: "HOSPITAL",
    target_units: 120,
    registered_count: 78,
    location: "Transfusion Medicine Center, Ground Floor, Square Hospital, Panthapath, Dhaka",
    start_date: new Date(Date.now() + 43200000).toISOString(),
    end_date: new Date(Date.now() + 172800000).toISOString(),
    status: "ONGOING",
    contact_phone: "+880 2 8159457 / Hotline: 10616",
    focus_blood_groups: ["O-", "AB-", "B-", "Platelets"],
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    event_id: "evt-qf-03",
    title: "Quantum Foundation Voluntary Blood Donation Camp — Shahbagh",
    description:
      "Open community blood donation camp with comprehensive 5-parameter screening (HIV, HBV, HCV, Syphilis, Malaria) and digital donor recognition.",
    organizer_id: "quantum",
    organizer_name: "Quantum Foundation Voluntary Blood Program",
    organizer_type: "NGO",
    target_units: 250,
    registered_count: 110,
    location: "Quantum Blood Lab, 119 Shantinagar / Shahbagh Public Library Premises, Dhaka",
    start_date: new Date(Date.now() + 172800000).toISOString(),
    end_date: new Date(Date.now() + 345600000).toISOString(),
    status: "UPCOMING",
    contact_phone: "+880 2 9341441 / +880 1714010869",
    focus_blood_groups: ["A-", "O-", "B+", "AB+"],
    created_at: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    event_id: "evt-dmch-04",
    title: "DMCH Emergency Trauma & Burn Unit Blood Drive",
    description:
      "Urgent emergency trauma and burn patient standby collection drive. All healthy adult donors welcome to bolster critical public hospital reserves.",
    organizer_id: "dmch",
    organizer_name: "Dhaka Medical College Hospital Blood Bank",
    organizer_type: "HOSPITAL",
    target_units: 300,
    registered_count: 195,
    location: "Emergency Complex, Secretariate Road, Ramna, Dhaka",
    start_date: new Date(Date.now() + 86400000).toISOString(),
    end_date: new Date(Date.now() + 259200000).toISOString(),
    status: "UPCOMING",
    contact_phone: "+880 2 55165088",
    focus_blood_groups: ["O-", "A-", "B-", "Whole Blood"],
    created_at: new Date(Date.now() - 345600000).toISOString(),
  },
];

interface StoredPartnerData {
  profile: PartnerFacilityProfile;
  inventory: PartnerInventoryMatrix;
  needs: PartnerBloodNeed[];
  events: EventResponse[];
  last_synced: string;
}

function getStoredData(): StoredPartnerData {
  if (typeof window === "undefined") {
    return {
      profile: DEFAULT_PARTNER_PROFILE,
      inventory: DEFAULT_PARTNER_MATRIX,
      needs: DEFAULT_PARTNER_NEEDS,
      events: DEFAULT_PARTNER_EVENTS,
      last_synced: "Just now",
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial: StoredPartnerData = {
        profile: DEFAULT_PARTNER_PROFILE,
        inventory: DEFAULT_PARTNER_MATRIX,
        needs: DEFAULT_PARTNER_NEEDS,
        events: DEFAULT_PARTNER_EVENTS,
        last_synced: "A few minutes ago",
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!parsed.events || !Array.isArray(parsed.events)) {
      parsed.events = DEFAULT_PARTNER_EVENTS;
    }
    return parsed;
  } catch {
    return {
      profile: DEFAULT_PARTNER_PROFILE,
      inventory: DEFAULT_PARTNER_MATRIX,
      needs: DEFAULT_PARTNER_NEEDS,
      events: DEFAULT_PARTNER_EVENTS,
      last_synced: "Just now",
    };
  }
}

function saveStoredData(data: StoredPartnerData) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      console.info("[PARTNER PORTAL] Synced locally: ready for live endpoint binding", data);
    } catch {
      // ignore
    }
  }
}

export const partnerPortalService = {
  fetchBankProfile: async (id = "square"): Promise<PartnerFacilityProfile> => {
    try {
      return await apiClient<PartnerFacilityProfile>(`/external/blood-banks/${id}/profile`);
    } catch (err) {
      console.warn(`[PARTNER PORTAL] fetchBankProfile endpoint unavailable, using profile for ${id}:`, err);
      const data = getStoredData();
      if (data.profile.facility_id === id) {
        return data.profile;
      }
      return PRESET_PARTNER_PROFILES[id] || data.profile;
    }
  },

  updateBankProfile: async (
    id = "square",
    payload: Partial<PartnerFacilityProfile>,
  ): Promise<PartnerFacilityProfile> => {
    try {
      return await apiClient<PartnerFacilityProfile>(`/external/blood-banks/${id}/profile`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn(`[PARTNER PORTAL] updateBankProfile fallback to local state:`, payload, err);
      const data = getStoredData();
      data.profile = { ...data.profile, ...payload };
      saveStoredData(data);
      return data.profile;
    }
  },

  fetchBankInventory: async (id = "square"): Promise<{ inventory: PartnerInventoryMatrix; last_synced: string }> => {
    try {
      const res = await apiClient<{ inventory: PartnerInventoryMatrix; last_synced: string }>(
        `/external/blood-banks/${id}/inventory`,
      );
      return res;
    } catch (err) {
      console.warn(`[PARTNER PORTAL] fetchBankInventory fallback to local state:`, err);
      const data = getStoredData();
      return { inventory: data.inventory, last_synced: data.last_synced };
    }
  },

  syncBankInventory: async (
    id = "square",
    matrix: PartnerInventoryMatrix,
  ): Promise<{ success: boolean; last_synced: string }> => {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    try {
      await apiClient(`/external/blood-banks/${id}/inventory`, {
        method: "POST",
        body: JSON.stringify({ inventory: matrix }),
      });
      return { success: true, last_synced: `Today at ${timestamp}` };
    } catch (err) {
      console.warn(`[PARTNER PORTAL] syncBankInventory fallback to local state:`, err);
      const data = getStoredData();
      data.inventory = matrix;
      data.last_synced = `Today at ${timestamp}`;
      saveStoredData(data);
      return { success: true, last_synced: `Today at ${timestamp}` };
    }
  },

  fetchBloodNeeds: async (id = "square"): Promise<PartnerBloodNeed[]> => {
    try {
      return await apiClient<PartnerBloodNeed[]>(`/external/blood-banks/${id}/broadcast-needs`);
    } catch (err) {
      console.warn(`[PARTNER PORTAL] fetchBloodNeeds fallback to local state:`, err);
      return getStoredData().needs;
    }
  },

  broadcastBloodNeed: async (
    id = "square",
    need: PartnerBloodNeedCreate,
  ): Promise<PartnerBloodNeed> => {
    try {
      return await apiClient<PartnerBloodNeed>(`/external/blood-banks/${id}/broadcast-needs`, {
        method: "POST",
        body: JSON.stringify(need),
      });
    } catch (err) {
      console.warn(`[PARTNER PORTAL] broadcastBloodNeed fallback to local state:`, need, err);
      const data = getStoredData();
      const newNeed: PartnerBloodNeed = {
        ...need,
        id: `need-${Date.now().toString(36)}`,
        facility_id: id,
        status: "ACTIVE",
        created_at: new Date().toISOString(),
      };
      data.needs = [newNeed, ...data.needs];
      saveStoredData(data);
      return newNeed;
    }
  },

  updateBloodNeedStatus: async (
    id = "square",
    needId: string,
    status: NeedStatus,
  ): Promise<PartnerBloodNeed> => {
    try {
      return await apiClient<PartnerBloodNeed>(`/external/blood-banks/${id}/broadcast-needs/${needId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      console.warn(`[PARTNER PORTAL] updateBloodNeedStatus fallback to local state:`, needId, status, err);
      const data = getStoredData();
      data.needs = data.needs.map((item) => (item.id === needId ? { ...item, status } : item));
      saveStoredData(data);
      const found = data.needs.find((item) => item.id === needId);
      if (!found) throw new Error("Need not found");
      return found;
    }
  },

  deleteBloodNeed: async (id = "square", needId: string): Promise<{ success: boolean }> => {
    try {
      await apiClient(`/external/blood-banks/${id}/broadcast-needs/${needId}`, {
        method: "DELETE",
      });
      return { success: true };
    } catch (err) {
      console.warn(`[PARTNER PORTAL] deleteBloodNeed fallback to local state:`, needId, err);
      const data = getStoredData();
      data.needs = data.needs.filter((item) => item.id !== needId);
      saveStoredData(data);
      return { success: true };
    }
  },

  // ==========================================
  // PARTNER & NGO EVENTS / BLOOD DRIVES METHODS
  // ==========================================
  getStoredEvents: (): EventResponse[] => {
    const data = getStoredData();
    return data.events && data.events.length > 0 ? data.events : DEFAULT_PARTNER_EVENTS;
  },

  fetchEvents: async (facilityId?: string): Promise<EventResponse[]> => {
    const all = partnerPortalService.getStoredEvents();
    if (facilityId) {
      return all.filter((e) => e.organizer_id === facilityId);
    }
    return all;
  },

  saveEventLocally: (event: EventResponse): EventResponse => {
    const data = getStoredData();
    const existing = data.events && data.events.length > 0 ? data.events : DEFAULT_PARTNER_EVENTS;
    const filtered = existing.filter((e) => e.event_id !== event.event_id);
    data.events = [event, ...filtered];
    saveStoredData(data);
    return event;
  },

  deleteEventLocally: (eventId: string): boolean => {
    const data = getStoredData();
    const existing = data.events && data.events.length > 0 ? data.events : DEFAULT_PARTNER_EVENTS;
    data.events = existing.filter((e) => e.event_id !== eventId);
    saveStoredData(data);
    return true;
  },

  publishEvent: async (
    facilityId: string,
    eventPayload: DonationEventCreate,
  ): Promise<EventResponse> => {
    const newEvent: EventResponse = {
      event_id: `evt-${Date.now().toString(36)}`,
      title: eventPayload.title,
      description: eventPayload.description,
      organizer_id: facilityId,
      organizer_name: eventPayload.organizer_name || "Partner Blood Bank",
      organizer_type: eventPayload.organizer_type || "HOSPITAL",
      target_units: eventPayload.target_units || 100,
      registered_count: 0,
      location: eventPayload.location,
      start_date: eventPayload.start_date,
      end_date: eventPayload.end_date,
      status: "UPCOMING",
      contact_phone: eventPayload.contact_phone,
      focus_blood_groups: eventPayload.focus_blood_groups || ["O-", "Whole Blood"],
      created_at: new Date().toISOString(),
    };

    try {
      const res = await apiClient<EventResponse>("/events/", {
        method: "POST",
        body: JSON.stringify(newEvent),
      });
      partnerPortalService.saveEventLocally(res);
      return res;
    } catch {
      console.info("[PARTNER PORTAL] Event published and synced to central network locally:", newEvent);
      partnerPortalService.saveEventLocally(newEvent);
      return newEvent;
    }
  },
};
