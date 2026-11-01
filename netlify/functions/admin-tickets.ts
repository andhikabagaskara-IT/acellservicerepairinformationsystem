import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { authenticateStaff } from "./_shared/authMiddleware";
import { paginated, error, methodNotAllowed } from "./_shared/responseHelper";
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

    const status = event.queryStringParameters?.status;
    const technicianId = event.queryStringParameters?.technician_id;
    const page = Math.max(1, parseInt(event.queryStringParameters?.page || "1", 10));
    const perPage = Math.min(100, Math.max(1, parseInt(event.queryStringParameters?.per_page || "15", 10)));
    const offset = (page - 1) * perPage;

    let query = supabase
      .from("repair_tickets")
      .select(
        `
        *,
        customers (*),
        devices (*),
        assigned_technician:profiles!assigned_technician_id (
          id,
          full_name,
          phone_e164
        ),
        created_by_profile:profiles!created_by (
          id,
          full_name
        )
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + perPage - 1);

    if (status) {
      query = query.eq("status", status);
    }

    if (technicianId) {
      query = query.eq("assigned_technician_id", technicianId);
    }

    const { data, count, error: dbError } = await query;

    if (dbError) {
      console.error("Error fetching tickets:", dbError);
      return error("Gagal mengambil daftar tiket", 500);
    }

    return paginated(data || [], page, perPage, count || 0);
  } catch (err: any) {
    console.error("Error in GET /api/admin/tickets:", err);
    return error("Terjadi kesalahan server", 500);
  }
};

export { handler };
