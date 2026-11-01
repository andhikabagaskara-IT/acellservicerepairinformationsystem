import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { authenticateAdmin } from "./_shared/authMiddleware";
import { success, error, methodNotAllowed } from "./_shared/responseHelper";
import { getSupabaseAdmin } from "./_shared/supabaseClient";
import { logAudit } from "./_shared/auditLogger";

const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  if (event.httpMethod !== "POST") {
    return methodNotAllowed(["POST"]);
  }

  try {
    const auth = await authenticateAdmin(event);
    if (auth.error) {
      return auth.error;
    }
    const adminUser = auth.user;
    const supabase = getSupabaseAdmin();

    const body = JSON.parse(event.body || "{}");
    const ticketId = body.ticket_id || event.queryStringParameters?.ticket_id;
    const technicianId = body.technician_id;

    if (!ticketId || !technicianId) {
      return error("ticket_id dan technician_id wajib diisi", 400);
    }

    // Verify technician exists and has role TECHNICIAN
    const { data: techProfile, error: techError } = await supabase
      .from("profiles")
      .select("id, full_name, role, is_active")
      .eq("id", technicianId)
      .single();

    if (techError || !techProfile) {
      return error("Teknisi tidak ditemukan", 404);
    }

    if (!techProfile.is_active) {
      return error("Akun teknisi tersebut tidak aktif", 400);
    }

    // Verify ticket exists
    const { data: ticket, error: ticketError } = await supabase
      .from("repair_tickets")
      .select("id, ticket_number, status, assigned_technician_id")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return error("Tiket servis tidak ditemukan", 404);
    }

    if (ticket.status === "COMPLETED" || ticket.status === "CANCELLED") {
      return error(`Tidak dapat menugaskan teknisi untuk tiket yang sudah ${ticket.status}`, 400);
    }

    const nextStatus = (ticket.status === "WAITING_ASSIGNMENT" || ticket.status === "INTAKE")
      ? "INSPECTION"
      : ticket.status;

    // Update ticket
    const { data: updatedTicket, error: updateError } = await supabase
      .from("repair_tickets")
      .update({
        assigned_technician_id: technicianId,
        status: nextStatus,
      })
      .eq("id", ticketId)
      .select("*, customers(*), devices(*), assigned_technician:profiles!assigned_technician_id(*)")
      .single();

    if (updateError) {
      console.error("Error updating ticket assignment:", updateError);
      return error("Gagal memperbarui penugasan tiket", 500);
    }

    // Record assignment history
    await supabase.from("ticket_assignments").insert({
      ticket_id: ticketId,
      technician_id: technicianId,
      assigned_by: adminUser.id,
      assignment_type: ticket.assigned_technician_id ? "REASSIGNED" : "ADMIN_MANUAL",
    });

    await logAudit({
      actor_type: "ADMIN",
      actor_id: adminUser.id,
      action: "ASSIGN_TICKET",
      entity_type: "repair_tickets",
      entity_id: ticketId,
      metadata: {
        ticket_number: ticket.ticket_number,
        technician_id: technicianId,
        technician_name: techProfile.full_name,
        previous_technician_id: ticket.assigned_technician_id,
        new_status: nextStatus,
      },
    });

    return success(updatedTicket);
  } catch (err: any) {
    console.error("Error in POST /api/admin-assign:", err);
    return error("Terjadi kesalahan server", 500);
  }
};

export { handler };
