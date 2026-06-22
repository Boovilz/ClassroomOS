import { createClient } from "@/lib/supabase/client";

export type AuditAction = "create" | "update" | "delete" | "restore" | "login" | "export" | "print";

/**
 * Fire-and-forget insert into the general `audit_logs` table (see
 * supabase/migrations/20250101000008_tier3_modules.sql /
 * 20250101000023_audit_logs.sql). Intentionally scoped to a handful of
 * high-value call sites (student CRUD, login, finance withdrawal approval)
 * rather than every mutation in the app - this is a client-side helper so it
 * can be called directly from "use client" components without plumbing a
 * server action through every form.
 *
 * Never throws: an audit-log failure must not block the user's real action.
 */
export async function logAudit(params: {
  schoolId: string;
  actorId?: string | null;
  action: AuditAction;
  entityTable: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("audit_logs").insert({
      school_id: params.schoolId,
      actor_id: params.actorId ?? null,
      action: params.action,
      entity_table: params.entityTable,
      entity_id: params.entityId ?? null,
      metadata: params.metadata ?? null,
    });
    if (error) {
      console.error("logAudit insert failed:", error.message);
    }
  } catch (err) {
    console.error("logAudit threw:", err);
  }
}
