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
  | "A_POSITIVE"
  | "A_NEGATIVE"
  | "B_POSITIVE"
  | "B_NEGATIVE"
  | "AB_POSITIVE"
  | "AB_NEGATIVE"
  | "O_POSITIVE"
  | "O_NEGATIVE"
  | "A_PLUS"
  | "A_MINUS"
  | "B_PLUS"
  | "B_MINUS"
  | "AB_PLUS"
  | "AB_MINUS"
  | "O_PLUS"
  | "O_MINUS";

export type ComponentType = "WHOLE_BLOOD" | "PLASMA" | "PLATELETS";

export type RequestUrgency = "NORMAL" | "URGENT" | "EMERGENCY";

export type RequestStatus = "OPEN" | "PENDING" | "ACCEPTED" | "MATCHED" | "PROCESSING" | "COMPLETED" | "CANCELLED";

export type StockStatus = "HEALTHY" | "LOW_STOCK" | "CRITICAL" | "OUT_OF_STOCK";

export type AvailabilityStatus = "AVAILABLE" | "UNAVAILABLE";

export type MatchResponseStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "COMPLETED" | "CANCELLED";

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
  date_of_birth: string; // Strictly mandatory (YYYY-MM-DD)
  role?: UserRole;
  age?: number | undefined;
  blood_group?: BloodGroup;
  gender?: string;
  weight?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  nid_passport_no?: string;
  nid_or_birth_cert?: string | undefined;
  donor_profile?: DonorProfileCreate | null;
  recipient_profile?: RecipientProfileCreate | null;
  hospital_profile?: HospitalProfileCreate | null;
}

export interface DonorBriefResponse {
  donor_id: string;
  blood_group: BloodGroup;
  date_of_birth: string;
  age?: number | null | undefined;
  gender: string;
  weight: number;
  address: string;
  latitude: number;
  longitude: number;
  last_donation_date?: string | null;
  availability_status: AvailabilityStatus;
  total_donations?: number;
  medical_info?: MedicalInfoResponse | null | undefined;
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
  backup_phone?: string | null;
  role: UserRole;
  status: UserStatus;
  date_of_birth?: string | null;
  age?: number | null;
  nid_or_birth_cert?: string | null;
  created_at: string;
  updated_at: string;
  donor?: DonorBriefResponse | null;
  recipient?: RecipientBriefResponse | null;
  hospital?: HospitalBriefResponse | null;
}

export interface UserProfileUpdate {
  full_name?: string;
  phone?: string;
  backup_phone?: string | null;
  age?: number | undefined;
  date_of_birth?: string | null;
  weight?: number | null;
  hemoglobin?: number | null;
  hemoglobin_level?: number | null;
  address?: string;
  location_zone?: string;
  blood_group?: BloodGroup;
  last_donation_date?: string | null;
}

// ============================================================================
// DONOR (app.schemas.donor)
// ============================================================================

export interface DonorProfileUpdate {
  age?: number | undefined;
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
  chronic_diseases?: string | null | undefined;
  medications?: string | null | undefined;
  allergies?: string | null | undefined;
  other_notes?: string | null | undefined;
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
  completed_at?: string | null;
  units_donated?: number | null;
  facility_name?: string | null;
}

export interface ClearAllNotificationsResponse {
  cleared_count: number;
  message: string;
}

export interface EligibilityCheckResponse {
  is_eligible: boolean;
  rejection_reasons: string[];
  age?: number | null;
  weight?: number | null;
  hemoglobin_level?: number | null;
  days_since_last_donation?: number | null;
  last_donation_date?: string | null;
  cooldown_active?: boolean;
  next_eligible_date?: string | null;
  cooldown_days_remaining?: number | null;
}

export interface DonorResponse {
  donor_id: string;
  blood_group: BloodGroup;
  date_of_birth: string;
  age?: number | null | undefined;
  gender: string;
  weight: number;
  address: string;
  latitude: number;
  longitude: number;
  last_donation_date?: string | null;
  availability_status: AvailabilityStatus;
  total_donations?: number;
  created_at?: string | null;
  updated_at?: string | null;
  medical_info?: MedicalInfoResponse | null;
}

export interface TopDonorResponse {
  donor_id: string;
  full_name: string;
  blood_group: BloodGroup;
  area_zone?: string | null;
  donation_count: number;
  tier: string;
  badge_icon: string;
  last_donation_date?: string | null;
}


// ============================================================================
// BLOOD REQUESTS & MATCHES (app.schemas.request)
// ============================================================================

export interface BloodRequestCreate {
  blood_group: BloodGroup;
  component_type: ComponentType;
  quantity: number;
  urgency?: RequestUrgency | undefined;
  required_location: string;
  latitude: number;
  longitude: number;
  notes?: string | null | undefined;
  patient_name?: string | undefined;
  hospital_name?: string | undefined;
  area_zone?: string | undefined;
  attendant_phone_number?: string | undefined;
  volume_ml?: number | undefined;
  is_contact_public?: boolean;
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
  donor_confirmed_completion?: boolean;
  recipient_confirmed_completion?: boolean;
  completed_at?: string | null;
  approx_latitude?: number | null | undefined;
  approx_longitude?: number | null | undefined;
  approx_area?: string | null | undefined;
}

