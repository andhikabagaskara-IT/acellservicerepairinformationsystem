import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { authenticateStaff } from "./_shared/authMiddleware";
import { success, error, methodNotAllowed } from "./_shared/responseHelper";
import { getSupabaseAdmin } from "./_shared/supabaseClient";

const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  if (event.httpMethod !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  try {
    const auth = await authenticateStaff(event);
    if (auth.error) {
      return auth.error;
    }
    const user = auth.user;
    const supabase = getSupabaseAdmin();

    // Query active tickets assigned to this technician
    const { data: tickets, error: dbError } = await supabase
      .from("repair_tickets")
      .select(
        `
        *,
        customers (*),
        devices (*),
        diagnoses:repair_diagnoses (*),
        quotations:repair_quotations (*, items:quotation_items (*))
      `
      )
      .eq("assigned_technician_id", user.id)
      .not("status", "in", '("COMPLETED","CANCELLED","NOT_PROCEEDED")')
      .order("updated_at", { ascending: false });

    if (dbError) {
      console.error("Error fetching technician assignments:", dbError);
      return error("Gagal mengambil daftar pekerjaan teknisi", 500);
    }

    return success(tickets || []);
  } catch (err: any) {
    console.error("Error in GET /api/technician-assignments:", err);
    return error("Terjadi kesalahan server", 500);
  }
};

export { handler };
