import { createClient } from "@/lib/supabase/server"

export type EqLevel = "low" | "moderate" | "high" | "excellent"

export interface EqAssessment {
  id: string
  student_id: string
  assessed_at: string
  self_awareness: number | null
  self_regulation: number | null
  motivation: number | null
  empathy: number | null
  social_skills: number | null
  total_score: number | null
  eq_level: EqLevel | null
  notes: string | null
  assessed_by: string | null
}

/**
 * Compute EQ level from a total score (sum of five 1–5 subscales, range 5–25).
 * 5–10 = low, 11–15 = moderate, 16–20 = high, 21–25 = excellent
 */
export function computeEqLevel(total: number): EqLevel {
  if (total <= 10) return "low"
  if (total <= 15) return "moderate"
  if (total <= 20) return "high"
  return "excellent"
}

/** Get all EQ assessments for a student, newest first. */
export async function getStudentEqAssessments(studentId: string): Promise<EqAssessment[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("eq_assessments")
    .select("*")
    .eq("student_id", studentId)
    .order("assessed_at", { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as EqAssessment[]
}

/** Get the most recent EQ assessment for a student, or null if none exists. */
export async function getLatestEqAssessment(studentId: string): Promise<EqAssessment | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("eq_assessments")
    .select("*")
    .eq("student_id", studentId)
    .order("assessed_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data ?? null) as EqAssessment | null
}

/** Insert a new EQ assessment record and return the created row. */
export async function saveEqAssessment(data: {
  studentId: string
  schoolId: string
  selfAwareness: number
  selfRegulation: number
  motivation: number
  empathy: number
  socialSkills: number
  notes?: string
}): Promise<EqAssessment> {
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  const assessedBy = auth?.user?.id ?? null

  const total =
    data.selfAwareness +
    data.selfRegulation +
    data.motivation +
    data.empathy +
    data.socialSkills

  const eqLevel = computeEqLevel(total)

  const { data: inserted, error } = await (supabase as any)
    .from("eq_assessments")
    .insert({
      student_id: data.studentId,
      school_id: data.schoolId,
      self_awareness: data.selfAwareness,
      self_regulation: data.selfRegulation,
      motivation: data.motivation,
      empathy: data.empathy,
      social_skills: data.socialSkills,
      total_score: total,
      eq_level: eqLevel,
      notes: data.notes ?? null,
      assessed_by: assessedBy,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return inserted as EqAssessment
}
