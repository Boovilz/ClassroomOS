import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/admin/guard"
import { getStudentEqAssessments, saveEqAssessment } from "@/lib/queries/eq"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get("studentId")

  if (!studentId) {
    return NextResponse.json({ error: "Missing required query param: studentId" }, { status: 400 })
  }

  try {
    const assessments = await getStudentEqAssessments(studentId)
    return NextResponse.json({ assessments })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireRole(["school_admin", "teacher"])
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { studentId, schoolId, selfAwareness, selfRegulation, motivation, empathy, socialSkills, notes } = body as {
    studentId?: string
    schoolId?: string
    selfAwareness?: number
    selfRegulation?: number
    motivation?: number
    empathy?: number
    socialSkills?: number
    notes?: string
  }

  if (!studentId || !schoolId || selfAwareness == null || selfRegulation == null || motivation == null || empathy == null || socialSkills == null) {
    return NextResponse.json(
      { error: "Missing required fields: studentId, schoolId, selfAwareness, selfRegulation, motivation, empathy, socialSkills" },
      { status: 400 }
    )
  }

  try {
    const assessment = await saveEqAssessment({
      studentId,
      schoolId,
      selfAwareness,
      selfRegulation,
      motivation,
      empathy,
      socialSkills,
      notes,
    })
    return NextResponse.json({ success: true, assessment })
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 })
  }
}
