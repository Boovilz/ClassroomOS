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

  if (!q) {
    return NextResponse.json({ success: true, students: [] });
  }

  const { data, error } = await supabase
    .from("students")
    .select("id, full_name, student_code, classroom")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .or(`full_name.ilike.%${q}%,student_code.ilike.%${q}%`)
    .order("full_name")
    .limit(20);

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, students: data ?? [] });
}
