import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { authenticateStaff } from "./_shared/authMiddleware";
import { success, error, methodNotAllowed } from "./_shared/responseHelper";
import { getSupabaseAdmin } from "./_shared/supabaseClient";
import { logAudit } from "./_shared/auditLogger";
import { createTicketSchema } from "../../shared/validators/index";

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

    const validation = createTicketSchema.safeParse(body);
    if (!validation.success) {
      return error("Validasi gagal", 400, validation.error.errors);
    }

    const validatedData = validation.data;
    const initialStatus = validatedData.assigned_technician_id ? "INSPECTION" : "WAITING_ASSIGNMENT";

    // Step 1: Insert repair ticket
    const { data: ticket, error: insertError } = await supabase
      .from("repair_tickets")
      .insert({
        customer_id: validatedData.customer_id,
        device_id: validatedData.device_id,
        created_by: user.id,
        assigned_technician_id: validatedData.assigned_technician_id || null,
        status: initialStatus,
        customer_complaint: validatedData.customer_complaint,
        intake_condition: validatedData.intake_condition,
        accessories_received: validatedData.accessories_received || null,
        device_pin_or_passcode: validatedData.device_pin_or_passcode || null,
        estimated_completion_at: validatedData.estimated_completion_at || null,
      })
      .select("*, customers(*), devices(*)")
      .single();

    if (insertError || !ticket) {
      console.error("Error creating ticket:", insertError);
      return error("Gagal membuat tiket servis", 500);
    }

    // Step 2: If technician was assigned on intake, create assignment record
    if (validatedData.assigned_technician_id) {
      const { error: assignError } = await supabase
        .from("ticket_assignments")
        .insert({
          ticket_id: ticket.id,
          technician_id: validatedData.assigned_technician_id,
          assigned_by: user.id,
          assignment_type: "ADMIN_MANUAL",
        });

      if (assignError) {
        console.error("Error creating initial ticket assignment:", assignError);
      }
    }

    // Step 3: Log audit
    await logAudit({
      actor_type: user.role,
      actor_id: user.id,
      action: "CREATE_TICKET",
      entity_type: "repair_tickets",
      entity_id: ticket.id,
      metadata: {
        ticket_number: ticket.ticket_number,
        customer_id: ticket.customer_id,
        device_id: ticket.device_id,
        status: ticket.status,
        assigned_technician_id: ticket.assigned_technician_id,
      },
    });

    return success(ticket, 201);
  } catch (err: any) {
    console.error("Error in POST /api/tickets:", err);
    return error("Terjadi kesalahan server", 500);
  }
};

export { handler };
