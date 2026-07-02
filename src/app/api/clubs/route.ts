import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listClubs, createClub } from "@/lib/queries/clubs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get("schoolId");

  if (!schoolId) {
    return NextResponse.json({ success: false, message: "Missing schoolId" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const clubs = await listClubs(schoolId);
    return NextResponse.json({ success: true, clubs });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { schoolId, name, description, teacherId, maxMembers, academicYear, semester } = body;

  if (!schoolId || !name) {
    return NextResponse.json({ success: false, message: "Missing required fields: schoolId, name" }, { status: 400 });
  }

  try {
    const club = await createClub({ schoolId, name, description, teacherId, maxMembers, academicYear, semester });
    return NextResponse.json({ success: true, club }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
