import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { authenticateStaff } from "./_shared/authMiddleware";
import { success, error, methodNotAllowed } from "./_shared/responseHelper";
import { getSupabaseAdmin } from "./_shared/supabaseClient";
import { logAudit } from "./_shared/auditLogger";
import { normalizePhoneToE164 } from "./_shared/phoneHelper";
import { createCustomerSchema } from "../../shared/validators/index";

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

    // GET /api/customers — Search customers by phone or name
    if (httpMethod === "GET") {
      const phone = event.queryStringParameters?.phone;
      const name = event.queryStringParameters?.name;

      let query = supabase.from("customers").select("*").order("created_at", { ascending: false }).limit(20);

      if (phone) {
        query = query.ilike("phone_e164", `%${phone}%`);
      } else if (name) {
        query = query.ilike("name", `%${name}%`);
      }

      const { data, error: dbError } = await query;

      if (dbError) {
        console.error("Error searching customers:", dbError);
        return error("Gagal mencari pelanggan", 500);
      }

      return success(data);
    }

    // POST /api/customers — Create a new customer
    if (httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");

      // Normalize phone before validation if provided
      if (body.phone_e164) {
        body.phone_e164 = normalizePhoneToE164(body.phone_e164);
      } else if (body.phone) {
        body.phone_e164 = normalizePhoneToE164(body.phone);
      }

      const validation = createCustomerSchema.safeParse(body);
      if (!validation.success) {
        return error("Validasi gagal", 400, validation.error.errors);
      }

      const validatedData = validation.data;

      const { data: customer, error: dbError } = await supabase
        .from("customers")
        .insert({
          name: validatedData.name,
          phone_e164: validatedData.phone_e164,
          email: validatedData.email || null,
          notes: validatedData.notes || null,
        })
        .select()
        .single();

      if (dbError) {
        console.error("Error creating customer:", dbError);
        if (dbError.code === "23505") {
          return error("Nomor telepon sudah terdaftar untuk pelanggan lain", 409);
        }
        return error("Gagal membuat data pelanggan", 500);
      }

      await logAudit({
        actor_type: user.role,
        actor_id: user.id,
        action: "CREATE_CUSTOMER",
        entity_type: "customers",
        entity_id: customer.id,
        metadata: { name: customer.name, phone_e164: customer.phone_e164 },
      });

      return success(customer, 201);
    }
  } catch (err: any) {
    console.error("Error in /api/customers:", err);
    return error("Terjadi kesalahan server", 500);
  }

  return error("Terjadi kesalahan server", 500);
};

export { handler };
