import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type EventType = "exam" | "activity" | "parent_meeting" | "field_trip" | "holiday";

// PUT /api/calendar/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users").select("school_id").eq("id", auth.user.id).single();
  if (!profile?.school_id) return NextResponse.json({ error: "No school" }, { status: 400 });

  const { title, description, event_type, classroom, starts_at, ends_at } = body;

  const { data, error } = await supabase
    .from("calendar_events")
    .update({
      title,
      description: description ?? null,
      event_type: event_type as EventType,
      classroom: classroom ?? null,
      starts_at,
      ends_at: ends_at ?? null,
    })
    .eq("id", id)
    .eq("school_id", profile.school_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data });
}

// DELETE /api/calendar/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users").select("school_id").eq("id", auth.user.id).single();
  if (!profile?.school_id) return NextResponse.json({ error: "No school" }, { status: 400 });

  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id)
    .eq("school_id", profile.school_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
