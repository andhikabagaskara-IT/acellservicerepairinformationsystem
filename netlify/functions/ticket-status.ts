import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { authenticateStaff } from "./_shared/authMiddleware";
import { success, error, methodNotAllowed } from "./_shared/responseHelper";
import { getSupabaseAdmin } from "./_shared/supabaseClient";
import { logAudit } from "./_shared/auditLogger";
import { statusTransitionSchema } from "../../shared/validators/index";
import { TicketStatus } from "../../shared/types/index";

// Allowed state transitions map
const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.INTAKE]: [TicketStatus.WAITING_ASSIGNMENT, TicketStatus.INSPECTION, TicketStatus.CANCELLED],
  [TicketStatus.WAITING_ASSIGNMENT]: [TicketStatus.INSPECTION, TicketStatus.CANCELLED],
  [TicketStatus.INSPECTION]: [
    TicketStatus.WAITING_PARTS,
    TicketStatus.IN_REPAIR,
    TicketStatus.NOT_PROCEEDED,
    TicketStatus.CANCELLED,
  ],
  [TicketStatus.WAITING_PARTS]: [TicketStatus.IN_REPAIR, TicketStatus.NOT_PROCEEDED, TicketStatus.CANCELLED],
  [TicketStatus.IN_REPAIR]: [
    TicketStatus.QUALITY_CHECK,
    TicketStatus.WAITING_PARTS,
    TicketStatus.NOT_PROCEEDED,
    TicketStatus.CANCELLED,
  ],
  [TicketStatus.QUALITY_CHECK]: [TicketStatus.READY_FOR_PICKUP, TicketStatus.IN_REPAIR],
  [TicketStatus.READY_FOR_PICKUP]: [TicketStatus.COMPLETED],
  [TicketStatus.COMPLETED]: [],
  [TicketStatus.CANCELLED]: [],
  [TicketStatus.NOT_PROCEEDED]: [],
};

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

    const validation = statusTransitionSchema.safeParse(body);
    if (!validation.success) {
      return error("Validasi gagal", 400, validation.error.errors);
    }

    const { new_status, reason_or_note } = validation.data;

    // Fetch current ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("repair_tickets")
      .select("id, ticket_number, status, assigned_technician_id")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return error("Tiket servis tidak ditemukan", 404);
    }

    // Role check: Technician can only change status of their assigned tickets
    if (user.role === "TECHNICIAN" && ticket.assigned_technician_id !== user.id) {
      return error("Anda hanya dapat memperbarui status tiket yang ditugaskan kepada Anda", 403);
    }

    const currentStatus = ticket.status as TicketStatus;

    // Check valid transitions
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(new_status as TicketStatus)) {
      return error(
        `Transisi status tidak valid dari ${currentStatus} ke ${new_status}. Pilihan yang diizinkan: ${allowed.join(", ") || "tidak ada"}`,
        400
      );
    }

    const updatePayload: Record<string, any> = {
      status: new_status,
    };

    if (new_status === TicketStatus.COMPLETED) {
      updatePayload.completed_at = new Date().toISOString();
    }

    // Update ticket status
    const { data: updatedTicket, error: updateError } = await supabase
      .from("repair_tickets")
      .update(updatePayload)
      .eq("id", ticketId)
      .select("*, customers(*), devices(*)")
      .single();

    if (updateError) {
      console.error("Error updating ticket status:", updateError);
      return error("Gagal memperbarui status tiket", 500);
    }

    // If reason_or_note was provided, record a ticket update
    if (reason_or_note) {
      await supabase.from("ticket_updates").insert({
        ticket_id: ticketId,
        author_id: user.id,
        author_name_snapshot: user.full_name,
        message: `[Perubahan Status ke ${new_status}]: ${reason_or_note}`,
        visibility: "PUBLIC",
      });
    }

    await logAudit({
      actor_type: user.role,
      actor_id: user.id,
      action: "TRANSITION_STATUS",
      entity_type: "repair_tickets",
      entity_id: ticketId,
      metadata: {
        ticket_number: ticket.ticket_number,
        old_status: currentStatus,
        new_status: new_status,
        reason: reason_or_note || null,
      },
    });

    return success(updatedTicket);
  } catch (err: any) {
    console.error("Error in POST /api/ticket-status:", err);
    return error("Terjadi kesalahan server", 500);
  }
};

export { handler };
