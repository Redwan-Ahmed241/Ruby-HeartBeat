/**
 * Pure TypeScript models and enums strictly mirroring the FastAPI / Pydantic v2 schemas.
 * No `any`, strictly typed requests and responses.
 */

// ============================================================================
// ENUMS (Exact match to app.core.enums)
// ============================================================================

export type UserRole = "DONOR" | "RECIPIENT" | "HOSPITAL_ADMIN" | "SYSTEM_ADMIN";

export type UserStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";

export type BloodGroup =
  "A_PLUS" | "A_MINUS" | "B_PLUS" | "B_MINUS" | "AB_PLUS" | "AB_MINUS" | "O_PLUS" | "O_MINUS";

export type ComponentType = "WHOLE_BLOOD" | "PLASMA" | "PLATELETS";

export type RequestUrgency = "NORMAL" | "URGENT" | "EMERGENCY";

export type RequestStatus = "PENDING" | "MATCHED" | "COMPLETED" | "CANCELLED";

export type StockStatus = "HEALTHY" | "LOW_STOCK" | "CRITICAL" | "OUT_OF_STOCK";

export type AvailabilityStatus = "AVAILABLE" | "UNAVAILABLE";

export type MatchResponseStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export type AppointmentStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";

export type EventStatus = "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";

export type ParticipantRole = "ORGANIZER" | "PARTICIPANT" | "VOLUNTEER";

export type ParticipantStatus = "REGISTERED" | "ATTENDED" | "CANCELLED";

export type TransactionType = "IN" | "OUT" | "ADJUSTMENT";

export type CommunicationChannel = "IN_APP" | "EMAIL" | "SMS" | "PUSH";

// ============================================================================
// AUTH & USERS (app.schemas.auth)
// ============================================================================

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface DonorProfileCreate {
  blood_group: BloodGroup;
  date_of_birth: string; // YYYY-MM-DD
  gender: string;
  weight: number;
  address: string;
  latitude: number;
  longitude: number;
  hemoglobin_level?: number;
  chronic_diseases?: string | null;
  medications?: string | null;
  allergies?: string | null;
  other_notes?: string | null;
}

export interface RecipientProfileCreate {
  nid_passport_no: string;
  address: string;
  relationship_to_patient: string;
  patient_name: string;
}

export interface HospitalProfileCreate {
  hospital_name: string;
  address: string;
  latitude: number;
  longitude: number;
  contact_number: string;
}

export interface UserRegisterRequest {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  donor_profile?: DonorProfileCreate | null;
  recipient_profile?: RecipientProfileCreate | null;
  hospital_profile?: HospitalProfileCreate | null;
}

export interface DonorBriefResponse {
  donor_id: string;
  blood_group: BloodGroup;
  date_of_birth: string;
  gender: string;
  weight: number;
  address: string;
  latitude: number;
  longitude: number;
  last_donation_date?: string | null;
  availability_status: AvailabilityStatus;
}

export interface RecipientBriefResponse {
  recipient_id: string;
  nid_passport_no: string;
  address: string;
  relationship_to_patient: string;
  patient_name: string;
}

export interface HospitalBriefResponse {
  hospital_id: string;
  hospital_name: string;
  address: string;
  latitude: number;
  longitude: number;
  contact_number: string;
}

export interface UserResponse {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  donor?: DonorBriefResponse | null;
  recipient?: RecipientBriefResponse | null;
  hospital?: HospitalBriefResponse | null;
}

// ============================================================================
// DONOR (app.schemas.donor)
// ============================================================================

export interface DonorProfileUpdate {
  gender?: string;
  weight?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  last_donation_date?: string | null;
}

export interface AvailabilityUpdate {
  availability_status: AvailabilityStatus;
}

export interface MedicalInfoUpsert {
  hemoglobin_level: number;
  chronic_diseases?: string | null;
  medications?: string | null;
  allergies?: string | null;
  other_notes?: string | null;
}