export interface AcceptedDonorSummary {
  donor_id: string;
  full_name: string;
  phone: string;
  area_zone?: string | null | undefined;
  email?: string | null | undefined;
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
  request_date?: string | null | undefined;
  notes?: string | null | undefined;
  patient_name?: string | null | undefined;
  hospital_name?: string | null | undefined;
  area_zone?: string | null | undefined;
  attendant_phone_number?: string | null | undefined;
  volume_ml?: number | null | undefined;
  accepted_donor_id?: string | null | undefined;
  accepted_donor?: AcceptedDonorSummary | null | undefined;
  is_contact_public?: boolean;
  matches?: MaskedDonorMatchResponse[] | null | undefined;
}

export interface MatchCompletionStatusResponse {
  match_id: string;
  request_id: string;
  status: MatchResponseStatus;
  donor_confirmed_completion: boolean;
  recipient_confirmed_completion: boolean;
  is_completed: boolean;
  completed_at?: string | null;
  cooldown_until?: string | null;
}

export interface BloodRequestUpdate {
  is_contact_public?: boolean;
  notes?: string;
}

export interface RequestStatusUpdate {
  status: RequestStatus;
  accepted_donor_id?: string | undefined;
}

export interface MatchRespondRequest {
  response?: MatchResponseStatus; // "ACCEPTED" | "DECLINED"
  response_status?: MatchResponseStatus; // "ACCEPTED" | "DECLINED"
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
  preferred_meetup_time?: string | null;
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
// EVENTS & AUDIT (app.schemas.events_notices)
// ============================================================================

export interface DonationEventCreate {
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  organizer_name?: string;
  organizer_type?: "HOSPITAL" | "NGO" | "COMMUNITY";
  target_units?: number;
  contact_phone?: string;
  focus_blood_groups?: string[];
}

export interface EventResponse {
  event_id: string;
  title: string;
  description: string;
  organizer_id: string;
  organizer_name?: string | null | undefined;
  organizer_type?: "HOSPITAL" | "NGO" | "COMMUNITY" | undefined;
  target_units?: number | undefined;
  registered_count?: number | undefined;
  location: string;
  start_date: string;
  end_date: string;
  status: EventStatus;
  contact_phone?: string | null | undefined;
  focus_blood_groups?: string[] | undefined;
  created_at?: string | null | undefined;
  updated_at?: string | null | undefined;
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

export const CANONICAL_BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
] as const;

export type CanonicalBloodGroup = (typeof CANONICAL_BLOOD_GROUPS)[number];

export const BLOOD_GROUP_UI_MAP: Record<BloodGroup, string> = {
  A_POSITIVE: "A+",
  A_NEGATIVE: "A-",
  B_POSITIVE: "B+",
  B_NEGATIVE: "B-",
  AB_POSITIVE: "AB+",
  AB_NEGATIVE: "AB-",
  O_POSITIVE: "O+",
  O_NEGATIVE: "O-",
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
  "A+": "A_POSITIVE",
  "A-": "A_NEGATIVE",
  "B+": "B_POSITIVE",
  "B-": "B_NEGATIVE",
  "AB+": "AB_POSITIVE",
  "AB-": "AB_NEGATIVE",
  "O+": "O_POSITIVE",
  "O-": "O_NEGATIVE",
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

// ============================================================================
// BLOOD BANK CONTACT REQUEST
// ============================================================================

export interface BloodBankContactRequest {
  blood_group: BloodGroup | string;
  urgency: RequestUrgency;
  component?: ComponentType | string | undefined;
  note?: string | undefined;
}

export interface BloodBankContactResponse {
  success: boolean;
  request_id?: string;
  bank_id: string;
  message: string;
  simulated?: boolean;
}

// ============================================================================
// EXTERNAL PARTNER PORTAL TYPES
// ============================================================================

export interface PartnerFacilityProfile {
  facility_id: string;
  facility_name: string;
  license_id: string;
  address: string;
  area: string;
  latitude: number;
  longitude: number;
  is_24_hours: boolean;
  operating_hours: string;
  hotline: string;
  duty_officer: string;
  email: string;
}

export interface PartnerGroupReserve {
  whole_blood: number;
  platelets: number;
  plasma: number;
}

export type PartnerInventoryMatrix = Record<CanonicalBloodGroup, PartnerGroupReserve>;

export type NeedUrgency = "URGENT" | "CRITICAL_ICU";
export type NeedStatus = "ACTIVE" | "FULFILLED" | "CANCELLED";

export interface PartnerBloodNeed {
  id: string;
  facility_id: string;
  blood_group: CanonicalBloodGroup | string;
  component: string;
  required_units: number;
  urgency: NeedUrgency;
  clinical_reason: string;
  deadline: string;
  status: NeedStatus;
  created_at: string;
}

export interface PartnerBloodNeedCreate {
  blood_group: CanonicalBloodGroup | string;
  component: string;
  required_units: number;
  urgency: NeedUrgency;
  clinical_reason: string;
  deadline: string;
}

