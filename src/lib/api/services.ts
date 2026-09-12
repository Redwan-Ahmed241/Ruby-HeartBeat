/**
 * Complete API service functions mapped to FastAPI backend endpoints.
 */

import { apiClient, tokenStorage } from "./client";
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
    payload: MatchRespondRequest
  ): Promise<{ message: string; match_id: string; response_status: string }> => {
    return apiClient(`/matches/${matchId}/respond`, {
      method: "POST",
      body: JSON.stringify(payload),
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
    payload: InventoryTransactionCreate
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
    payload: AppointmentStatusUpdate
  ): Promise<AppointmentResponse> => {
    return apiClient<AppointmentResponse>(`/appointments/${appointmentId}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};

export const eventService = {
  listEvents: async (): Promise<EventResponse[]> => {
    return apiClient<EventResponse[]>("/events/", { requiresAuth: false });
  },

  createEvent: async (payload: DonationEventCreate): Promise<EventResponse> => {
    return apiClient<EventResponse>("/events/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  registerForEvent: async (
    eventId: string,
    payload: EventParticipantCreate
  ): Promise<EventParticipantResponse> => {
    return apiClient<EventParticipantResponse>(`/events/${eventId}/register`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  checkinParticipant: async (
    eventId: string,
    userId: string
  ): Promise<EventParticipantResponse> => {
    return apiClient<EventParticipantResponse>(
      `/events/${eventId}/checkin?user_id=${userId}`,
      { method: "POST" }
    );
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

export const auditService = {
  getLogs: async (limit = 50, offset = 0): Promise<SystemLogResponse[]> => {
    return apiClient<SystemLogResponse[]>(
      `/system-logs/?limit=${limit}&offset=${offset}`
    );
  },
};

export const communicationService = {
  send: async (
    matchId: string,
    payload: CommunicationCreate
  ): Promise<CommunicationResponse> => {
    return apiClient<CommunicationResponse>(`/communications/${matchId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getMessages: async (matchId: string): Promise<CommunicationResponse[]> => {
    return apiClient<CommunicationResponse[]>(`/communications/${matchId}`);
  },
};
