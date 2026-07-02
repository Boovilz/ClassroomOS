import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClubWithMembers, updateClub } from "@/lib/queries/clubs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await getClubWithMembers(clubId);
    if (!result) {
      return NextResponse.json({ success: false, message: "Club not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(
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
  const { name, description, isActive } = body;

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (isActive !== undefined) updateData.is_active = isActive;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ success: false, message: "No fields to update" }, { status: 400 });
  }

  try {
    const club = await updateClub(clubId, updateData);
    return NextResponse.json({ success: true, club });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
  }
}
