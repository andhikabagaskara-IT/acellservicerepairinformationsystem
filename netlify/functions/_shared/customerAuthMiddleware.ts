import type { HandlerEvent, HandlerResponse } from "@netlify/functions";
import { createHmac } from "crypto";
import { getSupabaseAdmin } from "./supabaseClient";
import { error } from "./responseHelper";

export interface CustomerSession {
  session_id: string;
  ticket_id: string;
  ticket_number: string;
  ticket_status: string;
  customer_id: string;
}

export interface CustomerAuthSuccess {
  session: CustomerSession;
  error: null;
}

export interface CustomerAuthFailure {
  session: null;
  error: HandlerResponse;
}

export type CustomerAuthResult = CustomerAuthSuccess | CustomerAuthFailure;

const COOKIE_NAME = "aris_customer_session";

/**
 * Extracts the `aris_customer_session` cookie, hashes the token value,
 * looks up the hash in `customer_ticket_access_sessions`, and verifies:
 * - Session exists
 * - Session has not been revoked
 * - Session has not expired
 * - The linked ticket is not COMPLETED
 */
export async function authenticateCustomer(
  event: HandlerEvent
): Promise<CustomerAuthResult> {
  const cookieHeader = event.headers["cookie"] || event.headers["Cookie"] || "";
  const token = parseCookie(cookieHeader, COOKIE_NAME);

  if (!token) {
    return {
      session: null,
      error: error("Sesi monitoring tidak ditemukan. Silakan login kembali.", 401),
    };
  }

  const tokenHash = hashToken(token);
  const supabase = getSupabaseAdmin();

  // Look up session by token hash
  const { data: session, error: sessionError } = await supabase
    .from("customer_ticket_access_sessions")
    .select(
      `
      id,
      ticket_id,
      expires_at,
      revoked_at,
      repair_tickets!inner (
        ticket_number,
        status,
        customer_id
      )
    `
    )
    .eq("token_hash", tokenHash)
    .single();

  if (sessionError || !session) {
    return {
      session: null,
      error: error("Sesi tidak valid. Silakan login kembali dengan nomor tiket dan WhatsApp.", 401),
    };
  }

  // Check revocation
  if (session.revoked_at) {
    return {
      session: null,
      error: error("Sesi Anda telah dicabut. Silakan login kembali.", 401),
    };
  }

  // Check expiry
  const now = new Date();
  if (new Date(session.expires_at) < now) {
    return {
      session: null,
      error: error("Sesi Anda telah kedaluwarsa. Silakan login kembali.", 401),
    };
  }

  // Check ticket status — must not be COMPLETED
  const ticket = (session as any).repair_tickets;
  if (ticket.status === "COMPLETED") {
    return {
      session: null,
      error: error("Tiket servis Anda telah selesai. Sesi monitoring berakhir.", 403),
    };
  }

  // Update last_seen_at (fire and forget, non-blocking)
  supabase
    .from("customer_ticket_access_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", session.id)
    .then(() => {});

  return {
    session: {
      session_id: session.id,
      ticket_id: session.ticket_id,
      ticket_number: ticket.ticket_number,
      ticket_status: ticket.status,
      customer_id: ticket.customer_id,
    },
    error: null,
  };
}

/**
 * Hashes a raw session token using HMAC-SHA256 with the pepper.
 */
export function hashToken(rawToken: string): string {
  const pepper = process.env.CUSTOMER_SESSION_PEPPER || "default-pepper-change-me";
  return createHmac("sha256", pepper).update(rawToken).digest("hex");
}

/**
 * Builds a Set-Cookie header string for the customer session.
 */
export function buildSessionCookie(
  token: string,
  maxAgeSeconds: number
): string {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    `Path=/api/customer`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${maxAgeSeconds}`,
  ];

  // Add Secure flag in production
  if (process.env.NODE_ENV === "production" || process.env.CONTEXT === "production") {
    parts.push("Secure");
  }

  return parts.join("; ");
}

/**
 * Builds a Set-Cookie header that clears/expires the session cookie.
 */
export function buildClearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/api/customer; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/**
 * Parses a specific cookie value from a cookie header string.
 */
function parseCookie(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
