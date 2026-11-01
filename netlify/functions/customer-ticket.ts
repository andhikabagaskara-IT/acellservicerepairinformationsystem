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

    const { data: ticket, error: dbError } = await supabase
      .from("repair_tickets")
      .select(
        `
        id,
        ticket_number,
        status,
        customer_complaint,
        intake_condition,
        accessories_received,
        estimated_completion_at,
        received_at,
        completed_at,
        devices (
          brand,
          model,
          device_type,
          color
        )
      `
      )
      .eq("id", session.ticket_id)
      .single();

    if (dbError || !ticket) {
      return error("Data servis tidak ditemukan", 404);
    }

    return success(ticket);
  } catch (err: any) {
    console.error("Error in GET /api/customer-ticket:", err);
    return error("Terjadi kesalahan server", 500);
  }
};

export { handler };
