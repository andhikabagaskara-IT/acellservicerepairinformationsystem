// ============================================================================
// ARIS - Acell Service Repair Monitoring System
// Shared Validation Schemas (Zod)
// ============================================================================

import { z } from "zod";
import {
  DeviceType,
  Visibility,
  TicketStatus,
} from "../types/index";

// ─── Reusable Patterns ─────────────────────────────────────────────────────

/** E.164 phone number format: +<country><number>, 7-15 digits total */
const phoneE164Regex = /^\+[1-9]\d{6,14}$/;

/** Acell ticket number format: AC-YYYY-NNNNNN */
const ticketNumberRegex = /^AC-\d{4}-\d{6}$/;

// ─── Shared Field Schemas ───────────────────────────────────────────────────

const phoneE164Schema = z
  .string()
  .regex(phoneE164Regex, "Phone must be in E.164 format (e.g. +628123456789)");

const nameSchema = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name must be at most 100 characters");

const textBlockSchema = z
  .string()
  .min(5, "Must be at least 5 characters")
  .max(2000, "Must be at most 2000 characters");

const nonNegativeNumber = z
  .number()
  .nonnegative("Must be a non-negative number");

const positiveInteger = z
  .number()
  .int("Must be an integer")
  .positive("Must be a positive integer");

// ─── Request DTO Schemas ────────────────────────────────────────────────────

export const createCustomerSchema = z.object({
  name: nameSchema,
  phone_e164: phoneE164Schema,
  email: z.string().email("Invalid email format").optional(),
  notes: z.string().max(2000).optional(),
});

export const createDeviceSchema = z.object({
  customer_id: z.string().uuid("Invalid customer ID"),
  device_type: z.nativeEnum(DeviceType),
  brand: z.string().min(1, "Brand is required").max(100),
  model: z.string().min(1, "Model is required").max(100),
  serial_or_imei: z.string().max(100).optional(),
  color: z.string().max(50).optional(),
});

export const createTicketSchema = z.object({
  customer_id: z.string().uuid("Invalid customer ID"),
  device_id: z.string().uuid("Invalid device ID"),
  customer_complaint: textBlockSchema,
  intake_condition: textBlockSchema,
  accessories_received: z.string().max(500).optional(),
  device_pin_or_passcode: z.string().max(100).optional(),
  assigned_technician_id: z.string().uuid("Invalid technician ID").optional(),
  estimated_completion_at: z.string().datetime({ offset: true }).optional(),
});

export const createDiagnosisSchema = z.object({
  diagnosis: textBlockSchema,
  recommended_action: textBlockSchema,
  visibility: z.nativeEnum(Visibility).optional().default(Visibility.INTERNAL),
});

export const createQuotationItemSchema = z.object({
  description: z.string().min(1, "Description is required").max(500),
  quantity: positiveInteger,
  unit_price: nonNegativeNumber,
});

export const createQuotationSchema = z.object({
  labor_cost: nonNegativeNumber,
  items: z
    .array(createQuotationItemSchema)
    .min(1, "At least one item is required"),
});

export const negotiationSchema = z.object({
  message: textBlockSchema,
});

export const statusTransitionSchema = z.object({
  new_status: z.nativeEnum(TicketStatus),
  reason_or_note: z.string().max(2000).optional(),
});

export const customerLoginSchema = z.object({
  ticket_number: z
    .string()
    .regex(ticketNumberRegex, "Ticket number must match format AC-YYYY-NNNNNN"),
  phone_e164: phoneE164Schema,
});

// ─── Inferred Types (for convenience) ───────────────────────────────────────

export type ValidatedCreateCustomer = z.infer<typeof createCustomerSchema>;
export type ValidatedCreateDevice = z.infer<typeof createDeviceSchema>;
export type ValidatedCreateTicket = z.infer<typeof createTicketSchema>;
export type ValidatedCreateDiagnosis = z.infer<typeof createDiagnosisSchema>;
export type ValidatedCreateQuotationItem = z.infer<typeof createQuotationItemSchema>;
export type ValidatedCreateQuotation = z.infer<typeof createQuotationSchema>;
export type ValidatedNegotiation = z.infer<typeof negotiationSchema>;
export type ValidatedStatusTransition = z.infer<typeof statusTransitionSchema>;
export type ValidatedCustomerLogin = z.infer<typeof customerLoginSchema>;

// ─── Utility Functions ──────────────────────────────────────────────────────

/**
 * Normalizes common Indonesian phone number formats to E.164.
 *
 * Conversions:
 * - `08xx...`   → `+628xx...`
 * - `628xx...`  → `+628xx...`
 * - `+628xx...` → kept as-is
 *
 * Returns the normalized string, or the original input if it doesn't match
 * any known Indonesian pattern.
 */
export function normalizePhoneToE164(phone: string): string {
  // Remove all whitespace and dashes for tolerance
  const cleaned = phone.replace(/[\s\-()]/g, "");

  if (cleaned.startsWith("+628")) {
    // Already E.164
    return cleaned;
  }

  if (cleaned.startsWith("08")) {
    // Local format: 08xx → +628xx
    return "+62" + cleaned.slice(1);
  }

  if (cleaned.startsWith("628")) {
    // Missing leading +
    return "+" + cleaned;
  }

  // Unknown format — return cleaned but unmodified
  return cleaned;
}
