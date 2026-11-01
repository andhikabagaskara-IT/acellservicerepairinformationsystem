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
    const passed = Boolean(body.passed);
    const notes = body.notes?.trim() || "";

    if (!ticketId) {
      return error("ticket_id wajib diisi", 400);
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

    if (ticket.status !== "QUALITY_CHECK") {
      return error(
        `Tiket belum berada pada tahap Quality Check (status saat ini: ${ticket.status})`,
        400
      );
    }

    const nextStatus = passed ? "READY_FOR_PICKUP" : "IN_REPAIR";
    const qcResultText = passed ? "LULUS" : "TIDAK LULUS";
    const updateMessage = notes
      ? `[Quality Control ${qcResultText}]: ${notes}`
      : `[Quality Control ${qcResultText}]: Pemeriksaan fungsi pasca-perbaikan selesai.`;

    // Update ticket status
    const { data: updatedTicket, error: updateError } = await supabase
      .from("repair_tickets")
      .update({ status: nextStatus })
      .eq("id", ticketId)
      .select("*, customers(*), devices(*)")
      .single();

    if (updateError) {
      console.error("Error updating ticket after QC:", updateError);
      return error("Gagal memperbarui status hasil Quality Check", 500);
    }

    // Add progress update record
    await supabase.from("ticket_updates").insert({
      ticket_id: ticketId,
      author_id: user.id,
      author_name_snapshot: user.full_name,
      message: updateMessage,
      visibility: "PUBLIC",
    });

    await logAudit({
      actor_type: user.role,
      actor_id: user.id,
      action: "QUALITY_CHECK_CONFIRMATION",
      entity_type: "repair_tickets",
      entity_id: ticketId,
      metadata: {
        ticket_number: ticket.ticket_number,
        passed: passed,
        new_status: nextStatus,
        notes: notes || null,
        inspector_name: user.full_name,
      },
    });

    return success(updatedTicket);
  } catch (err: any) {
    console.error("Error in POST /api/ticket-quality-check:", err);
    return error("Terjadi kesalahan server", 500);
  }
};

export { handler };
