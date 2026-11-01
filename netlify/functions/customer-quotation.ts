import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { authenticateCustomer } from "./_shared/customerAuthMiddleware";
import { success, error, methodNotAllowed } from "./_shared/responseHelper";
import { getSupabaseAdmin } from "./_shared/supabaseClient";

const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  if (event.httpMethod !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  try {
    const auth = await authenticateCustomer(event);
    if (auth.error) {
      return auth.error;
    }
    const session = auth.session;
    const supabase = getSupabaseAdmin();

    // Fetch latest published quotation
    const { data: quotation, error: qError } = await supabase
      .from("repair_quotations")
      .select(
        `
        id,
        version,
        labor_cost,
        parts_cost,
        total_cost,
        status,
        created_at,
        items:quotation_items (
          id,
          description,
          quantity,
          unit_price,
          line_total
        )
      `
      )
      .eq("ticket_id", session.ticket_id)
      .eq("status", "PUBLISHED")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (qError) {
      console.error("Error fetching customer quotation:", qError);
      return error("Gagal mengambil rincian biaya", 500);
    }

    // Fetch negotiation history for this ticket
    const { data: negotiations, error: nError } = await supabase
      .from("quotation_negotiations")
      .select("id, message, created_at, customer_session_id")
      .eq("ticket_id", session.ticket_id)
      .order("created_at", { ascending: true });

    if (nError) {
      console.error("Error fetching negotiations:", nError);
    }

    return success({
      ticket_number: session.ticket_number,
      quotation: quotation || null,
      negotiations: (negotiations || []).map((n) => ({
        id: n.id,
        message: n.message,
        created_at: n.created_at,
        is_my_message: n.customer_session_id === session.session_id,
      })),
    });
  } catch (err: any) {
    console.error("Error in GET /api/customer-quotation:", err);
    return error("Terjadi kesalahan server", 500);
  }
};

export { handler };
