import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runImportBatch } from "@/lib/import/run-batch";
import type { DuplicateStrategy, ImportRow } from "@/lib/import/types";

/**
 * Generic REST import endpoint: POST a JSON array of student rows (already
 * in the shared ImportRow shape, or close to it — missing fields are
 * treated as absent) and they run through the same validation/duplicate-
 * detection/creation pipeline as the Excel/CSV/Google Sheets importers.
 * This is genuinely real (it's our own API), not a simulated connector.
 *
 * Body: { rows: Partial<ImportRow>[], strategy?: DuplicateStrategy, defaults?: { grade?: string; classroom?: string } }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("users").select("school_id").eq("id", auth.user.id).single();
  if (!profile?.school_id) {
    return NextResponse.json({ error: "No school associated with this user" }, { status: 400 });
  }

  let body: { rows?: Partial<ImportRow>[]; strategy?: DuplicateStrategy; defaults?: { grade?: string; classroom?: string } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: "Body must include a non-empty `rows` array" }, { status: 400 });
  }

  const rows: ImportRow[] = body.rows.map((r, idx) => ({
    rowNumber: idx + 1,
    student_code: r.student_code ?? "",
    full_name: r.full_name ?? "",
    nickname: r.nickname,
    gender: r.gender,
    birth_date: r.birth_date,
    citizen_id: r.citizen_id,
    phone_number: r.phone_number,
    grade: r.grade ?? body.defaults?.grade,
    classroom: r.classroom ?? body.defaults?.classroom,
    risk_level: r.risk_level,
    parent_full_name: r.parent_full_name,
    parent_relationship: r.parent_relationship,
    parent_phone: r.parent_phone,
    parent_line_id: r.parent_line_id,
    height_cm: r.height_cm,
    weight_kg: r.weight_kg,
    allergies: r.allergies,
    chronic_conditions: r.chronic_conditions,
    raw: (r.raw as Record<string, string>) ?? {},
  }));

  try {
    const result = await runImportBatch({
      supabase,
      schoolId: profile.school_id,
      importedBy: auth.user.id,
      source: "api",
      fileName: null,
      rows,
      defaultStrategy: body.strategy ?? "skip",
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
