import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addClubMember, removeClubMember } from "@/lib/queries/clubs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { studentId } = body;

  if (!studentId) {
    return NextResponse.json({ success: false, message: "Missing studentId" }, { status: 400 });
  }

  try {
    const membership = await addClubMember(clubId, studentId);
    return NextResponse.json({ success: true, membership }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");

  if (!studentId) {
    return NextResponse.json({ success: false, message: "Missing studentId query param" }, { status: 400 });
  }

  try {
    await removeClubMember(clubId, studentId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
