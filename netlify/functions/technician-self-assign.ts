import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { authenticateStaff } from "./_shared/authMiddleware";
import { success, error, methodNotAllowed } from "./_shared/responseHelper";
import { getSupabaseAdmin } from "./_shared/supabaseClient";
import { logAudit } from "./_shared/auditLogger";

const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  if (event.httpMethod !== "POST") {
    return methodNotAllowed(["POST"]);
  }

  try {
    const auth = await authenticateStaff(event);
    if (auth.error) {
      return auth.error;
    }
    const user = auth.user;
    const supabase = getSupabaseAdmin();

    const body = JSON.parse(event.body || "{}");
    const ticketId = body.ticket_id || event.queryStringParameters?.ticket_id;

    if (!ticketId) {
      return error("ticket_id wajib diisi", 400);
    }

    // Verify ticket exists and is available for self-assignment
    const { data: ticket, error: ticketError } = await supabase
      .from("repair_tickets")
      .select("id, ticket_number, status, assigned_technician_id")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return error("Tiket servis tidak ditemukan", 404);
    }

    if (ticket.assigned_technician_id) {
      return error("Tiket ini sudah diambil atau ditugaskan ke teknisi lain", 409);
    }

    if (ticket.status !== "WAITING_ASSIGNMENT" && ticket.status !== "INTAKE") {
      return error(`Tiket dengan status ${ticket.status} tidak dapat diambil dari antrean`, 400);
    }

    // Update ticket to INSPECTION and assign to current technician
    const { data: updatedTicket, error: updateError } = await supabase
      .from("repair_tickets")
      .update({
        assigned_technician_id: user.id,
        status: "INSPECTION",
      })
      .eq("id", ticketId)
      .select("*, customers(*), devices(*)")
      .single();

    if (updateError) {
      console.error("Error self-assigning ticket:", updateError);
      return error("Gagal mengambil tiket servis", 500);
    }

    // Record assignment
    await supabase.from("ticket_assignments").insert({
      ticket_id: ticketId,
      technician_id: user.id,
      assigned_by: null,
      assignment_type: "SELF_ASSIGNED",
    });

    await logAudit({
      actor_type: user.role,
      actor_id: user.id,
      action: "SELF_ASSIGN_TICKET",
      entity_type: "repair_tickets",
      entity_id: ticketId,
      metadata: {
        ticket_number: ticket.ticket_number,
        technician_name: user.full_name,
        new_status: "INSPECTION",
      },
    });

    return success(updatedTicket);
  } catch (err: any) {
    console.error("Error in POST /api/technician-self-assign:", err);
    return error("Terjadi kesalahan server", 500);
  }
};

export { handler };
