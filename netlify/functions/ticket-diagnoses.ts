import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { authenticateStaff } from "./_shared/authMiddleware";
import { success, error, methodNotAllowed } from "./_shared/responseHelper";
import { getSupabaseAdmin } from "./_shared/supabaseClient";
import { logAudit } from "./_shared/auditLogger";
import { createDiagnosisSchema } from "../../shared/validators/index";

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

    // GET /api/ticket-diagnoses?ticket_id=UUID
    if (httpMethod === "GET") {
      const ticketId = event.queryStringParameters?.ticket_id;
      if (!ticketId) {
        return error("ticket_id query parameter wajib diisi", 400);
      }

      const { data, error: dbError } = await supabase
        .from("repair_diagnoses")
        .select("*, technician:profiles!technician_id(id, full_name)")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });

      if (dbError) {
        console.error("Error fetching diagnoses:", dbError);
        return error("Gagal mengambil data diagnosis", 500);
      }

      return success(data || []);
    }

    // POST /api/ticket-diagnoses
    if (httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const ticketId = body.ticket_id || event.queryStringParameters?.ticket_id;

      if (!ticketId) {
        return error("ticket_id wajib diisi", 400);
      }

      const validation = createDiagnosisSchema.safeParse(body);
      if (!validation.success) {
        return error("Validasi gagal", 400, validation.error.errors);
      }

      const validatedData = validation.data;

      // Verify ticket exists
      const { data: ticket, error: ticketError } = await supabase
        .from("repair_tickets")
        .select("id, ticket_number, assigned_technician_id")
        .eq("id", ticketId)
        .single();

      if (ticketError || !ticket) {
        return error("Tiket tidak ditemukan", 404);
      }

      const { data: diagnosis, error: dbError } = await supabase
        .from("repair_diagnoses")
        .insert({
          ticket_id: ticketId,
          technician_id: user.id,
          diagnosis: validatedData.diagnosis,
          recommended_action: validatedData.recommended_action,
          visibility: validatedData.visibility || "INTERNAL",
        })
        .select("*, technician:profiles!technician_id(id, full_name)")
        .single();

      if (dbError) {
        console.error("Error creating diagnosis:", dbError);
        return error("Gagal menyimpan diagnosis", 500);
      }

      await logAudit({
        actor_type: user.role,
        actor_id: user.id,
        action: "CREATE_DIAGNOSIS",
        entity_type: "repair_diagnoses",
        entity_id: diagnosis.id,
        metadata: {
          ticket_id: ticketId,
          ticket_number: ticket.ticket_number,
          visibility: diagnosis.visibility,
        },
      });

      return success(diagnosis, 201);
    }
  } catch (err: any) {
    console.error("Error in /api/ticket-diagnoses:", err);
    return error("Terjadi kesalahan server", 500);
  }

  return error("Terjadi kesalahan server", 500);
};

export { handler };
