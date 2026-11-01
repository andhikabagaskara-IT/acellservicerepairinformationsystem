import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { authenticateStaff } from "./_shared/authMiddleware";
import { success, error, methodNotAllowed } from "./_shared/responseHelper";
import { getSupabaseAdmin } from "./_shared/supabaseClient";
import { logAudit } from "./_shared/auditLogger";

const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  const httpMethod = event.httpMethod;

  if (httpMethod !== "GET" && httpMethod !== "POST") {
    return methodNotAllowed(["GET", "POST"]);
  }

  try {
    const auth = await authenticateStaff(event);
    if (auth.error) {
      return auth.error;
    }
    const user = auth.user;
    const supabase = getSupabaseAdmin();

    // GET /api/ticket-updates?ticket_id=UUID
    if (httpMethod === "GET") {
      const ticketId = event.queryStringParameters?.ticket_id;
      if (!ticketId) {
        return error("ticket_id query parameter wajib diisi", 400);
      }

      const { data, error: dbError } = await supabase
        .from("ticket_updates")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });

      if (dbError) {
        console.error("Error fetching ticket updates:", dbError);
        return error("Gagal mengambil catatan progres", 500);
      }

      return success(data || []);
    }

    // POST /api/ticket-updates
    if (httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const ticketId = body.ticket_id || event.queryStringParameters?.ticket_id;
      const message = body.message?.trim();
      const visibility = body.visibility === "PUBLIC" ? "PUBLIC" : "INTERNAL";

      if (!ticketId) {
        return error("ticket_id wajib diisi", 400);
      }

      if (!message || message.length < 5) {
        return error("Pesan progres minimal 5 karakter", 400);
      }

      if (message.length > 2000) {
        return error("Pesan progres maksimal 2000 karakter", 400);
      }

      // Verify ticket exists
      const { data: ticket, error: ticketError } = await supabase
        .from("repair_tickets")
        .select("id, ticket_number")
        .eq("id", ticketId)
        .single();

      if (ticketError || !ticket) {
        return error("Tiket servis tidak ditemukan", 404);
      }

      const { data: updateRecord, error: insertError } = await supabase
        .from("ticket_updates")
        .insert({
          ticket_id: ticketId,
          author_id: user.id,
          author_name_snapshot: user.full_name,
          message: message,
          visibility: visibility,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating ticket update:", insertError);
        return error("Gagal menyimpan catatan progres", 500);
      }

      await logAudit({
        actor_type: user.role,
        actor_id: user.id,
        action: "CREATE_TICKET_UPDATE",
        entity_type: "ticket_updates",
        entity_id: updateRecord.id,
        metadata: {
          ticket_id: ticketId,
          ticket_number: ticket.ticket_number,
          visibility: visibility,
        },
      });

      return success(updateRecord, 201);
    }
  } catch (err: any) {
    console.error("Error in /api/ticket-updates:", err);
    return error("Terjadi kesalahan server", 500);
  }

  return error("Terjadi kesalahan server", 500);
};

export { handler };
