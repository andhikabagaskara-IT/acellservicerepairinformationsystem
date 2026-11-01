import { getSupabaseAdmin } from "./supabaseClient";

interface AuditLogParams {
  actor_type?: "ADMIN" | "TECHNICIAN" | "SYSTEM" | "CUSTOMER";
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata?: Record<string, unknown>;
  details?: Record<string, unknown>;
}

/**
 * Inserts a record into the `audit_logs` table.
 * Fire-and-forget — does not throw on failure.
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("audit_logs").insert({
      actor_type: params.actor_type || "TECHNICIAN",
      actor_id: params.actor_id,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      metadata: params.metadata || params.details || null,
    });
  } catch (err) {
    // Audit logging should never break the main flow
    console.error("[AuditLogger] Failed to write audit log:", err);
  }
}
