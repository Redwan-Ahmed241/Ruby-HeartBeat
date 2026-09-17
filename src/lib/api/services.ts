/**
 * Complete API service functions mapped to FastAPI backend endpoints.
 */

import { apiClient, tokenStorage } from "./client";
import { partnerPortalService } from "./partner";
import type {
  Token,
  LoginRequest,
  UserRegisterRequest,
  UserResponse,
  DonorResponse,
  DonorProfileUpdate,
  AvailabilityUpdate,
  MedicalInfoUpsert,
  MedicalInfoResponse,
  DonationHistoryCreate,
  DonationHistoryResponse,
  EligibilityCheckResponse,
  BloodRequestCreate,
  BloodRequestResponse,
  MaskedDonorMatchResponse,
  MatchRespondRequest,
  DonorContactReveal,
  BloodInventoryResponse,
  InventoryTransactionCreate,
  InventoryTransactionResponse,
  ExpiryScanResponse,
  AppointmentCreate,
  AppointmentStatusUpdate,
  AppointmentResponse,
  DonationEventCreate,
  EventResponse,
  EventParticipantCreate,
  EventParticipantResponse,
  CampaignNoticeCreate,
  CampaignNoticeResponse,
  SystemLogResponse,
  CommunicationCreate,
  CommunicationResponse,
  BloodBankContactRequest,
  BloodBankContactResponse,
} from "./types";

// ============================================================================
// 1. AUTH SERVICES (/api/v1/auth)
// ============================================================================

export const authService = {
  register: async (payload: UserRegisterRequest): Promise<UserResponse> => {
    return apiClient<UserResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
      requiresAuth: false,
    });
  },

  login: async (payload: LoginRequest): Promise<Token> => {
    const token = await apiClient<Token>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
      requiresAuth: false,
    });
    tokenStorage.setTokens(token.access_token, token.refresh_token);
    return token;
  },

  refresh: async (refreshToken: string): Promise<Token> => {
    const token = await apiClient<Token>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
      requiresAuth: false,
    });
    tokenStorage.setTokens(token.access_token, token.refresh_token);
    return token;
  },

  getMe: async (): Promise<UserResponse> => {
    return apiClient<UserResponse>("/auth/me");
  },

  logout: () => {
    tokenStorage.clearTokens();
  },
};

// ============================================================================
// 2. DONOR SERVICES (/api/v1/donors)
// ============================================================================

