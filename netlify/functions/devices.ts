import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { authenticateStaff } from "./_shared/authMiddleware";
import { success, error, methodNotAllowed } from "./_shared/responseHelper";
import { getSupabaseAdmin } from "./_shared/supabaseClient";
import { logAudit } from "./_shared/auditLogger";
import { createDeviceSchema } from "../../shared/validators/index";

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

    // GET /api/devices?customer_id=UUID — List devices by customer
    if (httpMethod === "GET") {
      const customerId = event.queryStringParameters?.customer_id;
      let query = supabase.from("devices").select("*").order("created_at", { ascending: false });

      if (customerId) {
        query = query.eq("customer_id", customerId);
      }

      const { data, error: dbError } = await query;
      if (dbError) {
        console.error("Error fetching devices:", dbError);
        return error("Gagal mengambil data perangkat", 500);
      }
      return success(data);
    }

    // POST /api/devices — Register a new device
    if (httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");

      const validation = createDeviceSchema.safeParse(body);
      if (!validation.success) {
        return error("Validasi gagal", 400, validation.error.errors);
      }

      const validatedData = validation.data;

      const { data: device, error: dbError } = await supabase
        .from("devices")
        .insert({
          customer_id: validatedData.customer_id,
          device_type: validatedData.device_type,
          brand: validatedData.brand,
          model: validatedData.model,
          serial_or_imei: validatedData.serial_or_imei || null,
          color: validatedData.color || null,
        })
        .select()
        .single();

      if (dbError) {
        console.error("Error creating device:", dbError);
        return error("Gagal mendaftarkan perangkat", 500);
      }

      await logAudit({
        actor_type: user.role,
        actor_id: user.id,
        action: "CREATE_DEVICE",
        entity_type: "devices",
        entity_id: device.id,
        metadata: {
          customer_id: device.customer_id,
          brand: device.brand,
          model: device.model,
          device_type: device.device_type,
        },
      });

      return success(device, 201);
    }
  } catch (err: any) {
    console.error("Error in /api/devices:", err);
    return error("Terjadi kesalahan server", 500);
  }

  return error("Terjadi kesalahan server", 500);
};

export { handler };
