import { createClient } from "@/lib/supabase/server";

export interface SupervisionRecord {
  id: string;
  school_id: string;
  supervisor_id: string;
  teacher_id: string | null;
  teacher_name: string | null;
  supervised_at: string;
  subject: string | null;
  classroom: string | null;
  topic: string | null;
  student_count: number | null;
  lesson_plan_score: number | null;
  teaching_method_score: number | null;
  media_score: number | null;
  assessment_score: number | null;
  classroom_management_score: number | null;
  total_score: number | null;
  strengths: string | null;
  improvements: string | null;
  suggestions: string | null;
  follow_up_date: string | null;
  status: string;
  created_at: string;
}

export interface SupervisionWithNames extends SupervisionRecord {
  supervisor_name?: string;
}

export async function listSupervisionRecords(
  schoolId: string,
  limit?: number
): Promise<SupervisionWithNames[]> {
  const supabase = await createClient();
  let query = (supabase as any)
    .from("supervision_records")
    .select(
      `*, teacher:teacher_id(full_name), supervisor:supervisor_id(full_name)`
    )
    .eq("school_id", schoolId)
    .order("supervised_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => {
    const teacher = row.teacher as { full_name?: string } | null;
    const supervisor = row.supervisor as { full_name?: string } | null;
    const { teacher: _t, supervisor: _s, ...rest } = row;
    return {
      ...(rest as unknown as SupervisionRecord),
      teacher_name: teacher?.full_name ?? null,
      supervisor_name: supervisor?.full_name,
    };
  });
}

export async function getSupervisionRecord(
  id: string
): Promise<SupervisionWithNames | null> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("supervision_records")
    .select(
      `*, teacher:teacher_id(full_name), supervisor:supervisor_id(full_name)`
    )
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  if (!data) return null;

  const teacher = data.teacher as { full_name?: string } | null;
  const supervisor = data.supervisor as { full_name?: string } | null;
  const { teacher: _t, supervisor: _s, ...rest } = data;
  return {
    ...(rest as SupervisionRecord),
    teacher_name: teacher?.full_name ?? null,
    supervisor_name: supervisor?.full_name,
  };
}

export async function createSupervisionRecord(
  data: Omit<SupervisionRecord, "id" | "created_at" | "total_score">
): Promise<SupervisionRecord> {
  const supabase = await createClient();

  // Strip teacher_id if it's not a valid UUID (form may send free-text name instead)
  const insert: Record<string, unknown> = { ...data };
  if (insert.teacher_id && typeof insert.teacher_id === "string" && insert.teacher_id.length < 30) {
    // looks like a name, not a UUID — move to teacher_name
    insert.teacher_name = insert.teacher_name ?? insert.teacher_id;
    delete insert.teacher_id;
  }

  const { data: created, error } = await (supabase as any)
    .from("supervision_records")
    .insert(insert)
    .select()
    .single();

  if (error) throw error;
  return created as SupervisionRecord;
}

export async function updateSupervisionRecord(
  id: string,
  data: Partial<SupervisionRecord>
): Promise<SupervisionRecord> {
  const supabase = await createClient();

  const patch: Partial<SupervisionRecord> = { ...data };

  // Recalculate total_score if any component score is provided
  const scoreFields = [
    "lesson_plan_score",
    "teaching_method_score",
    "media_score",
    "assessment_score",
    "classroom_management_score",
  ] as const;
  const hasScoreUpdate = scoreFields.some((f) => f in data);
  if (hasScoreUpdate) {
    // Fetch current record to fill missing scores
    const current = await getSupervisionRecord(id);
    if (current) {
      const merged = { ...current, ...data };
      patch.total_score =
        (merged.lesson_plan_score ?? 0) +
        (merged.teaching_method_score ?? 0) +
        (merged.media_score ?? 0) +
        (merged.assessment_score ?? 0) +
        (merged.classroom_management_score ?? 0);
    }
  }

  const { data: updated, error } = await (supabase as any)
    .from("supervision_records")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return updated as SupervisionRecord;
}
