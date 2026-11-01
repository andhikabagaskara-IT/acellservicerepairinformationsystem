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
    const recipientName = body.recipient_name?.trim() || body.confirmer_name?.trim();
    const notes = body.notes?.trim() || "";

    if (!ticketId) {
      return error("ticket_id wajib diisi", 400);
    }

    if (!recipientName) {
      return error("Nama penerima unit perangkat wajib diisi", 400);
    }

    // Verify ticket exists
    const { data: ticket, error: ticketError } = await supabase
      .from("repair_tickets")
      .select("id, ticket_number, status, customer_id")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return error("Tiket servis tidak ditemukan", 404);
    }

    if (ticket.status !== "READY_FOR_PICKUP") {
      return error(
        `Serah terima hanya dapat dilakukan untuk unit berstatus SIAP DIAMBIL (status saat ini: ${ticket.status})`,
        400
      );
    }

    const now = new Date().toISOString();

    // Update ticket to COMPLETED
    const { data: updatedTicket, error: updateError } = await supabase
      .from("repair_tickets")
      .update({
        status: "COMPLETED",
        completed_at: now,
      })
      .eq("id", ticketId)
      .select("*, customers(*), devices(*)")
      .single();

    if (updateError) {
      console.error("Error updating ticket handover:", updateError);
      return error("Gagal mengonfirmasi serah terima unit", 500);
    }

    // Add public milestone note
    const handoverMessage = notes
      ? `Unit perangkat telah diserahterimakan kepada ${recipientName}. Catatan: ${notes}`
      : `Unit perangkat telah selesai diserahterimakan dengan sukses kepada ${recipientName}. Terima kasih telah mempercayakan perbaikan kepada Acell Service.`;

    await supabase.from("ticket_updates").insert({
      ticket_id: ticketId,
      author_id: user.id,
      author_name_snapshot: user.full_name,
      message: handoverMessage,
      visibility: "PUBLIC",
    });

    await logAudit({
      actor_type: user.role,
      actor_id: user.id,
      action: "CONFIRM_HANDOVER",
      entity_type: "repair_tickets",
      entity_id: ticketId,
      metadata: {
        ticket_number: ticket.ticket_number,
        recipient_name: recipientName,
        completed_at: now,
        staff_name: user.full_name,
      },
    });

    return success(updatedTicket);
  } catch (err: any) {
    console.error("Error in POST /api/ticket-handover:", err);
    return error("Terjadi kesalahan server", 500);
  }
};

export { handler };
