import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { logAudit } from "@/lib/audit";
import type { CommitRowResult, DuplicateMatch, DuplicateStrategy, ImportRow } from "./types";

type TypedClient = SupabaseClient<Database>;

function generateAccountNumber(): string {
  return `SV${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
}

function orNumber(value?: string): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Field map applied for "update"/"merge" duplicate strategies. Only columns
 * that are meaningful to overwrite from an import row — never id/school_id/
 * created_at/etc.
 */
function buildStudentFields(row: ImportRow): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  if (row.full_name) fields.full_name = row.full_name;
  if (row.nickname) fields.nickname = row.nickname;
  if (row.gender) fields.gender = row.gender;
  if (row.birth_date) fields.birth_date = row.birth_date;
  if (row.citizen_id) fields.citizen_id = row.citizen_id;
  if (row.phone_number) fields.phone_number = row.phone_number;
  if (row.grade) fields.grade = row.grade;
  if (row.classroom) fields.classroom = row.classroom;
  if (row.risk_level) fields.risk_level = row.risk_level;
  return fields;
}

/**
 * Creates the real per-student rows for a freshly-created student: a
 * `parents` row (only if parent data is present), a Module 6 savings
 * `finance_accounts` row (reusing the same shape as
 * getOrCreateSavingsAccount in src/lib/queries/finance.ts), and a
 * `health_records` row (only if health columns are present). Never creates
 * blank placeholder rows in attendance/behavior/sdq/lunch/ai tables.
 */
async function createDependentRows(supabase: TypedClient, schoolId: string, studentId: string, row: ImportRow) {
  if (row.parent_full_name) {
    await supabase.from("parents").insert({
      school_id: schoolId,
      student_id: studentId,
      full_name: row.parent_full_name,
      relationship: row.parent_relationship ?? null,
      phone: row.parent_phone ?? null,
      line_id: row.parent_line_id ?? null,
    });
  }

  // Module 6 savings account — same shape as getOrCreateSavingsAccount.
  await supabase.from("finance_accounts").insert({
    school_id: schoolId,
    student_id: studentId,
    name: `บัญชีออมทรัพย์ - ${row.full_name}`,
    account_type: "savings",
    account_number: generateAccountNumber(),
    classroom: "savings",
  });

  if (row.height_cm || row.weight_kg || row.allergies || row.chronic_conditions) {
    await supabase.from("health_records").insert({
      school_id: schoolId,
      student_id: studentId,
      height_cm: orNumber(row.height_cm),
      weight_kg: orNumber(row.weight_kg),
      allergies: row.allergies || null,
      chronic_conditions: row.chronic_conditions || null,
    });
  }
}

export interface CommitContext {
  supabase: TypedClient;
  schoolId: string;
  importedBy: string | null;
}

/**
 * Commits one already-validated, duplicate-resolved row according to its
 * chosen strategy. Returns a CommitRowResult ready to be persisted as an
 * `import_job_rows` row by the caller.
 */
export async function commitRow(
  ctx: CommitContext,
  row: ImportRow,
  duplicate: DuplicateMatch | null,
  strategy: DuplicateStrategy
): Promise<CommitRowResult> {
  const { supabase, schoolId } = ctx;

  try {
    if (duplicate && strategy === "skip") {
      return { rowNumber: row.rowNumber, studentId: duplicate.studentId, action: "skipped", previousValues: null, errorMessage: null };
    }

    if (duplicate && (strategy === "update" || strategy === "merge")) {
      const newFields = buildStudentFields(row);
      const existing = duplicate.existing;
      const previousValues: Record<string, unknown> = {};
      const fieldsToApply: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(newFields)) {
        const existingValue = existing[key];
        if (strategy === "merge") {
          // Merge: only fill in fields currently null on the existing row.
          if (existingValue === null || existingValue === undefined || existingValue === "") {
            fieldsToApply[key] = value;
            previousValues[key] = existingValue ?? null;
          }
        } else {
          // Update: overwrite with the import row's non-empty fields.
          fieldsToApply[key] = value;
          previousValues[key] = existingValue ?? null;
        }
      }

      if (Object.keys(fieldsToApply).length > 0) {
        const { error } = await supabase
          .from("students")
          .update(fieldsToApply as Database["public"]["Tables"]["students"]["Update"])
          .eq("id", duplicate.studentId);
        if (error) {
          return { rowNumber: row.rowNumber, studentId: duplicate.studentId, action: "failed", previousValues: null, errorMessage: error.message };
        }
      }

      return {
        rowNumber: row.rowNumber,
        studentId: duplicate.studentId,
        action: strategy === "merge" ? "merged" : "updated",
        previousValues,
        errorMessage: null,
      };
    }

    // create_new strategy, or no duplicate found at all -> insert a new student row.
    const { data: created, error } = await supabase
      .from("students")
      .insert({
        school_id: schoolId,
        student_code: row.student_code,
        full_name: row.full_name,
        nickname: row.nickname || null,
        gender: row.gender ?? null,
        birth_date: row.birth_date || null,
        citizen_id: row.citizen_id || null,
        phone_number: row.phone_number || null,
        grade: row.grade || null,
        classroom: row.classroom || null,
        risk_level: row.risk_level ?? null,
      })
      .select("id")
      .single();

    if (error || !created) {
      return { rowNumber: row.rowNumber, studentId: null, action: "failed", previousValues: null, errorMessage: error?.message ?? "insert failed" };
    }

    await createDependentRows(supabase, schoolId, created.id, row);

    void logAudit({
      schoolId,
      actorId: ctx.importedBy,
      action: "create",
      entityTable: "students",
      entityId: created.id,
      metadata: { student_code: row.student_code, full_name: row.full_name, bulk_import: true },
    });

    return { rowNumber: row.rowNumber, studentId: created.id, action: "created", previousValues: null, errorMessage: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดที่ไม่คาดคิด";
    return { rowNumber: row.rowNumber, studentId: null, action: "failed", previousValues: null, errorMessage: message };
  }
}
