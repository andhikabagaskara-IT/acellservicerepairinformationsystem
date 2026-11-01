import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { authenticateCustomer, buildClearSessionCookie } from "./_shared/customerAuthMiddleware";
import { success, error, methodNotAllowed } from "./_shared/responseHelper";
import { getSupabaseAdmin } from "./_shared/supabaseClient";

const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  if (event.httpMethod !== "POST") {
    return methodNotAllowed(["POST"]);
  }

  try {
    const auth = await authenticateCustomer(event);
    const clearCookieHeader = buildClearSessionCookie();

    // Even if session is already invalid, always return clear cookie header
    if (!auth.error && auth.session) {
      const supabase = getSupabaseAdmin();
      await supabase
        .from("customer_ticket_access_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", auth.session.session_id);
    }

    return success(
      { message: "Sesi monitoring berhasil diakhiri" },
      200,
      { "Set-Cookie": clearCookieHeader }
    );
  } catch (err: any) {
    console.error("Error in POST /api/customer-logout:", err);
    return error("Terjadi kesalahan server", 500);
  }
};

export { handler };
