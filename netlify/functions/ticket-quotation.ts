import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { authenticateStaff } from "./_shared/authMiddleware";
import { success, error, methodNotAllowed } from "./_shared/responseHelper";
import { getSupabaseAdmin } from "./_shared/supabaseClient";
import { logAudit } from "./_shared/auditLogger";
import { createQuotationSchema } from "../../shared/validators/index";

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

    // GET /api/ticket-quotation?ticket_id=UUID
    if (httpMethod === "GET") {
      const ticketId = event.queryStringParameters?.ticket_id;
      if (!ticketId) {
        return error("ticket_id query parameter wajib diisi", 400);
      }

      // Fetch quotations
      const { data: quotations, error: qError } = await supabase
        .from("repair_quotations")
        .select("*, items:quotation_items (*), creator:profiles!created_by (id, full_name)")
        .eq("ticket_id", ticketId)
        .order("version", { ascending: false });

      if (qError) {
        console.error("Error fetching quotations:", qError);
        return error("Gagal mengambil rincian penawaran biaya", 500);
      }

      // Fetch negotiations
      const { data: negotiations, error: nError } = await supabase
        .from("quotation_negotiations")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (nError) {
        console.error("Error fetching negotiations:", nError);
      }

      const latestQuotation = quotations && quotations.length > 0 ? quotations[0] : null;

      return success({
        quotation: latestQuotation,
        all_versions: quotations || [],
        negotiations: negotiations || [],
      });
    }

    // POST /api/ticket-quotation
    if (httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const ticketId = body.ticket_id || event.queryStringParameters?.ticket_id;

      if (!ticketId) {
        return error("ticket_id wajib diisi", 400);
      }

      const validation = createQuotationSchema.safeParse(body);
      if (!validation.success) {
        return error("Validasi gagal", 400, validation.error.errors);
      }

      const validatedData = validation.data;

      // Verify ticket exists
      const { data: ticket, error: ticketError } = await supabase
        .from("repair_tickets")
        .select("id, ticket_number, status")
        .eq("id", ticketId)
        .single();

      if (ticketError || !ticket) {
        return error("Tiket servis tidak ditemukan", 404);
      }

      // Calculate parts cost and total
      let partsCost = 0;
      const calculatedItems = validatedData.items.map((item) => {
        const lineTotal = item.quantity * item.unit_price;
        partsCost += lineTotal;
        return {
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: lineTotal,
        };
      });

      const laborCost = validatedData.labor_cost;
      const totalCost = laborCost + partsCost;

      // Supersede previous published quotations
      await supabase
        .from("repair_quotations")
        .update({ status: "SUPERSEDED" })
        .eq("ticket_id", ticketId)
        .eq("status", "PUBLISHED");

      // Count existing versions to determine new version number
      const { count: prevCount } = await supabase
        .from("repair_quotations")
        .select("id", { count: "exact", head: true })
        .eq("ticket_id", ticketId);

      const nextVersion = (prevCount || 0) + 1;

      // Insert new quotation
      const { data: newQuotation, error: insertQError } = await supabase
        .from("repair_quotations")
        .insert({
          ticket_id: ticketId,
          version: nextVersion,
          labor_cost: laborCost,
          parts_cost: partsCost,
          total_cost: totalCost,
          status: "PUBLISHED",
          created_by: user.id,
        })
        .select()
        .single();

      if (insertQError || !newQuotation) {
        console.error("Error creating quotation:", insertQError);
        return error("Gagal menyimpan penawaran biaya", 500);
      }

      // Insert quotation items
      const itemsToInsert = calculatedItems.map((item) => ({
        quotation_id: newQuotation.id,
        ...item,
      }));

      const { data: insertedItems, error: itemsError } = await supabase
        .from("quotation_items")
        .insert(itemsToInsert)
        .select();

      if (itemsError) {
        console.error("Error inserting quotation items:", itemsError);
        return error("Gagal menyimpan rincian suku cadang", 500);
      }

      // Add a ticket update note for visibility
      await supabase.from("ticket_updates").insert({
        ticket_id: ticketId,
        author_id: user.id,
        author_name_snapshot: user.full_name,
        message: `Penawaran biaya perbaikan versi ${nextVersion} telah diterbitkan sebesar Rp ${totalCost.toLocaleString("id-ID")}.`,
        visibility: "PUBLIC",
      });

      await logAudit({
        actor_type: user.role,
        actor_id: user.id,
        action: "CREATE_QUOTATION",
        entity_type: "repair_quotations",
        entity_id: newQuotation.id,
        metadata: {
          ticket_id: ticketId,
          ticket_number: ticket.ticket_number,
          version: nextVersion,
          total_cost: totalCost,
          items_count: itemsToInsert.length,
        },
      });

      return success(
        {
          ...newQuotation,
          items: insertedItems,
        },
        201
      );
    }
  } catch (err: any) {
    console.error("Error in /api/ticket-quotation:", err);
    return error("Terjadi kesalahan server", 500);
  }

  return error("Terjadi kesalahan server", 500);
};

export { handler };
