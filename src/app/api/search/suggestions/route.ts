import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/search/suggestions?q=
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q || q.length < 1) return NextResponse.json({ suggestions: [] });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ suggestions: [] });

  const { data: profile } = await supabase
    .from("users")
    .select("school_id")
    .eq("id", auth.user.id)
    .single();
  if (!profile?.school_id) return NextResponse.json({ suggestions: [] });

  const { data } = await supabase
    .from("students")
    .select("id, full_name, student_code, grade, classroom")
    .eq("school_id", profile.school_id)
    .eq("is_active", true)
    .is("deleted_at", null)
    .or(`full_name.ilike.%${q}%,student_code.ilike.%${q}%`)
    .limit(6);

  const suggestions = (data ?? []).map((s) => ({
    id: s.id,
    label: s.full_name ?? "",
    sub: `${s.grade ?? ""} ${s.classroom ?? ""}`.trim(),
    href: `/students/${s.id}`,
    type: "student",
  }));

  return NextResponse.json({ suggestions });
}
