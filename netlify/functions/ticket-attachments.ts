import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { randomUUID } from "crypto";
import { authenticateStaff } from "./_shared/authMiddleware";
import { success, error, methodNotAllowed } from "./_shared/responseHelper";
import { getSupabaseAdmin } from "./_shared/supabaseClient";
import { logAudit } from "./_shared/auditLogger";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB

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

    // GET /api/ticket-attachments?ticket_id=UUID
    if (httpMethod === "GET") {
      const ticketId = event.queryStringParameters?.ticket_id;
      if (!ticketId) {
        return error("ticket_id query parameter wajib diisi", 400);
      }

      const { data, error: dbError } = await supabase
        .from("ticket_attachments")
        .select("*, uploader:profiles!uploader_id(id, full_name)")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });

      if (dbError) {
        console.error("Error fetching attachments:", dbError);
        return error("Gagal mengambil daftar lampiran foto", 500);
      }

      // Generate signed download URLs for each attachment (valid for 30 minutes)
      const withSignedUrls = await Promise.all(
        (data || []).map(async (att) => {
          const { data: signedData } = await supabase.storage
            .from(att.storage_bucket)
            .createSignedUrl(att.object_path, 1800);

          return {
            ...att,
            download_url: signedData?.signedUrl || null,
          };
        })
      );

      return success(withSignedUrls);
    }

    // POST /api/ticket-attachments — Request signed upload URL
    if (httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const ticketId = body.ticket_id || event.queryStringParameters?.ticket_id;
      const fileName = body.file_name?.trim();
      const mimeType = body.mime_type?.toLowerCase().trim();
      const fileSize = Number(body.file_size);
      const visibility = body.visibility === "PUBLIC" ? "PUBLIC" : "INTERNAL";

      if (!ticketId) {
        return error("ticket_id wajib diisi", 400);
      }

      if (!fileName || !mimeType || !fileSize) {
        return error("file_name, mime_type, dan file_size wajib diisi", 400);
      }

      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return error(
          `Format file tidak didukung (${mimeType}). Hanya gambar JPEG, PNG, dan WebP yang diizinkan`,
          400
        );
      }

      if (fileSize > MAX_FILE_SIZE) {
        return error("Ukuran file melebihi batas maksimal 3 MB", 400);
      }

      // Verify ticket exists
      const { data: ticket, error: ticketError } = await supabase
        .from("repair_tickets")
        .select("id, ticket_number")
        .eq("id", ticketId)
        .single();

      if (ticketError || !ticket) {
        return error("Tiket servis tidak ditemukan", 404);
      }

      // Generate sanitized object path
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const objectPath = `tickets/${ticketId}/${randomUUID()}_${sanitizedName}`;
      const bucketName = "repair-attachments";

      // Request signed upload URL from Supabase Storage
      const { data: uploadData, error: storageError } = await supabase.storage
        .from(bucketName)
        .createSignedUploadUrl(objectPath);

      if (storageError || !uploadData) {
        console.error("Error creating signed upload URL:", storageError);
        return error("Gagal menyiapkan URL unggah penyimpanan", 500);
      }

      // Insert metadata record in ticket_attachments
      const { data: attachmentRecord, error: insertError } = await supabase
        .from("ticket_attachments")
        .insert({
          ticket_id: ticketId,
          uploader_id: user.id,
          storage_bucket: bucketName,
          object_path: objectPath,
          original_file_name: fileName,
          mime_type: mimeType,
          file_size: fileSize,
          visibility: visibility,
        })
        .select()
        .single();

      if (insertError || !attachmentRecord) {
        console.error("Error creating attachment record:", insertError);
        return error("Gagal mencatat metadata lampiran", 500);
      }

      await logAudit({
        actor_type: user.role,
        actor_id: user.id,
        action: "REQUEST_ATTACHMENT_UPLOAD",
        entity_type: "ticket_attachments",
        entity_id: attachmentRecord.id,
        metadata: {
          ticket_id: ticketId,
          ticket_number: ticket.ticket_number,
          object_path: objectPath,
          visibility: visibility,
        },
      });

      return success(
        {
          attachment_id: attachmentRecord.id,
          upload_url: uploadData.signedUrl,
          object_path: objectPath,
          token: uploadData.token,
        },
        201
      );
    }
  } catch (err: any) {
    console.error("Error in /api/ticket-attachments:", err);
    return error("Terjadi kesalahan server", 500);
  }

  return error("Terjadi kesalahan server", 500);
};

export { handler };
