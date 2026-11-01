import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { authenticateCustomer } from "./_shared/customerAuthMiddleware";
import { success, error, methodNotAllowed } from "./_shared/responseHelper";
import { getSupabaseAdmin } from "./_shared/supabaseClient";

const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  if (event.httpMethod !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  try {
    const auth = await authenticateCustomer(event);
    if (auth.error) {
      return auth.error;
    }
    const session = auth.session;
    const supabase = getSupabaseAdmin();

    // 1. Fetch status history
    const { data: statusHistories, error: statusError } = await supabase
      .from("ticket_status_histories")
      .select("id, old_status, new_status, reason_or_note, created_at")
      .eq("ticket_id", session.ticket_id)
      .order("created_at", { ascending: true });

    if (statusError) {
      console.error("Error fetching status histories:", statusError);
    }

    // 2. Fetch public progress notes
    const { data: publicUpdates, error: updatesError } = await supabase
      .from("ticket_updates")
      .select("id, author_name_snapshot, message, created_at")
      .eq("ticket_id", session.ticket_id)
      .eq("visibility", "PUBLIC")
      .order("created_at", { ascending: true });

    if (updatesError) {
      console.error("Error fetching public updates:", updatesError);
    }

    // 3. Fetch public diagnoses
    const { data: publicDiagnoses, error: diagError } = await supabase
      .from("repair_diagnoses")
      .select("id, diagnosis, recommended_action, created_at")
      .eq("ticket_id", session.ticket_id)
      .eq("visibility", "PUBLIC")
      .order("created_at", { ascending: true });

    if (diagError) {
      console.error("Error fetching public diagnoses:", diagError);
    }

    // 4. Fetch public photo attachments with short-lived signed URLs (15 minutes)
    const { data: attachments, error: attError } = await supabase
      .from("ticket_attachments")
      .select("id, object_path, original_file_name, mime_type, file_size, created_at")
      .eq("ticket_id", session.ticket_id)
      .eq("visibility", "PUBLIC")
      .order("created_at", { ascending: true });

    if (attError) {
      console.error("Error fetching public attachments:", attError);
    }

    const photosWithUrls = await Promise.all(
      (attachments || []).map(async (att) => {
        const { data: signedData } = await supabase.storage
          .from("repair-attachments")
          .createSignedUrl(att.object_path, 900);

        return {
          id: att.id,
          file_name: att.original_file_name,
          mime_type: att.mime_type,
          file_size: att.file_size,
          created_at: att.created_at,
          url: signedData?.signedUrl || null,
        };
      })
    );

    return success({
      ticket_number: session.ticket_number,
      current_status: session.ticket_status,
      status_histories: statusHistories || [],
      public_updates: publicUpdates || [],
      public_diagnoses: publicDiagnoses || [],
      public_photos: photosWithUrls || [],
    });
  } catch (err: any) {
    console.error("Error in GET /api/customer-timeline:", err);
    return error("Terjadi kesalahan server", 500);
  }
};

export { handler };
