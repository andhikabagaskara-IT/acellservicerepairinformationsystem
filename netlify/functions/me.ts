import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { authenticateStaff } from "./_shared/authMiddleware";
import { success, error, methodNotAllowed } from "./_shared/responseHelper";

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

    return success({
      id: user.id,
      full_name: user.full_name,
      role: user.role,
      phone_e164: user.phone_e164,
      is_active: user.is_active,
    });
  } catch (err: any) {
    console.error("Error in GET /api/me:", err);
    return error("Terjadi kesalahan server", 500);
  }
};

export { handler };
