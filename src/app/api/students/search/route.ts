import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const schoolId = searchParams.get("schoolId");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  if (!schoolId) {
    return NextResponse.json({ success: false, message: "Missing schoolId" }, { status: 400 });
  }

  const limit = parseInt(searchParams.get("limit") ?? "20", 10);

  let query = supabase
    .from("students")
    .select(
      "id, full_name, student_code, grade, classroom, gender, blood_type, birth_date, citizen_id, profile_picture_url"
    )
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("full_name")
    .limit(limit);

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,student_code.ilike.%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, students: data ?? [] });
}
