import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { randomBytes } from "crypto";
import { success, error, methodNotAllowed } from "./_shared/responseHelper";
import { getSupabaseAdmin } from "./_shared/supabaseClient";
import { normalizePhoneToE164 } from "./_shared/phoneHelper";
import { hashToken, buildSessionCookie } from "./_shared/customerAuthMiddleware";
import { customerLoginSchema } from "../../shared/validators/index";
import { logAudit } from "./_shared/auditLogger";

const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  if (event.httpMethod !== "POST") {
    return methodNotAllowed(["POST"]);
  }

  try {
    const supabase = getSupabaseAdmin();
    const body = JSON.parse(event.body || "{}");

    // Normalize phone format first
    if (body.phone_e164) {
      body.phone_e164 = normalizePhoneToE164(body.phone_e164);
    } else if (body.phone) {
      body.phone_e164 = normalizePhoneToE164(body.phone);
    }

    const validation = customerLoginSchema.safeParse(body);
    if (!validation.success) {
      return error("Nomor tiket atau nomor WhatsApp tidak sesuai format", 400, validation.error.errors);
    }

    const { ticket_number, phone_e164 } = validation.data;

    // Look up ticket with customer phone match
    const { data: ticket, error: ticketError } = await supabase
      .from("repair_tickets")
      .select(
        `
        id,
        ticket_number,
        status,
        customer_id,
        customers!inner (
          id,
          name,
          phone_e164
        ),
        devices (
          brand,
          model,
          device_type
        )
      `
      )
      .eq("ticket_number", ticket_number.trim().toUpperCase())
      .single();

    if (ticketError || !ticket) {
      return error("Nomor tiket atau nomor WhatsApp tidak cocok dengan data servis", 401);
    }

    // Verify phone matches exactly
    const customer = (ticket as any).customers;
    if (customer.phone_e164 !== phone_e164) {
      return error("Nomor tiket atau nomor WhatsApp tidak cocok dengan data servis", 401);
    }

    // Check if ticket is already completed
    if (ticket.status === "COMPLETED") {
      return error("Tiket perbaikan ini telah selesai diserahterimakan. Sesi portal telah ditutup.", 403);
    }

    // Generate cryptographic token (64 hex characters)
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);

    // Set 7 days absolute expiry
    const maxAgeSeconds = 7 * 24 * 60 * 60;
    const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000).toISOString();

    const userAgent = event.headers["user-agent"] || "unknown";

    // Insert session into database
    const { error: sessionError } = await supabase
      .from("customer_ticket_access_sessions")
      .insert({
        ticket_id: ticket.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        user_agent_summary: userAgent.slice(0, 150),
      });

    if (sessionError) {
      console.error("Error creating customer session:", sessionError);
      return error("Gagal membuat sesi login monitoring", 500);
    }

    await logAudit({
      actor_type: "CUSTOMER",
      actor_id: null,
      action: "CUSTOMER_LOGIN",
      entity_type: "repair_tickets",
      entity_id: ticket.id,
      metadata: {
        ticket_number: ticket.ticket_number,
        customer_phone_snapshot: phone_e164,
      },
    });

    const cookieHeader = buildSessionCookie(rawToken, maxAgeSeconds);

    return success(
      {
        ticket_number: ticket.ticket_number,
        status: ticket.status,
        customer_name: customer.name,
        device: (ticket as any).devices,
      },
      200,
      {
        "Set-Cookie": cookieHeader,
      }
    );
  } catch (err: any) {
    console.error("Error in POST /api/customer-login:", err);
    return error("Terjadi kesalahan server", 500);
  }
};

export { handler };
