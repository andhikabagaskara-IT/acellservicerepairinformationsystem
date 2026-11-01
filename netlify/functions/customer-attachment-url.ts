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

    const attachmentId = event.queryStringParameters?.attachment_id;
    if (!attachmentId) {
      return error("attachment_id query parameter wajib diisi", 400);
    }

    // Verify attachment belongs to this ticket and is PUBLIC
    const { data: attachment, error: dbError } = await supabase
      .from("ticket_attachments")
      .select("id, object_path, original_file_name, mime_type, file_size, storage_bucket")
      .eq("id", attachmentId)
      .eq("ticket_id", session.ticket_id)
      .eq("visibility", "PUBLIC")
      .single();

    if (dbError || !attachment) {
      return error("Lampiran foto tidak ditemukan atau tidak dapat diakses", 404);
    }

    // Generate signed download URL (valid for 15 minutes = 900 seconds)
    const { data: signedData, error: signedError } = await supabase.storage
      .from(attachment.storage_bucket)
      .createSignedUrl(attachment.object_path, 900);

    if (signedError || !signedData) {
      console.error("Error creating signed download URL:", signedError);
      return error("Gagal menghasilkan tautan akses foto", 500);
    }

    return success({
      attachment_id: attachment.id,
      download_url: signedData.signedUrl,
      file_name: attachment.original_file_name,
      mime_type: attachment.mime_type,
      file_size: attachment.file_size,
    });
  } catch (err: any) {
    console.error("Error in GET /api/customer-attachment-url:", err);
    return error("Terjadi kesalahan server", 500);
  }
};

export { handler };