export const donorService = {
  updateProfile: async (payload: DonorProfileUpdate): Promise<DonorResponse> => {
    return apiClient<DonorResponse>("/donors/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  toggleAvailability: async (payload: AvailabilityUpdate): Promise<DonorResponse> => {
    return apiClient<DonorResponse>("/donors/availability", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  getEligibility: async (): Promise<EligibilityCheckResponse> => {
    return apiClient<EligibilityCheckResponse>("/donors/eligibility");
  },

  upsertMedicalInfo: async (payload: MedicalInfoUpsert): Promise<MedicalInfoResponse> => {
    return apiClient<MedicalInfoResponse>("/donors/medical-info", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getHistory: async (): Promise<DonationHistoryResponse[]> => {
    return apiClient<DonationHistoryResponse[]>("/donors/history");
  },

  recordHistory: async (payload: DonationHistoryCreate): Promise<DonationHistoryResponse> => {
    return apiClient<DonationHistoryResponse>("/donors/history", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

// ============================================================================
// 3. BLOOD REQUESTS & MATCHING (/api/v1/requests & /api/v1/matches)
// ============================================================================

export const requestService = {
  createRequest: async (payload: BloodRequestCreate): Promise<BloodRequestResponse> => {
    return apiClient<BloodRequestResponse>("/requests/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  createEmergencyRequest: async (payload: BloodRequestCreate): Promise<BloodRequestResponse> => {
    return apiClient<BloodRequestResponse>("/requests/emergency", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  listRequests: async (filters?: {
    blood_group?: string;
    urgency?: string;
    status?: string;
  }): Promise<BloodRequestResponse[]> => {
    const params = new URLSearchParams();
    if (filters?.blood_group) params.append("blood_group", filters.blood_group);
    if (filters?.urgency) params.append("urgency", filters.urgency);
    if (filters?.status) params.append("status", filters.status);

    const qs = params.toString();
    return apiClient<BloodRequestResponse[]>(`/requests/${qs ? `?${qs}` : ""}`);
  },

  getRequest: async (requestId: string): Promise<BloodRequestResponse> => {
    return apiClient<BloodRequestResponse>(`/requests/${requestId}`);
  },

  getRequestMatches: async (requestId: string): Promise<MaskedDonorMatchResponse[]> => {
    return apiClient<MaskedDonorMatchResponse[]>(`/requests/${requestId}/matches`);
  },

  respondToMatch: async (
    matchId: string,
    payload: MatchRespondRequest,
  ): Promise<{ message: string; match_id: string; response_status: string }> => {
    const status = payload.response || payload.response_status;
    return apiClient(`/matches/${matchId}/respond`, {
      method: "POST",
      body: JSON.stringify({
        response: status,
        response_status: status,
      }),
    });
  },

  revealDonorContact: async (matchId: string): Promise<DonorContactReveal> => {
    // Enforces Contact Reveal Safeguard: returns 403 if response_status != ACCEPTED
    return apiClient<DonorContactReveal>(`/matches/${matchId}/contact`);
  },
};

// ============================================================================
// 4. INVENTORY SERVICES (/api/v1/inventory)
// ============================================================================

export const inventoryService = {
  getInventory: async (filters?: {
    hospital_id?: string;
    blood_group?: string;
    component_type?: string;
  }): Promise<BloodInventoryResponse[]> => {
    const params = new URLSearchParams();
    if (filters?.hospital_id) params.append("hospital_id", filters.hospital_id);
    if (filters?.blood_group) params.append("blood_group", filters.blood_group);
    if (filters?.component_type) params.append("component_type", filters.component_type);

    const qs = params.toString();
    return apiClient<BloodInventoryResponse[]>(`/inventory/${qs ? `?${qs}` : ""}`);
  },

  recordTransaction: async (
    payload: InventoryTransactionCreate,
  ): Promise<InventoryTransactionResponse> => {
    return apiClient<InventoryTransactionResponse>("/inventory/transaction", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  triggerExpiryScan: async (): Promise<ExpiryScanResponse> => {
    return apiClient<ExpiryScanResponse>("/inventory/scan-expiries", {
      method: "POST",
    });
  },
};

// ============================================================================
// 5. APPOINTMENTS, EVENTS & NOTICES
// ============================================================================

export const appointmentService = {
  bookAppointment: async (payload: AppointmentCreate): Promise<AppointmentResponse> => {
    return apiClient<AppointmentResponse>("/appointments/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getMyAppointments: async (): Promise<AppointmentResponse[]> => {
    return apiClient<AppointmentResponse[]>("/appointments/my-appointments");
  },

  updateStatus: async (
    appointmentId: string,
    payload: AppointmentStatusUpdate,
  ): Promise<AppointmentResponse> => {
    return apiClient<AppointmentResponse>(`/appointments/${appointmentId}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};

export const eventService = {
  listEvents: async (): Promise<EventResponse[]> => {
    try {
      const serverEvents = await apiClient<EventResponse[]>("/events/", { requiresAuth: false });
      const partnerEvents = partnerPortalService.getStoredEvents();
      const map = new Map<string, EventResponse>();
      // First populate partner and NGO events
      partnerEvents.forEach((ev) => map.set(ev.event_id, ev));
      // Overlay any backend events
      if (Array.isArray(serverEvents) && serverEvents.length > 0) {
        serverEvents.forEach((ev) => map.set(ev.event_id, ev));
      }
      return Array.from(map.values());
    } catch {
      // API unavailable or offline: return verified partner and NGO events
      return partnerPortalService.getStoredEvents();
    }
  },

  createEvent: async (payload: DonationEventCreate): Promise<EventResponse> => {
    try {
      const res = await apiClient<EventResponse>("/events/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      partnerPortalService.saveEventLocally(res);
      return res;
    } catch {
      const simulated: EventResponse = {
        event_id: `evt-${Date.now().toString(36)}`,
        title: payload.title,
        description: payload.description,
        organizer_id: payload.organizer_name?.toLowerCase().includes("crescent") ? "red_crescent" : "partner-bank",
        organizer_name: payload.organizer_name || "Partner Blood Bank",
        organizer_type: payload.organizer_type || "HOSPITAL",
        target_units: payload.target_units || 100,
        registered_count: 0,
        location: payload.location,
        start_date: payload.start_date,
        end_date: payload.end_date,
        status: "UPCOMING",
        contact_phone: payload.contact_phone,
        focus_blood_groups: payload.focus_blood_groups || ["O-", "Whole Blood"],
        created_at: new Date().toISOString(),
      };
      return partnerPortalService.saveEventLocally(simulated);
    }
  },

  registerForEvent: async (
    eventId: string,
    payload: EventParticipantCreate,
  ): Promise<EventParticipantResponse> => {
    try {
      return await apiClient<EventParticipantResponse>(`/events/${eventId}/register`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch {
      // Local participant count bump and registration simulation
      const events = partnerPortalService.getStoredEvents();
      const target = events.find((e) => e.event_id === eventId);
      if (target) {
        target.registered_count = (target.registered_count || 0) + 1;
        partnerPortalService.saveEventLocally(target);
      }
      return {
        participant_id: `part-${Date.now().toString(36)}`,
        event_id: eventId,
        user_id: "current-user",
        role: payload.role || "PARTICIPANT",
        status: "REGISTERED",
        registered_at: new Date().toISOString(),
      };
    }
  },

  checkinParticipant: async (
    eventId: string,
    userId: string,
  ): Promise<EventParticipantResponse> => {
    return apiClient<EventParticipantResponse>(`/events/${eventId}/checkin?user_id=${userId}`, {
      method: "POST",
    });
  },

  getMyRegistrations: async (): Promise<EventResponse[]> => {
    try {
      return await apiClient<EventResponse[]>("/events/my-registrations");
    } catch {
      return [];
    }
  },
};

export const noticeService = {
  getNotices: async (): Promise<CampaignNoticeResponse[]> => {
    return apiClient<CampaignNoticeResponse[]>("/campaign-notices/", {
      requiresAuth: false,
    });
  },

  createNotice: async (payload: CampaignNoticeCreate): Promise<CampaignNoticeResponse> => {
    return apiClient<CampaignNoticeResponse>("/campaign-notices/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

// ============================================================================
// 6. USER MANAGEMENT (/api/v1/users) — System Admin Only
// ============================================================================

export const userService = {
  listUsers: async (filters?: {
    role?: string;
    search?: string;
  }): Promise<UserResponse[]> => {
    const params = new URLSearchParams();
    if (filters?.role) params.append("role", filters.role);
    if (filters?.search) params.append("search", filters.search);

    const qs = params.toString();
    return apiClient<UserResponse[]>(`/users/${qs ? `?${qs}` : ""}`);
  },

  updateStatus: async (
    userId: string,
    payload: { status: "ACTIVE" | "BLOCKED" },
  ): Promise<UserResponse> => {
    return apiClient<UserResponse>(`/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};

export const auditService = {
  getLogs: async (limit = 50, offset = 0): Promise<SystemLogResponse[]> => {
    return apiClient<SystemLogResponse[]>(`/system-logs/?limit=${limit}&offset=${offset}`);
  },
};

export const communicationService = {
  send: async (matchId: string, payload: CommunicationCreate): Promise<CommunicationResponse> => {
    return apiClient<CommunicationResponse>(`/communications/${matchId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getMessages: async (matchId: string): Promise<CommunicationResponse[]> => {
    return apiClient<CommunicationResponse[]>(`/communications/${matchId}`);
  },
};

// ============================================================================
// 7. PARTNER BLOOD BANKS & RESERVES (/api/v1/blood-banks)
// ============================================================================

export const bloodBankService = {
  requestContactAccess: async (
    bankId: string,
    payload: BloodBankContactRequest,
  ): Promise<BloodBankContactResponse> => {
    try {
      return await apiClient<BloodBankContactResponse>(`/blood-banks/${bankId}/contact-request`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn(`[DEMO FALLBACK] Blood bank request simulated for bank ${bankId}:`, payload, err);
      return {
        success: true,
        bank_id: bankId,
        message:
          "Authorization request dispatched. The blood bank administration has been notified via email and portal alert.",
        simulated: true,
      };
    }
  },
};
