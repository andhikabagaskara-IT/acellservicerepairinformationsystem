// ============================================================================
// ARIS - Acell Service Repair Monitoring System
// Shared Type Definitions
// ============================================================================

// ─── Enums ──────────────────────────────────────────────────────────────────

export enum UserRole {
  ADMIN = "ADMIN",
  TECHNICIAN = "TECHNICIAN",
}

export enum DeviceType {
  SMARTPHONE = "SMARTPHONE",
  LAPTOP = "LAPTOP",
  OTHER = "OTHER",
}

export enum TicketStatus {
  INTAKE = "INTAKE",
  WAITING_ASSIGNMENT = "WAITING_ASSIGNMENT",
  INSPECTION = "INSPECTION",
  WAITING_PARTS = "WAITING_PARTS",
  IN_REPAIR = "IN_REPAIR",
  QUALITY_CHECK = "QUALITY_CHECK",
  READY_FOR_PICKUP = "READY_FOR_PICKUP",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  NOT_PROCEEDED = "NOT_PROCEEDED",
}

export enum AssignmentType {
  ADMIN_MANUAL = "ADMIN_MANUAL",
  SELF_ASSIGNED = "SELF_ASSIGNED",
  REASSIGNED = "REASSIGNED",
}

export enum Visibility {
  PUBLIC = "PUBLIC",
  INTERNAL = "INTERNAL",
}

export enum QuotationStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  SUPERSEDED = "SUPERSEDED",
}

export enum ActorType {
  ADMIN = "ADMIN",
  TECHNICIAN = "TECHNICIAN",
  SYSTEM = "SYSTEM",
  CUSTOMER = "CUSTOMER",
}

// ─── Database Entity Interfaces ─────────────────────────────────────────────

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  phone_e164: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone_e164: string;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  customer_id: string;
  device_type: DeviceType;
  brand: string;
  model: string;
  serial_or_imei: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface RepairTicket {
  id: string;
  ticket_number: string;
  customer_id: string;
  device_id: string;
  created_by: string;
  assigned_technician_id: string | null;
  status: TicketStatus;
  customer_complaint: string;
  intake_condition: string;
  accessories_received: string | null;
  device_pin_or_passcode: string | null;
  estimated_completion_at: string | null;
  received_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketAssignment {
  id: string;
  ticket_id: string;
  technician_id: string;
  assigned_by: string;
  assignment_type: AssignmentType;
  assigned_at: string;
}

export interface RepairDiagnosis {
  id: string;
  ticket_id: string;
  technician_id: string;
  diagnosis: string;
  recommended_action: string;
  visibility: Visibility;
  created_at: string;
  updated_at: string;
}

export interface RepairQuotation {
  id: string;
  ticket_id: string;
  version: number;
  labor_cost: number;
  parts_cost: number;
  total_cost: number;
  status: QuotationStatus;
  created_by: string;
  created_at: string;
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface QuotationNegotiation {
  id: string;
  quotation_id: string;
  ticket_id: string;
  customer_session_id: string | null;
  message: string;
  created_at: string;
}

export interface TicketStatusHistory {
  id: string;
  ticket_id: string;
  old_status: TicketStatus | null;
  new_status: TicketStatus;
  changed_by_type: ActorType;
  changed_by_id: string | null;
  actor_name_snapshot: string;
  reason_or_note: string | null;
  created_at: string;
}

export interface TicketUpdate {
  id: string;
  ticket_id: string;
  author_id: string;
  author_name_snapshot: string;
  message: string;
  visibility: Visibility;
  created_at: string;
}

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  uploader_id: string;
  storage_bucket: string;
  object_path: string;
  original_file_name: string;
  mime_type: string;
  file_size: number;
  visibility: Visibility;
  created_at: string;
}

export interface CustomerTicketAccessSession {
  id: string;
  ticket_id: string;
  token_hash: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  revoked_at: string | null;
}

export interface AuditLog {
  id: string;
  actor_type: ActorType;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ─── Request DTOs ───────────────────────────────────────────────────────────

export interface CreateCustomerRequest {
  name: string;
  phone_e164: string;
  email?: string;
  notes?: string;
}

export interface CreateDeviceRequest {
  customer_id: string;
  device_type: DeviceType;
  brand: string;
  model: string;
  serial_or_imei?: string;
  color?: string;
}

export interface CreateTicketRequest {
  customer_id: string;
  device_id: string;
  customer_complaint: string;
  intake_condition: string;
  accessories_received?: string;
  device_pin_or_passcode?: string;
  assigned_technician_id?: string;
  estimated_completion_at?: string;
}

export interface CreateDiagnosisRequest {
  diagnosis: string;
  recommended_action: string;
  visibility?: Visibility;
}

export interface CreateQuotationItemRequest {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface CreateQuotationRequest {
  labor_cost: number;
  items: CreateQuotationItemRequest[];
}

export interface NegotiationRequest {
  message: string;
}

export interface StatusTransitionRequest {
  new_status: TicketStatus;
  reason_or_note?: string;
}

export interface CustomerLoginRequest {
  ticket_number: string;
  phone_e164: string;
}

// ─── Response DTOs ──────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}
