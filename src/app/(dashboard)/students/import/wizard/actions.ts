"use server";

import { createClient } from "@/lib/supabase/server";
import { commitRow } from "@/lib/import/commit";
import { findDuplicate } from "@/lib/import/duplicate-detection";
import type { DuplicateStrategy, ImportRow, ImportSource } from "@/lib/import/types";

/**
 * Server action backing step 4 ("confirm and commit") of the import wizard.
 * Re-resolves each row's duplicate match server-side (the client only used
 * it for display) and commits using the per-row strategy the user chose in
 * the review table, writing one `import_job_rows` record per row. Runs
 * under the user's own RLS-scoped session (no service-role bypass).
 */
export async function commitImportBatch(params: {
  source: ImportSource;
  fileName: string | null;
  rows: { row: ImportRow; strategy: DuplicateStrategy }[];
}) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return { ok: false as const, message: "ไม่ได้เข้าสู่ระบบ" };
  }

  const { data: profile } = await supabase.from("users").select("school_id").eq("id", auth.user.id).single();
  if (!profile?.school_id) {
    return { ok: false as const, message: "ไม่พบโรงเรียนของผู้ใช้นี้" };
  }
  const schoolId = profile.school_id;

  const { data: job, error: jobError } = await supabase
    .from("import_jobs")
    .insert({
      school_id: schoolId,
      source: params.source,
      file_name: params.fileName,
      imported_by: auth.user.id,
      total_rows: params.rows.length,
      status: "processing",
    })
    .select("id")
    .single();

  if (jobError || !job) {
    return { ok: false as const, message: jobError?.message ?? "ไม่สามารถสร้างงานนำเข้าได้" };
  }

  let succeededCount = 0;
  let updatedCount = 0;
  let failedCount = 0;
  const results: { rowNumber: number; action: string; errorMessage: string | null }[] = [];

  for (const { row, strategy } of params.rows) {
    const duplicate = await findDuplicate(supabase, schoolId, row);
    const result = await commitRow({ supabase, schoolId, importedBy: auth.user.id }, row, duplicate, strategy);

    if (result.action === "created") succeededCount++;
    else if (result.action === "updated" || result.action === "merged") updatedCount++;
    else if (result.action === "failed") failedCount++;

    await supabase.from("import_job_rows").insert({
      import_job_id: job.id,
      row_number: result.rowNumber,
      student_id: result.studentId,
      action: result.action,
      previous_values: result.previousValues,
      error_message: result.errorMessage,
    });

    results.push({ rowNumber: result.rowNumber, action: result.action, errorMessage: result.errorMessage });
  }

  const status = failedCount > 0 ? "completed_with_errors" : "completed";
  await supabase
    .from("import_jobs")
    .update({ succeeded_count: succeededCount, updated_count: updatedCount, failed_count: failedCount, status })
    .eq("id", job.id);

  return { ok: true as const, importJobId: job.id, succeededCount, updatedCount, failedCount, status, results };
}

/** Step 3 helper: finds duplicate matches for a batch of already-parsed rows, for on-screen review. */
export async function findDuplicatesForReview(rows: ImportRow[]) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return {};
  const { data: profile } = await supabase.from("users").select("school_id").eq("id", auth.user.id).single();
  if (!profile?.school_id) return {};

  const result: Record<number, ReturnType<typeof findDuplicate> extends Promise<infer R> ? R : never> = {};
  for (const row of rows) {
    result[row.rowNumber] = await findDuplicate(supabase, profile.school_id, row);
  }
  return result;
}

/** Returns the distinct classroom values already used in the school, for the "unknown classroom" warning. */
export async function getKnownClassrooms(): Promise<string[]> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return [];
  const { data: profile } = await supabase.from("users").select("school_id").eq("id", auth.user.id).single();
  if (!profile?.school_id) return [];

  const { data } = await supabase
    .from("students")
    .select("classroom")
    .eq("school_id", profile.school_id)
    .is("deleted_at", null)
    .not("classroom", "is", null);

  return Array.from(new Set((data ?? []).map((r) => r.classroom).filter((c): c is string => !!c)));
}
