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
    const supabase = getSupabaseAdmin();

    const { data: queue, error: dbError } = await supabase
      .from("repair_tickets")
      .select(
        `
        *,
        customers (*),
        devices (*),
        created_by_profile:profiles!created_by (full_name)
      `
      )
      .is("assigned_technician_id", null)
      .eq("status", "WAITING_ASSIGNMENT")
      .order("created_at", { ascending: true });

    if (dbError) {
      console.error("Error fetching technician queue:", dbError);
      return error("Gagal mengambil antrean tiket bebas", 500);
    }

    return success(queue || []);
  } catch (err: any) {
    console.error("Error in GET /api/technician-queue:", err);
    return error("Terjadi kesalahan server", 500);
  }
};

export { handler };