export interface MedicalInfoResponse {
  medical_info_id: string;
  donor_id: string;
  hemoglobin_level: number;
  chronic_diseases?: string | null;
  medications?: string | null;
  allergies?: string | null;
  other_notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DonationHistoryCreate {
  donation_date: string; // YYYY-MM-DD
  component_type: ComponentType;
  quantity: number;
  hemoglobin_level: number;
  center_name: string;
  notes?: string | null;
}

export interface DonationHistoryResponse {
  history_id: string;
  donor_id: string;
  donation_date: string;
  component_type: ComponentType;
  quantity: number;
  hemoglobin_level: number;
  center_name: string;
  notes?: string | null;
  created_at?: string | null;
}

export interface EligibilityCheckResponse {
  is_eligible: boolean;
  rejection_reasons: string[];
  age?: number | null;
  weight?: number | null;
  hemoglobin_level?: number | null;
  days_since_last_donation?: number | null;
  last_donation_date?: string | null;
}

export interface DonorResponse {
  donor_id: string;
  blood_group: BloodGroup;
  date_of_birth: string;
  gender: string;
  weight: number;
  address: string;
  latitude: number;
  longitude: number;
  last_donation_date?: string | null;
  availability_status: AvailabilityStatus;
  created_at?: string | null;
  updated_at?: string | null;
  medical_info?: MedicalInfoResponse | null;
}

// ============================================================================
// BLOOD REQUESTS & MATCHES (app.schemas.request)
// ============================================================================

export interface BloodRequestCreate {
  blood_group: BloodGroup;
  component_type: ComponentType;
  quantity: number;
  urgency?: RequestUrgency;
  required_location: string;
  latitude: number;
  longitude: number;
  notes?: string | null;
}

export interface MaskedDonorMatchResponse {
  match_id: string;
  request_id: string;
  donor_id: string;
  blood_group: BloodGroup;
  distance_km: number;
  match_score: number;
  response_status: MatchResponseStatus;
  is_notified: boolean;
  start_date?: string | null;
  donor_name_initial: string;
  contact_revealed: boolean;
}

export interface BloodRequestResponse {
  request_id: string;
  recipient_id: string;
  blood_group: BloodGroup;
  component_type: ComponentType;
  quantity: number;
  urgency: RequestUrgency;
  required_location: string;
  latitude: number;
  longitude: number;
  status: RequestStatus;
  request_date?: string | null;
  notes?: string | null;
  matches?: MaskedDonorMatchResponse[] | null;
}

export interface MatchRespondRequest {
  response: MatchResponseStatus; // "ACCEPTED" | "DECLINED"
}

export interface DonorContactReveal {
  match_id: string;
  donor_id: string;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  latitude: number;
  longitude: number;
  response_status: MatchResponseStatus;
}

export interface CommunicationCreate {
  receiver_id: string;
  message: string;
  channel?: CommunicationChannel;
}

export interface CommunicationResponse {
  communication_id: string;
  match_id: string;
  sender_id: string;
  receiver_id: string;
  channel: CommunicationChannel;
  message: string;
  sent_at?: string | null;
  is_read: boolean;
}

// ============================================================================
// INVENTORY (app.schemas.inventory)
// ============================================================================

export interface BloodInventoryResponse {
  inventory_id: string;
  hospital_id: string;
  blood_group: BloodGroup;
  component_type: ComponentType;
  quantity: number;
  unit: string;
  expiry_date: string;
  status: StockStatus;
  updated_at?: string | null;
}

export interface InventoryTransactionCreate {
  inventory_id: string;
  type: TransactionType;
  quantity: number;
  reference_type?: string | null;
  reference_id?: string | null;
}

export interface InventoryTransactionResponse {
  transaction_id: string;
  inventory_id: string;
  type: TransactionType;
  quantity: number;
  reference_type?: string | null;
  reference_id?: string | null;
  created_by: string;
  created_at?: string | null;
}

export interface ExpiryScanItem {
  inventory_id: string;
  hospital_name: string;
  blood_group: BloodGroup;
  component_type: ComponentType;
  quantity: number;
  expiry_date: string;
  hours_remaining: number;
}

export interface ExpiryScanResponse {
  scanned_count: number;
  expiring_soon_count: number;
  expiring_items: ExpiryScanItem[];
  message: string;
}

// ============================================================================
// APPOINTMENTS, EVENTS & AUDIT (app.schemas.appointment)
// ============================================================================

export interface AppointmentCreate {
  center_id: string;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM:SS
}

export interface AppointmentStatusUpdate {
  status: AppointmentStatus;
}

export interface AppointmentResponse {
  appointment_id: string;
  donor_id: string;
  center_id: string;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DonationEventCreate {
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
}

export interface EventResponse {
  event_id: string;
  title: string;
  description: string;
  organizer_id: string;
  location: string;
  start_date: string;
  end_date: string;
  status: EventStatus;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface EventParticipantCreate {
  role?: ParticipantRole;
}

export interface EventParticipantResponse {
  participant_id: string;
  event_id: string;
  user_id: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  registered_at?: string | null;
  checkin_time?: string | null;
}

export interface CampaignNoticeCreate {
  title: string;
  description: string;
  source: string;
  publish_date: string;
  expiry_date: string;
  link?: string | null;
}

export interface CampaignNoticeResponse {
  notice_id: string;
  title: string;
  description: string;
  source: string;
  publish_date: string;
  expiry_date: string;
  link?: string | null;
  created_by: string;
  created_at?: string | null;
}

export interface SystemLogResponse {
  log_id: string;
  user_id?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  ip_address?: string | null;
  timestamp: string;
}

// ============================================================================
// UI BLOOD GROUP MAPPERS
// Ensures bidirectional translation between UI ("A+") and Backend ("A_PLUS")
// ============================================================================

export const BLOOD_GROUP_UI_MAP: Record<BloodGroup, string> = {
  A_PLUS: "A+",
  A_MINUS: "A-",
  B_PLUS: "B+",
  B_MINUS: "B-",
  AB_PLUS: "AB+",
  AB_MINUS: "AB-",
  O_PLUS: "O+",
  O_MINUS: "O-",
};

export const UI_TO_BLOOD_GROUP_MAP: Record<string, BloodGroup> = {
  "A+": "A_PLUS",
  "A-": "A_MINUS",
  "B+": "B_PLUS",
  "B-": "B_MINUS",
  "AB+": "AB_PLUS",
  "AB-": "AB_MINUS",
  "O+": "O_PLUS",
  "O-": "O_MINUS",
};

export function toDisplayBloodGroup(group: BloodGroup | string): string {
  if (group in BLOOD_GROUP_UI_MAP) {
    return BLOOD_GROUP_UI_MAP[group as BloodGroup];
  }
  return group;
}

export function toApiBloodGroup(display: string): BloodGroup {
  return UI_TO_BLOOD_GROUP_MAP[display] ?? (display as BloodGroup);
}
