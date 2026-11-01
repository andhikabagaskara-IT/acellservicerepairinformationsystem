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
        devices (
          brand,
          model,
          device_type,
          color
        ),
        customers (
          name
        )
      `
      )
      .eq("id", session.ticket_id)
      .single();

    if (dbError || !ticket) {
      return error("Tiket servis tidak ditemukan", 404);
    }

    return success({
      authenticated: true,
      ticket_id: ticket.id,
      ticket_number: ticket.ticket_number,
      status: ticket.status,
      customer_name: (ticket as any).customers?.name,
      device: (ticket as any).devices,
      customer_complaint: ticket.customer_complaint,
      intake_condition: ticket.intake_condition,
      accessories_received: ticket.accessories_received,
      estimated_completion_at: ticket.estimated_completion_at,
      received_at: ticket.received_at,
    });
  } catch (err: any) {
    console.error("Error in GET /api/customer-session:", err);
    return error("Terjadi kesalahan server", 500);
  }
};

export { handler };
