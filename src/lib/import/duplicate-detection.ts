import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { DuplicateMatch, ImportRow } from "./types";

type TypedClient = SupabaseClient<Database>;

/**
 * For one incoming row, looks up an existing (non-deleted) student by, in
 * priority order: exact student_code, exact citizen_id, exact phone_number,
 * then full_name + birth_date combined. Returns the first match found, or
 * null if the row looks like a genuinely new student.
 */
export async function findDuplicate(supabase: TypedClient, schoolId: string, row: ImportRow): Promise<DuplicateMatch | null> {
  if (row.student_code) {
    const { data } = await supabase
      .from("students")
      .select("*")
      .eq("school_id", schoolId)
      .eq("student_code", row.student_code)
      .is("deleted_at", null)
      .maybeSingle();
    if (data) return { studentId: data.id, matchedOn: "student_code", existing: data };
  }

  if (row.citizen_id) {
    const { data } = await supabase
      .from("students")
      .select("*")
      .eq("school_id", schoolId)
      .eq("citizen_id", row.citizen_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (data) return { studentId: data.id, matchedOn: "citizen_id", existing: data };
  }

  if (row.phone_number) {
    const { data } = await supabase
      .from("students")
      .select("*")
      .eq("school_id", schoolId)
      .eq("phone_number", row.phone_number)
      .is("deleted_at", null)
      .maybeSingle();
    if (data) return { studentId: data.id, matchedOn: "phone_number", existing: data };
  }

  if (row.full_name && row.birth_date) {
    const { data } = await supabase
      .from("students")
      .select("*")
      .eq("school_id", schoolId)
      .eq("full_name", row.full_name)
      .eq("birth_date", row.birth_date)
      .is("deleted_at", null)
      .maybeSingle();
    if (data) return { studentId: data.id, matchedOn: "full_name_birth_date", existing: data };
  }

  return null;
}

/** Runs findDuplicate for an entire batch of rows. */
export async function findDuplicatesForBatch(
  supabase: TypedClient,
  schoolId: string,
  rows: ImportRow[]
): Promise<Map<number, DuplicateMatch | null>> {
  const result = new Map<number, DuplicateMatch | null>();
  for (const row of rows) {
    result.set(row.rowNumber, await findDuplicate(supabase, schoolId, row));
  }
  return result;
}
