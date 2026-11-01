import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { authenticateCustomer } from "./_shared/customerAuthMiddleware";
import { success, error, methodNotAllowed } from "./_shared/responseHelper";
import { getSupabaseAdmin } from "./_shared/supabaseClient";
import { logAudit } from "./_shared/auditLogger";
import { negotiationSchema } from "../../shared/validators/index";

const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  if (event.httpMethod !== "POST") {
    return methodNotAllowed(["POST"]);
  }

  try {
    const auth = await authenticateCustomer(event);
    if (auth.error) {
      return auth.error;
    }
    const session = auth.session;
    const supabase = getSupabaseAdmin();

    const body = JSON.parse(event.body || "{}");
    const validation = negotiationSchema.safeParse(body);

    if (!validation.success) {
      return error("Validasi pesan negosiasi gagal", 400, validation.error.errors);
    }

    const { message } = validation.data;

    // Check if there is an active published quotation to negotiate
    const { data: quotation, error: qError } = await supabase
      .from("repair_quotations")
      .select("id, version, total_cost")
      .eq("ticket_id", session.ticket_id)
      .eq("status", "PUBLISHED")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (qError || !quotation) {
      return error("Belum ada penawaran biaya aktif yang dapat dinegosiasikan saat ini", 400);
    }

    // Insert negotiation message
    const { data: negotiationRecord, error: insertError } = await supabase
      .from("quotation_negotiations")
      .insert({
        quotation_id: quotation.id,
        ticket_id: session.ticket_id,
        customer_session_id: session.session_id,
        message: message,
      })
      .select()
      .single();

    if (insertError || !negotiationRecord) {
      console.error("Error creating negotiation record:", insertError);
      return error("Gagal mengirim pesan negosiasi", 500);
    }

    // Add a public progress note so technician sees the customer request
    await supabase.from("ticket_updates").insert({
      ticket_id: session.ticket_id,
      author_id: session.ticket_id, // System placeholder for customer
      author_name_snapshot: "Pelanggan",
      message: `[Masukan Negosiasi Biaya]: "${message}"`,
      visibility: "PUBLIC",
    });

    await logAudit({
      actor_type: "CUSTOMER",
      actor_id: null,
      action: "SUBMIT_NEGOTIATION",
      entity_type: "quotation_negotiations",
      entity_id: negotiationRecord.id,
      metadata: {
        ticket_id: session.ticket_id,
        ticket_number: session.ticket_number,
        quotation_id: quotation.id,
        quotation_version: quotation.version,
      },
    });

    return success(
      {
        message: "Pesan negosiasi berhasil dikirim ke teknisi",
        negotiation: negotiationRecord,
      },
      201
    );
  } catch (err: any) {
    console.error("Error in POST /api/customer-negotiation:", err);
    return error("Terjadi kesalahan server", 500);
  }
};

export { handler };
