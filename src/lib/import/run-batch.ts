import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { DuplicateStrategy, ImportRow, ImportSource } from "./types";
import { findDuplicate } from "./duplicate-detection";
import { validateRow, buildSeenCodesMap } from "./validation";
import { commitRow } from "./commit";

type TypedClient = SupabaseClient<Database>;

export interface RunBatchOptions {
  supabase: TypedClient;
  schoolId: string;
  importedBy: string | null;
  source: ImportSource;
  fileName: string | null;
  rows: ImportRow[];
  /** Default strategy for the whole batch; rows can't be individually overridden via this entrypoint (the API/QR paths apply one strategy uniformly — the wizard UI applies per-row overrides before calling commitRow directly). */
  defaultStrategy: DuplicateStrategy;
  /** Rows whose validation produced at least one error are always skipped (recorded as `failed`), regardless of strategy. */
  knownClassrooms?: Set<string>;
}

export interface RunBatchResult {
  importJobId: string;
  totalRows: number;
  succeededCount: number;
  updatedCount: number;
  failedCount: number;
  status: "completed" | "completed_with_errors";
  rows: Array<{ rowNumber: number; action: string; studentId: string | null; errorMessage: string | null }>;
}

/**
 * End-to-end: creates the import_jobs row, runs every row through
 * validation -> duplicate-detection -> commit, writes one import_job_rows
 * record per row, and finalizes the job's counts/status. Used by the
 * generic API import route and the QR single-row import route — the full
 * wizard UI instead does validation/duplicate-detection up front for
 * on-screen review, then calls commitRow per row with the user's chosen
 * per-row strategy (see the wizard's commit step).
 */
export async function runImportBatch(opts: RunBatchOptions): Promise<RunBatchResult> {
  const { supabase, schoolId, importedBy, source, fileName, rows, defaultStrategy } = opts;
  const knownClassrooms = opts.knownClassrooms ?? new Set<string>();
  const seenCodesInBatch = buildSeenCodesMap(rows);

  const { data: job, error: jobError } = await supabase
    .from("import_jobs")
    .insert({
      school_id: schoolId,
      source,
      file_name: fileName,
      imported_by: importedBy,
      total_rows: rows.length,
      status: "processing",
    })
    .select("id")
    .single();

  if (jobError || !job) {
    throw new Error(jobError?.message ?? "failed to create import_jobs row");
  }

  let succeededCount = 0;
  let updatedCount = 0;
  let failedCount = 0;
  const rowResults: RunBatchResult["rows"] = [];

  for (const row of rows) {
    const validation = validateRow(row, { knownClassrooms, seenCodesInBatch });

    if (validation.errors.length > 0) {
      failedCount++;
      await supabase.from("import_job_rows").insert({
        import_job_id: job.id,
        row_number: row.rowNumber,
        student_id: null,
        action: "failed",
        error_message: validation.errors.map((e) => e.message).join("; "),
      });
      rowResults.push({ rowNumber: row.rowNumber, action: "failed", studentId: null, errorMessage: validation.errors[0].message });
      continue;
    }

    const duplicate = await findDuplicate(supabase, schoolId, row);
    const result = await commitRow({ supabase, schoolId, importedBy }, row, duplicate, defaultStrategy);

    if (result.action === "created") succeededCount++;
    else if (result.action === "updated" || result.action === "merged") updatedCount++;
    else if (result.action === "failed") failedCount++;

    await supabase.from("import_job_rows").insert({
      import_job_id: job.id,
      row_number: row.rowNumber,
      student_id: result.studentId,
      action: result.action,
      previous_values: result.previousValues,
      error_message: result.errorMessage,
    });

    rowResults.push({ rowNumber: row.rowNumber, action: result.action, studentId: result.studentId, errorMessage: result.errorMessage });
  }

  const status: RunBatchResult["status"] = failedCount > 0 ? "completed_with_errors" : "completed";

  await supabase
    .from("import_jobs")
    .update({ succeeded_count: succeededCount, updated_count: updatedCount, failed_count: failedCount, status })
    .eq("id", job.id);

  return { importJobId: job.id, totalRows: rows.length, succeededCount, updatedCount, failedCount, status, rows: rowResults };
}
