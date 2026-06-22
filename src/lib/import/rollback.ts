import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { logAudit } from "@/lib/audit";

type TypedClient = SupabaseClient<Database>;

export interface RollbackResult {
  ok: boolean;
  restoredCount: number;
  softDeletedCount: number;
  message?: string;
}

/**
 * Rolls back a completed import job: soft-deletes every student row this
 * job `created` (reusing the existing deleted_at soft-delete mechanism —
 * never a hard delete), and restores the pre-import column values for
 * every `updated`/`merged` row from its `previous_values` snapshot. Marks
 * the job `rolled_back` and writes an audit_logs entry.
 */
export async function rollbackImportJob(
  supabase: TypedClient,
  importJobId: string,
  actorId: string | null
): Promise<RollbackResult> {
  const { data: job, error: jobError } = await supabase.from("import_jobs").select("*").eq("id", importJobId).single();
  if (jobError || !job) {
    return { ok: false, restoredCount: 0, softDeletedCount: 0, message: "ไม่พบงานนำเข้านี้" };
  }
  if (job.status === "rolled_back") {
    return { ok: false, restoredCount: 0, softDeletedCount: 0, message: "งานนำเข้านี้ถูกยกเลิกไปแล้ว" };
  }

  const { data: rows, error: rowsError } = await supabase
    .from("import_job_rows")
    .select("*")
    .eq("import_job_id", importJobId);
  if (rowsError || !rows) {
    return { ok: false, restoredCount: 0, softDeletedCount: 0, message: "ไม่สามารถโหลดรายละเอียดงานนำเข้าได้" };
  }

  let softDeletedCount = 0;
  let restoredCount = 0;

  for (const row of rows) {
    if (row.action === "created" && row.student_id) {
      const { error } = await supabase
        .from("students")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", row.student_id);
      if (!error) softDeletedCount++;
    } else if ((row.action === "updated" || row.action === "merged") && row.student_id && row.previous_values) {
      const { error } = await supabase
        .from("students")
        .update(row.previous_values as Database["public"]["Tables"]["students"]["Update"])
        .eq("id", row.student_id);
      if (!error) restoredCount++;
    }
  }

  await supabase.from("import_jobs").update({ status: "rolled_back" }).eq("id", importJobId);

  void logAudit({
    schoolId: job.school_id,
    actorId,
    action: "delete",
    entityTable: "import_jobs",
    entityId: importJobId,
    metadata: { rollback: true, softDeletedCount, restoredCount, source: job.source, file_name: job.file_name },
  });

  return { ok: true, restoredCount, softDeletedCount };
}
